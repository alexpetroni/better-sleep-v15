// Runs once before the e2e suite: migrate the site database, seed the staff
// users the admin tests log in with, and clear rate-limit counters left by a
// previous run (their 15-minute window outlives a test cycle).
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolveSiteConfig } from '../src/lib/config/index.ts';
import { createDb } from '../src/lib/db/client.ts';
import {
	seedArchetypeQuiz,
	seedDefaultPages,
	seedDemoArticles,
	seedDemoProducts,
	seedDemoQuiz,
	seedPillars
} from '../src/lib/db/seed.ts';
import { createAuth } from '../src/lib/modules/auth/auth.ts';
import { parseBundle } from '../src/lib/modules/content/bundle.ts';
import { importContent } from '../src/lib/modules/content/import.ts';
import { upsertStaffUser } from '../src/lib/modules/auth/staff.ts';
import { invoiceStorageConfigFromEnv, storageConfigFromEnv } from '../src/lib/modules/media/env.ts';
import { createStorage } from '../src/lib/modules/media/storage.ts';
import { E2E_ADMIN, E2E_EDITOR, SITE_DB_NAMES, siteDatabaseUrl } from './env.ts';

export default async function globalSetup() {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) throw new Error('BETTER_AUTH_SECRET is not set — configure the root .env');

	// A fresh compose stack has no bucket yet (same bootstrap as `pnpm storage:init`).
	// The public-read policy matters: the suite runs on IMAGE_PROVIDER=direct, so
	// the browser fetches originals off MinIO with no credentials at all.
	const storage = createStorage(storageConfigFromEnv(process.env));
	await storage.ensureBucket();
	await storage.allowPublicRead();
	// The private fiscal bucket (invoice documents); never public.
	await createStorage(invoiceStorageConfigFromEnv(process.env)).ensureBucket();

	for (const siteId of Object.keys(SITE_DB_NAMES) as Array<keyof typeof SITE_DB_NAMES>) {
		const db = createDb(siteDatabaseUrl(siteId));
		try {
			await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../drizzle') });
			// The quiz e2e runs against the seeded pillars + demo/archetype quizzes
			// (idempotent). Demo content defaults to draft since BS-7 (review H-9);
			// the e2e suite is exactly the environment that opts back in.
			await seedPillars(db, resolveSiteConfig(siteId).pillars);
			await seedDemoQuiz(db, { status: 'published' });
			await seedArchetypeQuiz(db);
			// Quiz rows persist across runs and seeding no longer touches `status`
			// on conflict (BS-7) — force the publish state the quiz e2e relies on,
			// like the deletes above reset every other table the suite owns.
			await db.execute(
				sql`update quizzes set status = 'published' where id in ('seed-quiz-evaluare-somn', 'seed-quiz-arhetip-somn')`
			);
			const auth = createAuth({ db, secret });
			await upsertStaffUser(auth, { ...E2E_ADMIN, role: 'admin' });
			await upsertStaffUser(auth, { ...E2E_EDITOR, role: 'editor' });
			await db.execute(sql`delete from login_attempts`);
			await db.execute(sql`delete from rate_limits`);
			// The settings e2e edits and asserts exact values; leftovers from a
			// previous run would collide with the fresh-form expectations.
			await db.execute(sql`delete from site_settings`);
			// Content is created by the tests themselves; leftovers from a failed
			// earlier run would break slug and filename assumptions. Articles and
			// shop rows go first — they reference media (FKs + delete-refusal
			// checks); order_items reference orders and products.
			await db.execute(sql`delete from articles`);
			// Order + fiscal tables go via TRUNCATE: invoices are append-only
			// (row-level triggers reject DELETE, and orders with an invoice are
			// FK-protected), while TRUNCATE — a maintenance op, not a row
			// mutation path — resets the lot, invoice numbering included.
			// processed_events included: the webhook simulation reuses a fixed
			// event id per site, and a leftover ledger row from a previous run
			// would turn the first delivery into a duplicate.
			await db.execute(
				sql`truncate table invoice_submissions, invoice_lines, invoices, invoice_series, shipments, order_events, order_items, pending_refunds, orders, processed_events`
			);
			await db.execute(sql`delete from products`);
			await db.execute(sql`delete from media`);
			// Funnel leftovers: results reference subscribers, so they go first.
			await db.execute(sql`delete from quiz_results`);
			// Nurture sequences cascade enrollments + sends; a dev-db `db:seed`
			// could have left sequences that would enroll confirm-flow subscribers.
			await db.execute(sql`delete from nurture_sequences`);
			await db.execute(sql`delete from subscribers`);
			await db.execute(sql`delete from email_log`);
			// Chat leftovers: hourly rate-limit counters outlive a test cycle.
			await db.execute(sql`delete from chat_messages`);
			await db.execute(sql`delete from chat_sessions`);
			await db.execute(sql`delete from chat_rate_limits`);
			// The shop e2e runs against the seeded demo catalog (idempotent; also
			// restores stock levels consumed by earlier webhook simulations).
			await seedDemoProducts(db, storage, { status: 'active' });
			// The 33 BS-6 catalogue products (product bundles only — the article
			// bundles stay out so the blog e2e keeps its listing assumptions).
			// The landing night map links into these; the shop e2e counts them.
			const sleepContentDir = path.resolve(import.meta.dirname, '../../../content/sleep');
			for (const file of (await readdir(sleepContentDir)).filter((f) => f.endsWith('.json'))) {
				const parsed = parseBundle(
					JSON.parse(await readFile(path.join(sleepContentDir, file), 'utf8'))
				);
				if (!parsed.ok) throw new Error(`Invalid bundle ${file}: ${parsed.error}`);
				if (parsed.bundle.type !== 'product') continue;
				const imported = await importContent({ db, storage }, parsed.bundle);
				if (!imported.ok) throw new Error(`Import failed for ${file}: ${imported.error}`);
			}
			// The full-funnel e2e walks pillar page → demo article and the legal
			// pages linked from the footer.
			await seedDemoArticles(db, { status: 'published' });
			await seedDefaultPages(db);
		} finally {
			await db.$client.end();
		}
	}
}
