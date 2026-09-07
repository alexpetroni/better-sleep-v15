import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, type Db } from '../../db/client.ts';
import { subscribers } from '../crm/schema.ts';
import { emailLog } from '../email/schema.ts';
import { nurtureEnrollments, nurtureSequences } from '../nurture/schema.ts';
import { quizResults, quizzes } from '../quiz/schema.ts';
import { orders } from '../shop/schema.ts';
import { exportSubscriberData } from './export.ts';

// Integration: the GDPR subject-access export behind `pnpm subscriber:export`
// (review M-10) — the read-side twin of erase.spec.ts, over the same tables.

const EMAIL = 'sar-spec@example.com';

let db: Db;

beforeAll(async () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is not set — see .env.example');
	db = createDb(url);
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`drop schema if exists drizzle cascade`);
	await db.execute(sql`create schema public`);
	await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../../../drizzle') });

	await db.insert(subscribers).values({
		id: 'sar-sub',
		email: EMAIL,
		consents: {
			newsletter: { granted: true, at: '2026-07-01T00:00:00Z', source: 'footer', consentTextVersion: 'newsletter_consent_label@1:sha256:x' }
		},
		unsubscribeToken: 'sar-spec-token'
	});
	await db.insert(quizzes).values({ id: 'sar-quiz', slug: 'sar-quiz', title: 'Q' });
	await db.insert(quizResults).values({
		id: 'sar-result',
		quizId: 'sar-quiz',
		subscriberId: 'sar-sub',
		answers: [],
		score: 10,
		profile: {
			score: 10,
			maxScore: 32,
			band: { key: 'ok', min: 0, label: 'ok', advice: '' },
			dimensions: []
		}
	});
	await db.insert(nurtureSequences).values({
		id: 'sar-seq',
		key: 'sar-seq',
		name: 'SAR',
		trigger: { kind: 'quiz-completed', quizSlug: 'sar-quiz' }
	});
	await db.insert(nurtureEnrollments).values({
		id: 'sar-enrollment',
		sequenceId: 'sar-seq',
		subscriberId: 'sar-sub',
		resultId: 'sar-result'
	});
	await db.insert(orders).values({
		id: 'sar-order',
		email: EMAIL,
		stripeSessionId: 'cs_test_sar',
		amountTotalCents: 4990,
		currency: 'ron',
		status: 'paid',
		shippingAddress: { name: 'Test Person', line1: 'Str. Exemplu 1', city: 'București' }
	});
	await db.insert(emailLog).values({
		id: 'sar-log',
		idempotencyKey: 'sar-spec-key',
		toEmail: EMAIL,
		template: 'newsletter-confirm',
		subject: 'Confirmă',
		data: { confirmUrl: 'https://example.com/t0k3n' },
		status: 'dryrun'
	});
});

afterAll(async () => {
	await db?.$client.end();
});

describe('exportSubscriberData', () => {
	it('rejects invalid emails', async () => {
		expect(await exportSubscriberData({ db }, 'not-an-email')).toEqual({
			ok: false,
			error: 'invalid-email'
		});
	});

	it('assembles everything held for the address, lookup case-insensitive', async () => {
		const result = await exportSubscriberData({ db }, `  ${EMAIL.toUpperCase()} `);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const data = result.value;

		expect(data.email).toBe(EMAIL);
		expect(data.subscriber?.id).toBe('sar-sub');
		expect(data.subscriber?.consents.newsletter?.consentTextVersion).toBe(
			'newsletter_consent_label@1:sha256:x'
		);
		expect(data.quizResults.map((r) => r.id)).toEqual(['sar-result']);
		expect(data.nurtureEnrollments.map((e) => e.id)).toEqual(['sar-enrollment']);
		expect(data.orders.map((o) => o.id)).toEqual(['sar-order']);
		expect(data.orders[0].shippingAddress?.name).toBe('Test Person');
		expect(data.invoices).toEqual([]);
		expect(data.emailLog.map((l) => l.id)).toEqual(['sar-log']);

		// The CLI prints this verbatim — it must serialize cleanly.
		expect(() => JSON.stringify(data)).not.toThrow();
	});

	it('an unknown address yields an empty (but well-formed) export', async () => {
		const result = await exportSubscriberData({ db }, 'necunoscut@example.com');
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual({
			email: 'necunoscut@example.com',
			subscriber: null,
			quizResults: [],
			nurtureEnrollments: [],
			orders: [],
			invoices: [],
			emailLog: []
		});
	});
});
