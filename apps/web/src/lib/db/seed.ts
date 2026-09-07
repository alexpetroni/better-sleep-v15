import { and, eq, inArray } from 'drizzle-orm';
import { PILLARS_BY_SLUG } from '../config/pillars.ts';
import { articlePillars, articles } from '../modules/blog/schema.ts';
import { media } from '../modules/media/schema.ts';
import { finalizeMediaObject } from '../server/media-objects.ts';
import { DEFAULT_PAGES } from '../modules/pages/seed-pages.ts';
import { ensurePage } from '../modules/pages/service.ts';
import type { Storage } from '../modules/media/storage.ts';
import type { FormConfig } from 'formcomp';
import { quizzes } from '../modules/quiz/schema.ts';
import type { ScoringConfig } from '../modules/quiz/scoring.ts';
import { ARCHETYPE_QUIZ_SEED } from '../modules/quiz/seed-archetype-quiz.ts';
import { SLEEP_QUIZ_SEED } from '../modules/quiz/seed-quiz.ts';
import { validateForPublish } from '../modules/quiz/validate.ts';
import {
	SETTINGS_REGISTRY,
	settingKeys,
	type SettingKey,
	type SettingSpec
} from '../modules/settings/registry.ts';
import { siteSettings } from '../modules/settings/schema.ts';
import { productPillars, products } from '../modules/shop/schema.ts';
import { DEMO_PRODUCTS } from '../modules/shop/seed-products.ts';
import type { Db } from './client.ts';
import { pillars } from './schema/core.ts';

/**
 * Upsert the given pillar slugs (in order) from the canonical definitions.
 * Idempotent: re-running updates rows in place and never duplicates.
 */
export async function seedPillars(db: Db, pillarSlugs: string[]): Promise<number> {
	let count = 0;
	for (const [index, slug] of pillarSlugs.entries()) {
		const def = PILLARS_BY_SLUG.get(slug);
		if (!def) throw new Error(`Cannot seed unknown pillar slug "${slug}"`);
		await db
			.insert(pillars)
			.values({ slug: def.slug, name: def.name, description: def.description, sort: index })
			.onConflictDoUpdate({
				target: pillars.slug,
				set: { name: def.name, description: def.description, sort: index }
			});
		count++;
	}
	return count;
}

/**
 * Three demo articles (ro), tagged to the `somn` pillar, so dev environments
 * always have demo blog content. DRAFT unless the caller (the e2e setup) asks
 * for `published` — fictional demo content must never be live in production
 * by default (review H-9). Fixed ids; created only when the slug is missing
 * (FIX-15), so a re-seed never overwrites the status an operator chose.
 */
const DEMO_ARTICLES = [
	{
		id: 'seed-article-cicluri-somn',
		slug: 'ciclurile-somnului-explicate',
		title: 'Ciclurile somnului, explicate simplu',
		excerpt:
			'Ce se întâmplă în creierul tău în fiecare noapte și de ce contează fiecare fază a somnului.',
		bodyMd:
			'Somnul nu este o stare uniformă: în fiecare noapte treci prin **4–6 cicluri** de aproximativ 90 de minute.\n\n## Fazele unui ciclu\n\n- **Somn ușor** — tranziția către odihnă, ușor de întrerupt.\n- **Somn profund** — refacerea fizică; aici corpul repară țesuturi.\n- **Somn REM** — visele și consolidarea memoriei.\n\nTrezirile scurte între cicluri sunt normale. Contează ca ele să rămână scurte.\n',
		// 07:45, not 08:00 — the oldest generated bundle (0010) publishes at
		// 08:00Z the same day, and a timestamp tie made the archive's tail order
		// per-database luck (review L-11).
		publishedAt: new Date('2026-06-01T07:45:00Z')
	},
	{
		id: 'seed-article-igiena-somnului',
		slug: 'igiena-somnului-7-reguli',
		title: 'Igiena somnului: 7 reguli care chiar funcționează',
		excerpt:
			'Obiceiuri mici, susținute de studii, care îți îmbunătățesc somnul în câteva săptămâni.',
		bodyMd:
			'Nu ai nevoie de gadgeturi scumpe ca să dormi mai bine. Începe cu aceste reguli:\n\n1. Oră fixă de culcare și de trezire, inclusiv în weekend.\n2. Dormitor răcoros (18–20 °C), întunecat și liniștit.\n3. Fără cafeină după ora 14:00.\n4. Fără ecrane cu o oră înainte de culcare.\n5. Lumină naturală dimineața, în primele 30 de minute.\n6. Mișcare zilnică, dar nu chiar înainte de somn.\n7. Patul doar pentru somn — nu pentru lucru sau scroll.\n\n> Consecvența bate perfecțiunea: alege două reguli și ține-te de ele două săptămâni.\n',
		publishedAt: new Date('2026-06-10T08:00:00Z')
	},
	{
		id: 'seed-article-melatonina',
		slug: 'melatonina-si-lumina-albastra',
		title: 'Melatonina și lumina albastră: ce spune știința',
		excerpt:
			'Cum îți reglează lumina hormonul somnului și ce poți face seara ca să adormi mai ușor.',
		bodyMd:
			'**Melatonina** este semnalul biochimic al întunericului: creierul o secretă seara, când lumina scade.\n\nEcranele și becurile puternice — în special componenta lor **albastră** — întârzie această secreție și împing ora la care poți adormi.\n\n## Ce poți face\n\n- Redu intensitatea luminii în casă cu 1–2 ore înainte de culcare.\n- Activează filtrul de lumină caldă pe telefon după apus.\n- Dimineața, expune-te la lumină naturală: resetează ceasul intern.\n',
		publishedAt: new Date('2026-06-20T08:00:00Z')
	}
];

