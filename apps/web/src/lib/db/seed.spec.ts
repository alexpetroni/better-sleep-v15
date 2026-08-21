import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { eq, inArray, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { CANONICAL_PILLARS, resolveSiteConfig } from '../config/index.ts';
import { createDb, type Db } from './client.ts';
import { articlePillars, articles } from '../modules/blog/schema.ts';
import { storageConfigFromEnv } from '../modules/media/env.ts';
import { media } from '../modules/media/schema.ts';
import { createStorage } from '../modules/media/storage.ts';
import { quizzes } from '../modules/quiz/schema.ts';
import { DEMO_PRODUCTS } from '../modules/shop/seed-products.ts';
import { productPillars, products } from '../modules/shop/schema.ts';
import { pillars } from './schema/core.ts';
import {
	seedArchetypeQuiz,
	seedDemoArticles,
	seedDemoProducts,
	seedDemoQuiz,
	seededDemoLaunchProblems,
	seedPillars
} from './seed.ts';

// Integration test against the compose Postgres: uses the dedicated test
// database (TEST_DATABASE_URL), reset and re-migrated fresh on every run.
let db: Db;

async function countPillars(): Promise<number> {
	return (await db.select().from(pillars)).length;
}

beforeAll(async () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) {
		throw new Error(
			'TEST_DATABASE_URL is not set — start the database with `docker compose up -d db` and configure .env'
		);
	}
	db = createDb(url);
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`drop schema if exists drizzle cascade`);
	await db.execute(sql`create schema public`);
	await migrate(db, {
		migrationsFolder: path.resolve(import.meta.dirname, '../../../drizzle')
	});
});

afterAll(async () => {
	await db?.$client.end();
});

describe('seedPillars', () => {
	it('seeds the single sleep pillar on a fresh database', async () => {
		const site = resolveSiteConfig('sleep');
		await expect(seedPillars(db, site.pillars)).resolves.toBe(1);
		expect(await countPillars()).toBe(1);
	});

	it('is idempotent: re-seeding never duplicates rows', async () => {
		const allPillars = CANONICAL_PILLARS.map((p) => p.slug);
		await seedPillars(db, allPillars);
		const afterFirst = await countPillars();
		expect(afterFirst).toBe(9);

		await seedPillars(db, allPillars);
		expect(await countPillars()).toBe(afterFirst);
	});

	it('rejects a slug that is not canonical', async () => {
		await expect(seedPillars(db, ['nope'])).rejects.toThrow(/unknown pillar slug/);
	});
});

// BS-7 (review H-9): pre-phase, demo articles/products/quiz seeded LIVE
// (published/active) and every re-seed force-reverted an operator's status
// decision. The draft-default and status-survival tests below fail against
// that behavior.
describe('seedDemoArticles', () => {
	it('seeds 3 DRAFT articles tagged to somn by default, idempotently', async () => {
		// Pillars are present from the seedPillars tests above.
		await expect(seedDemoArticles(db)).resolves.toBe(3);
		const rows = await db.select().from(articles);
		expect(rows).toHaveLength(3);
		expect(rows.every((r) => r.status === 'draft' && r.publishedAt)).toBe(true);

		await seedDemoArticles(db);
		expect(await db.select().from(articles)).toHaveLength(3);
		expect(await db.select().from(articlePillars)).toHaveLength(3);
	});

	it('re-seeding never overwrites an operator status decision', async () => {
		await db
			.update(articles)
			.set({ status: 'published' })
			.where(eq(articles.id, 'seed-article-cicluri-somn'));
		await seedDemoArticles(db);
		const [row] = await db
			.select()
			.from(articles)
			.where(eq(articles.id, 'seed-article-cicluri-somn'));
		expect(row.status).toBe('published');
	});

	it('the e2e setup can opt into published on a fresh insert', async () => {
		await db.delete(articles);
		await seedDemoArticles(db, { status: 'published' });
		const rows = await db.select().from(articles);
		expect(rows).toHaveLength(3);
		expect(rows.every((r) => r.status === 'published')).toBe(true);
	});
});

