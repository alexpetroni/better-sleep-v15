import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { isActionFailure } from '@sveltejs/kit';
import { sleepSite } from '../../../../../../lib/config/sites/sleep.ts';
import { createDb, type Db } from '../../../../../../lib/db/client.ts';
import { seedArchetypeQuiz, seedPillars } from '../../../../../../lib/db/seed.ts';
import { subscribers } from '../../../../../../lib/modules/crm/schema.ts';
import { emailLog } from '../../../../../../lib/modules/email/schema.ts';
import {
	nurtureEnrollments,
	nurtureSequences
} from '../../../../../../lib/modules/nurture/schema.ts';
import { seedNurtureSequences } from '../../../../../../lib/modules/nurture/service.ts';
import { quizResults, quizzes } from '../../../../../../lib/modules/quiz/schema.ts';
import { windowStart } from '../../../../../../lib/server/rate-limit/core.ts';
import { PUBLIC_EMAIL_GLOBAL_LIMIT } from '../../../../../../lib/server/rate-limit/public-email.ts';
import { rateLimits } from '../../../../../../lib/server/rate-limit/schema.ts';

// BS-3 integration: the hardened quiz-result capture action ("never trust the
// browser"). The REAL route action runs against the compose Postgres with the
// REAL seeded archetype quiz and the REAL sleep nurture sequences; email is
// dry-run. Server-side gates under test: consent, honeypot, throttle, email
// validity — plus the one-subscriber/one-enrollment invariants.
const appDbHolder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('$lib/db', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../../../../lib/db/index.ts')>();
	const { createDb: create } = await import('../../../../../../lib/db/client.ts');
	return {
		...actual,
		getDb: () => {
			appDbHolder.db ??= create(process.env.TEST_DATABASE_URL!);
			return appDbHolder.db;
		}
	};
});

let db: Db;
let resultId: string;

interface EmailActionEvent {
	request: Request;
	params: { slug: string; resultId: string };
	getClientAddress: () => string;
}
let emailAction: (event: EmailActionEvent) => Promise<unknown>;

/** A POST the way the capture form sends it; fields removable per test. */
function captureEvent(
	email: string,
	ip: string,
	overrides: Record<string, string | null> = {}
): EmailActionEvent {
	const fields: Record<string, string | null> = {
		email,
		newsletter_consent: 'yes',
		website: '',
		...overrides
	};
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (value !== null) body.set(key, value);
	}
	return {
		request: new Request('http://localhost/quiz/arhetip-somn/rezultat/x', {
			method: 'POST',
			body
		}),
		params: { slug: 'arhetip-somn', resultId },
		getClientAddress: () => ip
	};
}

async function subscriberRows(email: string) {
	return db.select().from(subscribers).where(eq(subscribers.email, email));
}

async function emailLogTo(email: string) {
	return db.select().from(emailLog).where(eq(emailLog.toEmail, email));
}

async function enrollmentsOf(subscriberId: string) {
	return db
		.select()
		.from(nurtureEnrollments)
		.where(eq(nurtureEnrollments.subscriberId, subscriberId));
}

beforeAll(async () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is not set — see .env.example');
	db = createDb(url);
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`drop schema if exists drizzle cascade`);
	await db.execute(sql`create schema public`);
	await migrate(db, {
		migrationsFolder: path.resolve(import.meta.dirname, '../../../../../../../drizzle')
	});
	await seedPillars(db, ['somn']);
	await seedArchetypeQuiz(db);
	// The real site config — also proves the new protocol sequence validates.
	await seedNurtureSequences(db, sleepSite.nurture);

	// One stored result of the seeded quiz for the whole file (the action's
	// idempotency across resubmits is part of what's under test).
	const [quiz] = await db.select().from(quizzes).where(eq(quizzes.slug, 'arhetip-somn'));
	resultId = crypto.randomUUID();
	await db.insert(quizResults).values({
		id: resultId,
		quizId: quiz.id,
		score: 12,
		profile: {
			score: 12,
			maxScore: 27,
			band: { key: 'arhetip', min: 0, label: 'Tiparul tău de somn', advice: 'Vezi pagina.' },
			dimensions: []
		}
	});

	const route = await import('./+page.server.ts');
	emailAction = route.actions.email as unknown as typeof emailAction;
});

afterAll(async () => {
	await (appDbHolder.db as Db | undefined)?.$client.end();
	await db?.$client.end();
});