interface QuizSeed {
	id: string;
	slug: string;
	title: string;
	introMd: string;
	pillarSlug: string;
	resultTemplateKey: string;
	formSchema: FormConfig;
	scoring: ScoringConfig;
}

/**
 * Create one seed quiz (fixed id, create-only by slug — FIX-15): a re-run
 * never touches an existing row, so an admin's edits or the publish state an
 * operator chose in /admin/quizzes survive a re-seed (review H-9).
 */
async function upsertSeedQuiz(
	db: Db,
	seed: QuizSeed,
	status: 'draft' | 'published'
): Promise<string> {
	const errors = validateForPublish(seed.formSchema, seed.scoring);
	if (errors.length) {
		throw new Error(`Seed quiz "${seed.slug}" is not publishable: ${errors.join(' ')}`);
	}
	const [pillar] = await db.select().from(pillars).where(eq(pillars.slug, seed.pillarSlug));
	if (!pillar) {
		throw new Error(`Cannot seed quiz "${seed.slug}": pillar "${seed.pillarSlug}" is not seeded`);
	}
	const { id, slug, title, introMd, resultTemplateKey, formSchema, scoring } = seed;
	const values = {
		slug,
		title,
		introMd,
		resultTemplateKey,
		formSchema,
		scoring,
		pillarId: pillar.id
	};
	await db
		.insert(quizzes)
		.values({ id, ...values, status })
		.onConflictDoNothing({ target: quizzes.slug });
	return seed.slug;
}

/**
 * The demo-able sleep screening quiz, tagged `somn`. DRAFT unless the caller
 * (the e2e setup) asks for `published` — it is demo copy, not reviewed launch
 * content (review H-9). Create-only (FIX-15): fixed id, never touches an
 * existing row.
 */
export async function seedDemoQuiz(
	db: Db,
	opts: { status?: 'draft' | 'published' } = {}
): Promise<string> {
	return upsertSeedQuiz(db, SLEEP_QUIZ_SEED, opts.status ?? 'draft');
}

/**
 * The archetype quiz `/quiz/arhetip-somn` — the site's central conversion
 * device (12 questions, archetype scoring mode), published on first seed: it
 * IS launch content, not demo content. Idempotent like the demo quiz.
 */
export async function seedArchetypeQuiz(db: Db): Promise<string> {
	return upsertSeedQuiz(db, ARCHETYPE_QUIZ_SEED, 'published');
}

/**
 * Three FICTIONAL demo products (ro), tagged `somn`, with SVG placeholder
 * images uploaded to storage. DRAFT unless the caller (the e2e setup) asks
 * for `active` — a customer must never be able to pay for a product that
 * does not exist, and a re-seed never reverts an operator's archive
 * (review H-9). Idempotent: fixed media/product ids + fixed storage keys +
 * upsert-by-slug; re-running never duplicates.
 */
export async function seedDemoProducts(
	db: Db,
	storage: Storage,
	opts: { status?: 'draft' | 'active' } = {}
): Promise<number> {
	const [somn] = await db.select().from(pillars).where(eq(pillars.slug, 'somn'));
	if (!somn) throw new Error('Cannot seed demo products: the "somn" pillar is not seeded');

	let created = 0;
	for (const demo of DEMO_PRODUCTS) {
		for (const image of [demo.cover, ...demo.gallery]) {
			const bytes = Buffer.from(image.svg, 'utf8');
			const [existing] = await db
				.select({ id: media.id })
				.from(media)
				.where(eq(media.id, image.id));
			if (existing) continue;
			// Same finalize step as an upload: sanitized, attachment, immutable (FIX-15).
			await finalizeMediaObject(storage, image.key, 'image/svg+xml', { bytes });
			await db
				.insert(media)
				.values({
					id: image.id,
					kind: 'image',
					key: image.key,
					filename: image.filename,
					mime: 'image/svg+xml',
					size: bytes.byteLength,
					width: image.width,
					height: image.height,
					alt: image.alt
				})
				.onConflictDoNothing({ target: media.id });
		}

		const values = {
			slug: demo.slug,
			name: demo.name,
			descriptionMd: demo.descriptionMd,
			priceCents: demo.priceCents,
			stock: demo.stock,
			coverMediaId: demo.cover.id,
			gallery: demo.gallery.map((g) => g.id)
		};
		// `status` only on INSERT — the conflict set must not revert an
		// operator's archive/draft decision on re-seed (review H-9).
		const [row] = await db
			.insert(products)
			.values({ id: demo.id, ...values, status: opts.status ?? 'draft' })
			.onConflictDoNothing({ target: products.slug })
			.returning({ id: products.id });
		if (!row) continue;
		created++;
		await db
			.insert(productPillars)
			.values({ productId: row.id, pillarId: somn.id })
			.onConflictDoNothing();
	}
	return created;
}

