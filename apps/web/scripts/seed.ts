// Database seed for the active SITE_ID. Two halves (FIX-15):
//   base — pillars, legal pages, placeholder settings, nurture sequences and
//          the site's initial content bundles from `content/`. Idempotent and
//          create-only where an admin can edit (pages, settings, content —
//          `--overwrite` is never passed here), so it is safe on a live site.
//          betterSleep's launch content is BASE: the archetype quiz and the
//          committed catalogue/article bundles under `content/sleep/`.
//   demo — the FICTIONAL demo articles, quiz and products (SVG placeholder
//          covers), created as draft (review H-9): a conscious /admin publish
//          away from any visitor. Create-only too: a re-run never resets
//          stock, prices, status or body text an admin changed; it only
//          recreates what was deleted.
// Usage: `pnpm seed:base`, `pnpm seed:demo`, or `pnpm db:seed` (= both).
import path from 'node:path';
import { loadRootEnv } from './env.ts';
import { resolveSiteConfig } from '../src/lib/config/index.ts';
import { createDb } from '../src/lib/db/client.ts';
import {
	seedArchetypeQuiz,
	seedDemoArticles,
	seedDemoProducts,
	seedDefaultPages,
	seedDemoQuiz,
	seedPillars,
	seedPlaceholderSettings
} from '../src/lib/db/seed.ts';
import {
	contentDirsFor,
	formatInitResult,
	importContentDirs
} from '../src/lib/modules/content/init.ts';
import { storageConfigFromEnv } from '../src/lib/modules/media/env.ts';
import { createStorage } from '../src/lib/modules/media/storage.ts';
import { seedNurtureSequences } from '../src/lib/modules/nurture/service.ts';

loadRootEnv();

const MODES = ['base', 'demo', 'all'] as const;
type Mode = (typeof MODES)[number];
const argv = process.argv.slice(2).filter((a) => a !== '--');
const mode = (argv[0] ?? 'all') as Mode;
if (!MODES.includes(mode)) {
	console.error(`Usage: node scripts/seed.ts [${MODES.join('|')}]`);
	process.exit(1);
}

const site = resolveSiteConfig(process.env.SITE_ID);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const db = createDb(databaseUrl);
// Both halves write images (demo covers, initial-content media) — needs the
// bucket, and under the `direct` provider its public-read policy.
const storage = createStorage(storageConfigFromEnv(process.env));
await storage.ensureBucket();
// Anonymous read is a MinIO-style bucket policy (dev bootstrap). Cloudflare R2
// has no bucket policies — public access is the custom-domain binding
// (DEPLOYMENT.md §5) — and refuses the call; that must not stop the seed.
try {
	await storage.allowPublicRead();
} catch (err) {
	console.warn(
		`Bucket policy not applied on "${storage.bucket}" (${err instanceof Error ? err.name : String(err)}): ` +
			'expected on Cloudflare R2, where public read is the custom-domain binding (DEPLOYMENT.md §5)'
	);
}

let failed = 0;

if (mode === 'base' || mode === 'all') {
	const count = await seedPillars(db, site.pillars);
	console.log(`Seeded ${count} pillar(s) for site "${site.id}"`);
	const pageCount = await seedDefaultPages(db);
	console.log(`Created ${pageCount} default page(s)`);
	const settingCount = await seedPlaceholderSettings(db);
	console.log(
		`Created ${settingCount} placeholder site setting(s) — replace them in /admin/settings`
	);
	// Upserts by key; a sequence deactivated in /admin/nurture stays deactivated.
	const nurtureCount = await seedNurtureSequences(db, site.nurture);
	console.log(`Seeded/updated ${nurtureCount} nurture sequence(s)`);
	// The archetype quiz IS launch content (BS-2): published on first seed,
	// never touched again (an operator's unpublish survives).
	const archetypeSlug = await seedArchetypeQuiz(db);
	console.log(`Ensured archetype quiz "/quiz/${archetypeSlug}"`);

	// Initial content after the pillars (a bundle whose pillars are all missing
	// is refused as invisible). Create-only: existing slugs are skipped.
	const contentBase =
		process.env.CONTENT_DIR ?? path.resolve(import.meta.dirname, '../../../content');
	const dirs = contentDirsFor(contentBase, site.id);
	const init = await importContentDirs({ db, storage }, dirs);
	if (init.dirs.length === 0) {
		console.log(`No initial content directories under ${contentBase} — skipped`);
	} else {
		console.log(
			`Initial content from ${init.dirs.map((d) => path.relative(contentBase, d) || '.').join(', ')}: ` +
				`${init.imported} imported, ${init.failed} failed`
		);
		for (const result of init.results) console.log(formatInitResult(result));
	}
	failed += init.failed;
}

if (mode === 'demo' || mode === 'all') {
	const articleCount = await seedDemoArticles(db);
	console.log(`Created ${articleCount} demo article(s) (draft — publish in /admin if wanted)`);
	const quizSlug = await seedDemoQuiz(db);
	console.log(`Ensured demo quiz "/quiz/${quizSlug}" (draft)`);
	const productCount = await seedDemoProducts(db, storage);
	console.log(
		`Created ${productCount} demo product(s) (draft — /magazin lists only the real catalogue)`
	);
}

await db.$client.end();
// A broken bundle must not pass silently as a successful seed.
if (failed > 0) process.exit(1);