describe('the capture action re-checks everything server-side', () => {
	it('missing or unticked consent → 400, nothing written, no email', async () => {
		const email = 'fara-consimtamant@example.com';
		for (const consent of [null, 'no', 'on']) {
			const result = await emailAction(
				captureEvent(email, '203.0.113.10', { newsletter_consent: consent })
			);
			if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
			expect(result.status).toBe(400);
			expect(result.data).toEqual({ error: 'consent' });
		}
		expect(await subscriberRows(email)).toEqual([]);
		expect(await emailLogTo(email)).toEqual([]);
	});

	it('filled (or missing) honeypot → silently dropped: success shape, no subscriber row', async () => {
		const email = 'bot@example.com';
		const filled = await emailAction(
			captureEvent(email, '203.0.113.11', { website: 'https://spam.example' })
		);
		// The bot sees the normal success flow — it cannot tell it was refused.
		expect(filled).toEqual({ sent: true });
		// A post without the field at all is just as much a bot (the form always
		// sends it empty).
		expect(await emailAction(captureEvent(email, '203.0.113.11', { website: null }))).toEqual({
			sent: true
		});
		expect(await subscriberRows(email)).toEqual([]);
		expect(await emailLogTo(email)).toEqual([]);
	});

	it('invalid email → 400 invalid-email, nothing written', async () => {
		const result = await emailAction(captureEvent('nu-e-email', '203.0.113.12'));
		if (!isActionFailure(result)) throw new Error('expected an ActionFailure');
		expect(result.status).toBe(400);
		expect(result.data).toEqual({ error: 'invalid-email' });
	});

	it('valid submit (new address): ONE subscriber, both emails, NO enrollment before confirm', async () => {
		const email = 'vizitator-nou@example.com';
		expect(await emailAction(captureEvent(email, '203.0.113.13'))).toEqual({ sent: true });
		const rows = await subscriberRows(email);
		expect(rows).toHaveLength(1);
		expect(rows[0].consents.newsletter?.granted).toBe(true);
		expect(rows[0].consents.profile_emails).toBeUndefined();
		const logs = await emailLogTo(email);
		expect(logs.map((l) => l.template).sort()).toEqual(['newsletter-confirm', 'quiz-result']);
		expect(logs.every((l) => l.status === 'dryrun')).toBe(true);
		// Double opt-in not confirmed yet — the nurture gate must refuse.
		expect(await enrollmentsOf(rows[0].id)).toEqual([]);
	});

	it('valid submit (confirmed subscriber): exactly ONE subscriber + ONE enrollment; resubmit is a no-op', async () => {
		const email = 'confirmat@example.com';
		const subscriberId = crypto.randomUUID();
		await db.insert(subscribers).values({
			id: subscriberId,
			email,
			consents: { newsletter: { granted: true, at: new Date().toISOString(), source: 'footer' } },
			confirmedAt: new Date(),
			unsubscribeToken: crypto.randomUUID()
		});

		expect(await emailAction(captureEvent(email, '203.0.113.14'))).toEqual({ sent: true });
		expect(await subscriberRows(email)).toHaveLength(1);
		const enrollments = await enrollmentsOf(subscriberId);
		expect(enrollments).toHaveLength(1);
		const [sequence] = await db
			.select()
			.from(nurtureSequences)
			.where(eq(nurtureSequences.id, enrollments[0].sequenceId));
		expect(sequence.key).toBe('protocol-arhetip-somn');

		// Resubmitting the same email: unique enrollment is the rule, and the
		// keyed result email never goes out twice for the same (result, address).
		expect(await emailAction(captureEvent(email, '203.0.113.14'))).toEqual({ sent: true });
		expect(await subscriberRows(email)).toHaveLength(1);
		expect(await enrollmentsOf(subscriberId)).toHaveLength(1);
		const logs = await emailLogTo(email);
		expect(logs.map((l) => l.template)).toEqual(['quiz-result']);
	});

	it('rate limit trips once the budget is spent — before any email goes out', async () => {
		// Spend the whole global quiz-email budget in one write (current window).
		const values = {
			key: 'quiz-email:global',
			count: PUBLIC_EMAIL_GLOBAL_LIMIT.max,
			prevCount: 0,
			windowStartedAt: windowStart(new Date(), PUBLIC_EMAIL_GLOBAL_LIMIT.windowMs)
		};
		await db
			.insert(rateLimits)
			.values(values)
			.onConflictDoUpdate({ target: rateLimits.key, set: values });

		const email = 'peste-buget@example.com';
		const blocked = await emailAction(captureEvent(email, '198.51.100.20'));
		if (!isActionFailure(blocked)) throw new Error('expected an ActionFailure');
		expect(blocked.status).toBe(429);
		expect(blocked.data).toEqual({ error: 'rate-limited' });
		expect(await subscriberRows(email)).toEqual([]);
		expect(await emailLogTo(email)).toEqual([]);
	});
});