/**
 * Create-only (FIX-15), like `ensurePage`: an article whose slug exists is
 * left exactly as the admin last saved it. Returns the number created.
 */
export async function seedDemoArticles(
	db: Db,
	opts: { status?: 'draft' | 'published' } = {}
): Promise<number> {
	const [somn] = await db.select().from(pillars).where(eq(pillars.slug, 'somn'));
	if (!somn) throw new Error('Cannot seed demo articles: the "somn" pillar is not seeded');

	let created = 0;
	for (const demo of DEMO_ARTICLES) {
		const { id, ...content } = demo;
		// `status` only on INSERT — a re-seed must not force-republish an
		// article an operator unpublished (review H-9).
		const [row] = await db
			.insert(articles)
			.values({ id, ...content, status: opts.status ?? 'draft' })
			.onConflictDoNothing({ target: articles.slug })
			.returning({ id: articles.id });
		if (!row) continue;
		created++;
		await db
			.insert(articlePillars)
			.values({ articleId: row.id, pillarId: somn.id })
			.onConflictDoNothing();
	}
	return created;
}

/**
 * Placeholder rows for the site settings that declare one (launch-required
 * text keys), clearly marked `PLACEHOLDER — …` so `pnpm launch:check` refuses
 * to launch while they stand. Created only when missing — re-seeding never
 * overwrites values edited in /admin/settings.
 */
export async function seedPlaceholderSettings(db: Db): Promise<number> {
	const values = settingKeys()
		.map((key) => ({ key, placeholder: (SETTINGS_REGISTRY[key] as SettingSpec).placeholder }))
		.filter((entry): entry is { key: SettingKey; placeholder: string } =>
			Boolean(entry.placeholder)
		)
		.map((entry) => ({ key: entry.key, value: entry.placeholder }));
	const inserted = await db
		.insert(siteSettings)
		.values(values)
		.onConflictDoNothing({ target: siteSettings.key })
		.returning({ key: siteSettings.key });
	return inserted.length;
}

/**
 * The launch preflight's demo-content rule (`pnpm launch:check`, review H-9):
 * none of the FICTIONAL demo rows this file seeds may be live in a production
 * database — a customer could pay real money for a product that does not
 * exist. The id lists are the same constants the seeding above uses, so a new
 * demo row is covered the day it is added. The archetype quiz is deliberately
 * NOT here: it is launch content and must be published.
 */
export async function seededDemoLaunchProblems(db: Db): Promise<string[]> {
	const problems: string[] = [];

	const activeProducts = await db
		.select({ id: products.id, slug: products.slug })
		.from(products)
		.where(
			and(
				inArray(
					products.id,
					DEMO_PRODUCTS.map((p) => p.id)
				),
				eq(products.status, 'active')
			)
		);
	for (const row of activeProducts) {
		problems.push(
			`demo product "${row.slug}" (${row.id}) is still active in the catalogue — archive or delete it in /admin/products`
		);
	}

	const publishedArticles = await db
		.select({ id: articles.id, slug: articles.slug })
		.from(articles)
		.where(
			and(
				inArray(
					articles.id,
					DEMO_ARTICLES.map((a) => a.id)
				),
				eq(articles.status, 'published')
			)
		);
	for (const row of publishedArticles) {
		problems.push(
			`demo article "${row.slug}" (${row.id}) is still published — unpublish or delete it in /admin/articles`
		);
	}

	const [demoQuiz] = await db
		.select({ id: quizzes.id, slug: quizzes.slug })
		.from(quizzes)
		.where(and(eq(quizzes.id, SLEEP_QUIZ_SEED.id), eq(quizzes.status, 'published')));
	if (demoQuiz) {
		problems.push(
			`demo quiz "${demoQuiz.slug}" (${demoQuiz.id}) is still published — unpublish it in /admin/quizzes (the archetype quiz is the launch quiz)`
		);
	}

	return problems;
}

/**
 * Default legal pages (privacy, terms). Created only when missing — re-seeding
 * never overwrites copy edited in /admin/pages.
 */
export async function seedDefaultPages(db: Db): Promise<number> {
	let created = 0;
	for (const page of DEFAULT_PAGES) {
		if ((await ensurePage({ db }, page)) === 'created') created++;
	}
	return created;
}
