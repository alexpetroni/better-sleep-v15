import { and, eq, isNull, or } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import {
	sendNewsletterConfirmEmail,
	upsertSubscriber,
	type NewsletterSignupDeps
} from '$lib/modules/crm/server';
import { normalizeEmail } from '../../util/email.ts';
import type { ConsentChanges } from '../crm/consent.ts';
import { subscribers } from '../crm/schema.ts';
import type { EmailSender, SendEmailOutcome } from '../email/service.ts';
import { quizResults } from './schema.ts';
import { getResultWithQuiz } from './service.ts';

/**
 * The email step after a quiz: the visitor already SEES the result on-page;
 * giving an email is optional and only adds delivery + (optional) marketing
 * consents. The quiz-result email is transactional — it goes out for the
 * given address regardless of the consent checkboxes, exactly once per
 * (result, address) even when the handler retries.
 *
 * Deliberately NOT wrapped in a db.transaction (audit Theme B): the sequence
 * interleaves external email sends that could never roll back, and every
 * step is individually idempotent — the subscriber upsert merges (keeping
 * the original consent record), the result link is a repeatable UPDATE, and
 * both emails are keyed. A partial failure surfaces as a form error and a
 * retry of the whole action heals it; a rollback would instead orphan
 * email_log rows that already reference the rolled-back subscriber.
 */

export interface QuizFunnelDeps {
	db: Db;
	email: EmailSender;
	/** HMAC secret for the newsletter confirm token. */
	secret: string;
	/** Public origin for links in emails. */
	baseUrl: string;
	siteName: string;
}

export interface ClaimQuizResultInput {
	resultId: string;
	email: string;
	name?: string;
	locale?: string;
	/** Explicit checkbox states — unticked (false) means "don't touch". */
	newsletter: boolean;
	profileEmails: boolean;
}

export type ClaimQuizResultOutcome =
	| {
			ok: true;
			subscriberId: string;
			resultEmail: SendEmailOutcome['status'];
			newsletterConfirm: SendEmailOutcome['status'] | 'already-confirmed' | 'not-requested';
	  }
	| { ok: false; error: 'not-found' | 'invalid-email' | 'already-claimed' };

export async function claimQuizResult(
	deps: QuizFunnelDeps,
	input: ClaimQuizResultInput
): Promise<ClaimQuizResultOutcome> {
	const found = await getResultWithQuiz({ db: deps.db }, input.resultId);
	if (!found) return { ok: false, error: 'not-found' };
	const { result, quiz } = found;

	// First claim wins (review M-1): once a subscriber owns this result, only
	// the SAME address may re-claim (the retry/typo-resubmit path). Anyone
	// else holding the shared URL is refused BEFORE any consent is granted or
	// email sent — a claim must never attach a second person to someone
	// else's result, or mail them its profile.
	if (result.subscriberId) {
		const email = normalizeEmail(input.email);
		if (!email) return { ok: false, error: 'invalid-email' };
		const [owner] = await deps.db
			.select({ email: subscribers.email })
			.from(subscribers)
			.where(eq(subscribers.id, result.subscriberId));
		if (owner && owner.email !== email) return { ok: false, error: 'already-claimed' };
	}

	// GDPR: only ticked boxes become grants; an unticked box is a no-op.
	const grants: ConsentChanges = {};
	if (input.newsletter) grants.newsletter = true;
	if (input.profileEmails) grants.profile_emails = true;

	const upserted = await upsertSubscriber(deps, {
		email: input.email,
		name: input.name,
		locale: input.locale,
		grants,
		source: `quiz:${quiz.slug}`
	});
	if (!upserted.ok) return upserted;
	const subscriber = upserted.value;

	// Conditional write: guards the race two concurrent first-claims can't
	// both win — the row only links while unclaimed or already ours.
	const linked = await deps.db
		.update(quizResults)
		.set({ subscriberId: subscriber.id })
		.where(
			and(
				eq(quizResults.id, result.id),
				or(isNull(quizResults.subscriberId), eq(quizResults.subscriberId, subscriber.id))
			)
		)
		.returning({ id: quizResults.id });
	if (linked.length === 0) return { ok: false, error: 'already-claimed' };

	const resultEmail = await deps.email.send({
		to: subscriber.email,
		template: 'quiz-result',
		data: {
			siteName: deps.siteName,
			quizTitle: quiz.title,
			score: result.profile.score,
			maxScore: result.profile.maxScore,
			// Archetype-mode results name the winning archetype; the catch-all
			// band's advice then points back at the full result page.
			bandLabel: result.profile.winner?.label ?? result.profile.band.label,
			advice: result.profile.band.advice,
			resultUrl: `${deps.baseUrl}/quiz/${quiz.slug}/rezultat/${result.id}`
		},
		// Includes the address: a retry never re-sends. (A different address
		// can only reach here while the result is unclaimed — first claim wins.)
		idempotencyKey: `quiz-result:${result.id}:${subscriber.email}`
	});

	const signupDeps: NewsletterSignupDeps = { ...deps, siteName: deps.siteName };
	const newsletterConfirm = input.newsletter
		? await sendNewsletterConfirmEmail(signupDeps, subscriber)
		: 'not-requested';

	return {
		ok: true,
		subscriberId: subscriber.id,
		resultEmail: resultEmail.status,
		newsletterConfirm
	};
}
