import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { isHttpError } from '@sveltejs/kit';
import { createDb, type Db } from '../../../../../lib/db/client.ts';
import { seedArchetypeQuiz, seedPillars } from '../../../../../lib/db/seed.ts';
import { ARCHETYPE_QUIZ_FORM } from '../../../../../lib/modules/quiz/seed-archetype-quiz.ts';
import { quizResults, quizzes } from '../../../../../lib/modules/quiz/schema.ts';
import { windowStart } from '../../../../../lib/server/rate-limit/core.ts';
import { QUIZ_SUBMIT_IP_LIMIT } from '../../../../../lib/server/rate-limit/public-email.ts';
import { rateLimits } from '../../../../../lib/server/rate-limit/schema.ts';

// BS-8 integration (review H-6/M-2): the REAL public submit endpoint against
// the compose Postgres and the REAL seeded archetype quiz. Under test: the
// quiz-submit throttle, the shrunk body cap, and the sanitizer refusing
// hand-crafted payloads that skip required questions.
const appDbHolder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('$lib/db', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../../../lib/db/index.ts')>();
	const { createDb: create } = await import('../../../../../lib/db/client.ts');
	return {
		...actual,
		getDb: () => {
			appDbHolder.db ??= create(process.env.TEST_DATABASE_URL!);
			return appDbHolder.db;
		}
	};
});

let db: Db;
let quizId: string;

interface SubmitEvent {
	request: Request;
	params: { slug: string };
	getClientAddress: () => string;
}
let post: (event: SubmitEvent) => Promise<Response>;

/** One valid answer per question, straight from the seeded schema. */
function validAnswers() {
	return ARCHETYPE_QUIZ_FORM.steps.flatMap((step) =>
		step.groups.flatMap((group) =>
			group.questions.map((question) => ({
				questionId: question.id,
				value:
					question.type === 'multi-select'
						? [question.options![0].value]
						: question.options![0].value
			}))
		)
	);
}

function submitEvent(body: unknown, ip: string, slug = 'arhetip-somn'): SubmitEvent {
	return {
		request: new Request(`http://localhost/quiz/${slug}/submit`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		}),
		params: { slug },
		getClientAddress: () => ip
	};
}

/** The endpoint throws HttpError via `error()` — unwrap its status. */
async function statusOf(promise: Promise<Response>): Promise<number> {
	try {
		return (await promise).status;
	} catch (err) {
		if (isHttpError(err)) return err.status;
		throw err;
	}
}

async function resultCount(): Promise<number> {
	const rows = await db.select().from(quizResults).where(eq(quizResults.quizId, quizId));
	return rows.length;
}

beforeAll(async () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is not set — see .env.example');
	db = createDb(url);
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`drop schema if exists drizzle cascade`);
	await db.execute(sql`create schema public`);
	await migrate(db, {
		migrationsFolder: path.resolve(import.meta.dirname, '../../../../../../drizzle')
	});
	await seedPillars(db, ['somn']);
	const slug = await seedArchetypeQuiz(db);
	const [quiz] = await db.select().from(quizzes).where(eq(quizzes.slug, slug));
	quizId = quiz.id;

	const route = await import('./+server.ts');
	post = route.POST as unknown as typeof post;
});

afterAll(async () => {
	await (appDbHolder.db as Db | undefined)?.$client.end();
	await db?.$client.end();
});

describe('the public submit endpoint refuses abuse', () => {
	it('stores a full valid submission and redirects to the result page', async () => {
		const response = await post(submitEvent({ answers: validAnswers() }, '203.0.113.30'));
		expect(response.status).toBe(200);
		const body = (await response.json()) as { redirectUrl: string };
		expect(body.redirectUrl).toMatch(/^\/quiz\/arhetip-somn\/rezultat\//);
		expect(await resultCount()).toBe(1);
	});

	it('is rate limited per IP (review H-6): the over-cap POST gets 429 and stores nothing', async () => {
		const ip = '203.0.113.31';
		const values = {
			key: `quiz-submit:ip:${ip}`,
			count: QUIZ_SUBMIT_IP_LIMIT.max,
			prevCount: 0,
			windowStartedAt: windowStart(new Date(), QUIZ_SUBMIT_IP_LIMIT.windowMs)
		};
		await db.insert(rateLimits).values(values).onConflictDoUpdate({
			target: rateLimits.key,
			set: values
		});
		const before = await resultCount();
		expect(await statusOf(post(submitEvent({ answers: validAnswers() }, ip)))).toBe(429);
		expect(await resultCount()).toBe(before);
	});

	it('refuses a payload over the 16 KB cap with 413', async () => {
		const padded = {
			answers: validAnswers(),
			padding: 'x'.repeat(32 * 1024)
		};
		expect(await statusOf(post(submitEvent(padded, '203.0.113.32')))).toBe(413);
	});

	it('an empty answers array no longer stores a winner: 400, nothing written (review M-2)', async () => {
		const before = await resultCount();
		expect(await statusOf(post(submitEvent({ answers: [] }, '203.0.113.33')))).toBe(400);
		expect(await resultCount()).toBe(before);
	});

	it('a duplicated-array answer on a single-select is dropped → 400 for the missing required', async () => {
		const hostile = validAnswers().map((a, i) =>
			i === 0 ? { ...a, value: [a.value, a.value, a.value] } : a
		);
		const before = await resultCount();
		expect(await statusOf(post(submitEvent({ answers: hostile }, '203.0.113.34')))).toBe(400);
		expect(await resultCount()).toBe(before);
	});

	it('404s an unknown or unpublished slug before consuming anything', async () => {
		expect(await statusOf(post(submitEvent({ answers: [] }, '203.0.113.35', 'inexistent')))).toBe(
			404
		);
		await db.update(quizzes).set({ status: 'draft' }).where(eq(quizzes.id, quizId));
		expect(await statusOf(post(submitEvent({ answers: validAnswers() }, '203.0.113.35')))).toBe(
			404
		);
		await db.update(quizzes).set({ status: 'published' }).where(eq(quizzes.id, quizId));
	});
});
