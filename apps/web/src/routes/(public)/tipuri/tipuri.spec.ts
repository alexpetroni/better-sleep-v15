import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, type Db } from '../../../lib/db/client.ts';
import { seedPillars } from '../../../lib/db/seed.ts';
import { importContentDirs } from '../../../lib/modules/content/init.ts';
import { storageConfigFromEnv } from '../../../lib/modules/media/env.ts';
import { createStorage } from '../../../lib/modules/media/storage.ts';
import { ARCHETYPE_PAGES } from '../../../lib/modules/quiz/index.ts';

// Route-level test for the archetype pages: with the real content/sleep
// bundles imported, every /tipuri/[archetype] load resolves with a non-empty
// reading list; an unknown slug 404s. `$env` values are a build-time
// snapshot under vitest, so `$lib/db` is mocked to redirect (sitemap.spec
// pattern).
const appDbHolder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('$lib/db', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../lib/db/index.ts')>();
	const { createDb: create } = await import('../../../lib/db/client.ts');
	return {
		...actual,
		getDb: () => {
			appDbHolder.db ??= create(process.env.TEST_DATABASE_URL!);
			return appDbHolder.db;
		}
	};
});

const ROOT = path.resolve(import.meta.dirname, '../../../../../..');

let db: Db;

beforeAll(async () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error('TEST_DATABASE_URL is not set — see .env.example');
	const storageCfg = storageConfigFromEnv(process.env);
	if (!storageCfg.endpoint) {
		throw new Error('S3_* env vars are not set — start `docker compose up -d`');
	}

	db = createDb(url);
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`drop schema if exists drizzle cascade`);
	await db.execute(sql`create schema public`);
	await migrate(db, {
		migrationsFolder: path.resolve(import.meta.dirname, '../../../../drizzle')
	});
	await seedPillars(db, ['somn']);
	const storage = createStorage(storageCfg);
	await storage.ensureBucket();
	const summary = await importContentDirs({ db, storage }, [path.join(ROOT, 'content/sleep')]);
	if (summary.failed > 0) throw new Error('content/sleep import failed');
	// Rebuilding the schema plus importing all committed bundles (40 articles +
	// 33 products since BS-6) overruns the default 10s hook timeout under a
	// full-suite run, though it takes ~5s in isolation.
}, 60_000);

afterAll(async () => {
	await db?.$client.end();
});

describe('/tipuri/[archetype]', () => {
	it('resolves every archetype page with its copy and >=1 article', async () => {
		const { load } = await import('./[archetype]/+page.server.ts');
		for (const page of ARCHETYPE_PAGES) {
			const data = await load({ params: { archetype: page.slug } } as never);
			if (!data) throw new Error(`load returned no data for ${page.slug}`);
			expect(data.archetype.id, page.slug).toBe(page.id);
			expect(data.canonical, page.slug).toContain(`/tipuri/${page.slug}`);
			expect(data.articles.length, page.slug).toBeGreaterThanOrEqual(1);
			for (const card of data.articles) {
				expect(card.title.length, `${page.slug} -> ${card.slug}`).toBeGreaterThan(0);
				expect(card.excerpt.length, `${page.slug} -> ${card.slug}`).toBeGreaterThan(0);
			}
		}
	});

	it('404s an unknown archetype slug', async () => {
		const { load } = await import('./[archetype]/+page.server.ts');
		await expect(load({ params: { archetype: 'somnambulul' } } as never)).rejects.toMatchObject({
			status: 404
		});
	});
});