describe('seedDemoProducts', () => {
	it('seeds 3 DRAFT somn-tagged products with placeholder images, idempotently', async () => {
		// Pillars are present from the seedPillars tests above. Placeholder
		// uploads go to the compose MinIO (same requirement as media specs).
		const storage = createStorage(storageConfigFromEnv(process.env));
		await storage.ensureBucket();

		await expect(seedDemoProducts(db, storage)).resolves.toBe(3);
		await seedDemoProducts(db, storage);

		const rows = await db.select().from(products);
		expect(rows).toHaveLength(3);
		expect(rows.every((r) => r.status === 'draft' && r.priceCents > 0)).toBe(true);
		expect(rows.every((r) => r.coverMediaId)).toBe(true);
		expect(await db.select().from(productPillars)).toHaveLength(3);

		// Every referenced image row exists and its object is really in storage.
		const mediaRows = await db.select().from(media);
		const seedImages = mediaRows.filter((r) => r.id.startsWith('seed-media-'));
		expect(seedImages).toHaveLength(4);
		for (const image of seedImages) {
			const stat = await storage.statObject(image.key!);
			expect(stat?.mime).toBe('image/svg+xml');
		}
	});

	it('re-seeding never reverts an operator archive (the H-9 clobber)', async () => {
		const storage = createStorage(storageConfigFromEnv(process.env));
		await db
			.update(products)
			.set({ status: 'archived' })
			.where(eq(products.id, 'seed-product-masca-somn'));
		await seedDemoProducts(db, storage);
		const [row] = await db
			.select()
			.from(products)
			.where(eq(products.id, 'seed-product-masca-somn'));
		expect(row.status).toBe('archived');
	});

	it('the e2e setup can opt into active on a fresh insert', async () => {
		const storage = createStorage(storageConfigFromEnv(process.env));
		await db.delete(products);
		await seedDemoProducts(db, storage, { status: 'active' });
		const rows = await db.select().from(products);
		expect(rows.every((r) => r.status === 'active')).toBe(true);
	});
});

describe('seedDemoQuiz', () => {
	it('seeds one DRAFT, somn-tagged quiz by default, idempotently', async () => {
		// Pillars are present from the seedPillars tests above.
		await expect(seedDemoQuiz(db)).resolves.toBe('evaluare-somn');
		await seedDemoQuiz(db);

		const rows = await db.select().from(quizzes);
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe('draft');
		expect(rows[0].pillarId).not.toBeNull();
		expect(rows[0].scoring.bands).toHaveLength(3);
	});

	it('the archetype quiz IS launch content: published on insert, status not clobbered after', async () => {
		await expect(seedArchetypeQuiz(db)).resolves.toBe('arhetip-somn');
		const [row] = await db.select().from(quizzes).where(eq(quizzes.id, 'seed-quiz-arhetip-somn'));
		expect(row.status).toBe('published');

		await db
			.update(quizzes)
			.set({ status: 'draft' })
			.where(eq(quizzes.id, 'seed-quiz-arhetip-somn'));
		await seedArchetypeQuiz(db);
		const [after] = await db.select().from(quizzes).where(eq(quizzes.id, 'seed-quiz-arhetip-somn'));
		expect(after.status).toBe('draft');
	});
});

// BS-7 (review H-9): launch:check had no rule about seeded demo ids —
// pre-phase this function did not exist and three fictional products sat
// purchasable in a preflight-green production catalogue.
describe('seededDemoLaunchProblems', () => {
	it('flags every live demo row and is silent once all are retired', async () => {
		// Arrange the pre-BS-7 production shape: everything demo is live.
		const demoProductIds = DEMO_PRODUCTS.map((p) => p.id);
		await db.update(products).set({ status: 'active' }).where(inArray(products.id, demoProductIds));
		await db.update(articles).set({ status: 'published' });
		await db
			.update(quizzes)
			.set({ status: 'published' })
			.where(eq(quizzes.id, 'seed-quiz-evaluare-somn'));

		const problems = await seededDemoLaunchProblems(db);
		expect(problems).toHaveLength(7); // 3 products + 3 articles + 1 demo quiz
		expect(problems.join('\n')).toMatch(/demo product "masca-de-somn-premium" .* still active/);
		expect(problems.join('\n')).toMatch(
			/demo article "ciclurile-somnului-explicate" .* still published/
		);
		expect(problems.join('\n')).toMatch(/demo quiz "evaluare-somn" .* still published/);
		// The published ARCHETYPE quiz must never be flagged — it is the launch quiz.
		await db
			.update(quizzes)
			.set({ status: 'published' })
			.where(eq(quizzes.id, 'seed-quiz-arhetip-somn'));
		expect((await seededDemoLaunchProblems(db)).join('\n')).not.toMatch(/arhetip-somn/);

		// Retire everything the way an operator would.
		await db
			.update(products)
			.set({ status: 'archived' })
			.where(inArray(products.id, demoProductIds));
		await db.update(articles).set({ status: 'draft' });
		await db
			.update(quizzes)
			.set({ status: 'draft' })
			.where(eq(quizzes.id, 'seed-quiz-evaluare-somn'));
		expect(await seededDemoLaunchProblems(db)).toEqual([]);
	});
});
