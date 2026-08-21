import { and, asc, desc, eq, inArray, lte, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import type { ConsentKey } from '../crm/consent.ts';
import { subscribers } from '../crm/schema.ts';
import type { EmailSender } from '../email/service.ts';
import { quizResults, quizzes } from '../quiz/schema.ts';
import { RESULT_URL_TOKEN, type SequenceTrigger } from './definition.ts';
import {
	NURTURE_MAX_ATTEMPTS,
	NURTURE_SEND_BATCH,
	NURTURE_STALE_CLAIM_MINUTES,
	retryDelayMs
} from './schedule.ts';
import { nurtureEnrollments, nurtureSends, nurtureSequences } from './schema.ts';
import { cancelEnrollment, isMailable } from './service.ts';

/**
 * The queue drain behind /api/cron/nurture-send. Claim-then-send:
 *
 * 1. One transaction claims a bounded batch of due sends with
 *    `FOR UPDATE SKIP LOCKED` and flips them to `sending` — two concurrent
 *    cron invocations therefore claim DISJOINT sets; a double-send is
 *    structurally impossible. The `email_log` unique idempotency key
 *    (`nurture:<enrollmentId>:<stepIndex>`) is the independent second layer.
 * 2. Each claimed send re-checks the consent gate (defense in depth — a
 *    withdrawal between scheduling and sending cancels here), renders the
 *    step and sends through modules/email. Failures retry with exponential
 *    backoff and park as `failed` after NURTURE_MAX_ATTEMPTS.
 *
 * Crashed invocations leave `sending` rows; the claim re-takes them after
 * NURTURE_STALE_CLAIM_MINUTES, and the email idempotency key turns an
 * already-delivered retry into a no-op (`skipped` → recorded as sent).
 */

export interface NurtureDrainDeps {
	db: Db;
	email: EmailSender;
	siteName: string;
	/** Public origin for unsubscribe/CTA links, e.g. https://bettersleep.ro */
	baseUrl: string;
}

/**
 * The result behind a RESULT_URL_TOKEN cta, resolved at send time: the exact
 * result stored ON the enrollment when it exists and still belongs to the
 * subscriber (review M-1 — a retake between enrollment and send must not
 * redirect the email to a different result). Fallback for pre-BS-8
 * enrollments or an erased originating result: the subscriber's latest
 * linked result for the trigger quiz. Null when the trigger is not
 * quiz-completed or nothing is linked: the cta is then dropped and the email
 * still goes out.
 */
async function resolveResultUrl(
	db: Db,
	enrollment: { resultId: string | null; subscriberId: string },
	trigger: SequenceTrigger,
	baseUrl: string
): Promise<string | null> {
	if (trigger.kind !== 'quiz-completed') return null;
	if (enrollment.resultId) {
		const [origin] = await db
			.select({ id: quizResults.id })
			.from(quizResults)
			.where(
				and(
					eq(quizResults.id, enrollment.resultId),
					eq(quizResults.subscriberId, enrollment.subscriberId)
				)
			);
		if (origin) return `${baseUrl}/quiz/${trigger.quizSlug}/rezultat/${origin.id}`;
	}
	const [row] = await db
		.select({ id: quizResults.id })
		.from(quizResults)
		.innerJoin(quizzes, eq(quizResults.quizId, quizzes.id))
		.where(
			and(eq(quizResults.subscriberId, enrollment.subscriberId), eq(quizzes.slug, trigger.quizSlug))
		)
		.orderBy(desc(quizResults.createdAt))
		.limit(1);
	return row ? `${baseUrl}/quiz/${trigger.quizSlug}/rezultat/${row.id}` : null;
}

export interface NurtureDrainResult {
	claimed: number;
	sent: number;
	retried: number;
	parked: number;
	cancelled: number;
	/** Enrollments whose last open send resolved this run. */
	completed: number;
}

export async function drainNurtureSends(
	deps: NurtureDrainDeps,
	opts: { now?: Date; batchSize?: number } = {}
): Promise<NurtureDrainResult> {
	const now = opts.now ?? new Date();
	const batchSize = opts.batchSize ?? NURTURE_SEND_BATCH;
	const staleCutoff = new Date(now.getTime() - NURTURE_STALE_CLAIM_MINUTES * 60 * 1000);
	const result: NurtureDrainResult = {
		claimed: 0,
		sent: 0,
		retried: 0,
		parked: 0,
		cancelled: 0,
		completed: 0
	};

	// Atomic claim. Only sends of ACTIVE sequences and enrollments are
	// eligible: deactivating a sequence in the admin pauses its queue rows in
	// place (reactivation resumes them) — the no-deploy stop switch.
	const claimed = await deps.db.transaction(async (tx) => {
		const due = await tx
			.select({ id: nurtureSends.id })
			.from(nurtureSends)
			.innerJoin(nurtureEnrollments, eq(nurtureSends.enrollmentId, nurtureEnrollments.id))
			.innerJoin(nurtureSequences, eq(nurtureEnrollments.sequenceId, nurtureSequences.id))
			.where(
				and(
					eq(nurtureEnrollments.status, 'active'),
					eq(nurtureSequences.active, true),
					or(
						and(eq(nurtureSends.status, 'pending'), lte(nurtureSends.scheduledAt, now)),
						and(eq(nurtureSends.status, 'sending'), lte(nurtureSends.claimedAt, staleCutoff))
					)
				)
			)
			.orderBy(asc(nurtureSends.scheduledAt))
			.limit(batchSize)
			.for('update', { of: nurtureSends, skipLocked: true });
		if (due.length === 0) return [];
		return tx
			.update(nurtureSends)
			.set({ status: 'sending', claimedAt: now, attempts: sql`${nurtureSends.attempts} + 1` })
			.where(
				inArray(
					nurtureSends.id,
					due.map((row) => row.id)
				)
			)
			.returning();
	});
	result.claimed = claimed.length;

	for (const send of claimed) {
		const [row] = await deps.db
			.select({
				enrollment: nurtureEnrollments,
				sequence: nurtureSequences,
				subscriber: subscribers
			})
			.from(nurtureEnrollments)
			.innerJoin(nurtureSequences, eq(nurtureEnrollments.sequenceId, nurtureSequences.id))
			.innerJoin(subscribers, eq(nurtureEnrollments.subscriberId, subscribers.id))
			.where(eq(nurtureEnrollments.id, send.enrollmentId));
		if (!row) {
			// Enrollment (or subscriber) erased between claim and here — the send
			// row itself is gone too (cascade) or orphaned; nothing to record on.
			result.cancelled += 1;
			continue;
		}

		// Defense in depth: the gate that admitted the enrollment must still
		// hold at SEND time. A withdrawal cancels the whole enrollment here
		// even when `cancelSubscriberNurture` missed this row mid-claim.
		if (!isMailable(row.subscriber, row.sequence.consentKey as ConsentKey)) {
			await deps.db
				.update(nurtureSends)
				.set({ status: 'cancelled' })
				.where(eq(nurtureSends.id, send.id));
			await cancelEnrollment(deps.db, send.enrollmentId, now);
			result.cancelled += 1;
			continue;
		}

		const step = row.sequence.steps[send.stepIndex];
		if (!step) {
			await deps.db
				.update(nurtureSends)
				.set({ status: 'failed', lastError: 'step definition missing' })
				.where(eq(nurtureSends.id, send.id));
			result.parked += 1;
			continue;
		}

		let cta = step.cta
			? {
					label: step.cta.label,
					url: step.cta.url.startsWith('/') ? `${deps.baseUrl}${step.cta.url}` : step.cta.url
				}
			: undefined;
		if (step.cta?.url === RESULT_URL_TOKEN) {
			const resultUrl = await resolveResultUrl(
				deps.db,
				{ resultId: row.enrollment.resultId, subscriberId: row.subscriber.id },
				row.sequence.trigger,
				deps.baseUrl
			);
			cta = resultUrl ? { label: step.cta.label, url: resultUrl } : undefined;
		}
		const outcome = await deps.email.send({
			to: row.subscriber.email,
			template: step.templateKey,
			data: {
				siteName: deps.siteName,
				subject: step.subject,
				paragraphs: step.paragraphs,
				cta,
				unsubscribeUrl: `${deps.baseUrl}/unsubscribe/${row.subscriber.unsubscribeToken}`
			},
			// One queue row == one delivery, ever: a stale-claim retry after a
			// successful send comes back `skipped`, never a second email.
			idempotencyKey: `nurture:${send.enrollmentId}:${send.stepIndex}`
		});

		if (outcome.status === 'error') {
			if (send.attempts >= NURTURE_MAX_ATTEMPTS) {
				await deps.db
					.update(nurtureSends)
					.set({ status: 'failed', lastError: outcome.error })
					.where(eq(nurtureSends.id, send.id));
				result.parked += 1;
			} else {
				await deps.db
					.update(nurtureSends)
					.set({
						status: 'pending',
						scheduledAt: new Date(now.getTime() + retryDelayMs(send.attempts)),
						lastError: outcome.error
					})
					.where(eq(nurtureSends.id, send.id));
				result.retried += 1;
				continue;
			}
		} else {
			await deps.db
				.update(nurtureSends)
				.set({ status: 'sent', sentAt: now, lastError: null })
				.where(eq(nurtureSends.id, send.id));
			result.sent += 1;
		}

		// Terminal outcome: when no open sends remain, close the enrollment.
		const [open] = await deps.db
			.select({ count: sql<number>`cast(count(*) as int)` })
			.from(nurtureSends)
			.where(
				and(
					eq(nurtureSends.enrollmentId, send.enrollmentId),
					inArray(nurtureSends.status, ['pending', 'sending'])
				)
			);
		if (open && open.count === 0) {
			const closedRows = await deps.db
				.update(nurtureEnrollments)
				.set({ status: 'completed', closedAt: now })
				.where(
					and(eq(nurtureEnrollments.id, send.enrollmentId), eq(nurtureEnrollments.status, 'active'))
				)
				.returning({ id: nurtureEnrollments.id });
			result.completed += closedRows.length;
		}
	}

	return result;
}
