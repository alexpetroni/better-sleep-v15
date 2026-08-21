// Regenerates the 40 article content bundles in `content/sleep/` from the
// vendored sources in `.initialData/`. Deterministic and rerunnable — run it
// after editing an article body or `scripts/article-meta.ro.json`:
//
//   pnpm --filter web articles:from-initialdata
//
// Sources (see docs/phases/BS-4-ARTICLES.md):
// - `.initialData/articles/NN-<slug>.md` — the Romanian bodies. NO
//   frontmatter: line 1 is the `# H1` (the article title), the rest is bodyMd.
// - `.initialData/topics.json` — `slug` is authoritative; `title`/`excerpt`
//   are ENGLISH working copy and must NEVER reach a bundle.
// - `scripts/article-meta.ro.json` — the committed Romanian editorial pass:
//   excerpt + seoTitle + seoDescription per slug.
//
// The script fails loudly on any gap: a topic without a file, a file without
// a topic, a slug without meta, an empty/overlong meta field, or meta text
// that duplicates the English topics.json copy.
import { mkdir, readdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_BUNDLE_VERSION, type ContentBundle } from '../src/lib/modules/content/bundle.ts';
import { findEnglishSentence } from '../src/lib/modules/content/english-leak.ts';
import {
	GENERATED_MANIFEST_NAME,
	parseGeneratedManifest,
	serializeGeneratedManifest,
	staleGeneratedFiles,
	updateGeneratedManifest
} from '../src/lib/modules/content/generated-manifest.ts';
import { writeFileAtomic } from './atomic-write.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const ARTICLES_DIR = path.join(ROOT, '.initialData/articles');
const TOPICS_FILE = path.join(ROOT, '.initialData/topics.json');
const META_FILE = path.resolve(import.meta.dirname, 'article-meta.ro.json');
const OUT_DIR = path.join(ROOT, 'content/sleep');

/** Newest article's publish date; earlier ids step back 2 days per id. */
const PUBLISHED_ANCHOR_MS = Date.parse('2026-08-18T08:00:00.000Z');
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

interface Topic {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	theme: string;
}

interface ArticleMeta {
	excerpt: string;
	seoTitle: string;
	seoDescription: string;
}

function fail(message: string): never {
	console.error(`articles-from-initialdata: ${message}`);
	process.exit(1);
}

const topics = JSON.parse(await readFile(TOPICS_FILE, 'utf8')) as Topic[];
if (!Array.isArray(topics) || topics.length !== 40) {
	fail(`expected 40 topics in topics.json, found ${Array.isArray(topics) ? topics.length : 0}`);
}
if (new Set(topics.map((t) => t.slug)).size !== topics.length) {
	fail('duplicate slugs in topics.json');
}

const meta = JSON.parse(await readFile(META_FILE, 'utf8')) as Record<string, ArticleMeta>;
const unusedMeta = new Set(Object.keys(meta));

const mdFiles = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));
if (mdFiles.length !== topics.length) {
	fail(`expected ${topics.length} article files, found ${mdFiles.length}`);
}

// Character counts (code points, not UTF-16 units — Romanian diacritics are
// one code point each, so [...s].length is the honest length).
function len(s: string): number {
	return [...s].length;
}

function checkMetaField(slug: string, field: keyof ArticleMeta, value: string, max?: number): void {
	if (typeof value !== 'string' || value.trim().length === 0) {
		fail(`"${slug}": meta field "${field}" is missing or empty`);
	}
	if (max !== undefined && len(value) > max) {
		fail(`"${slug}": meta field "${field}" is ${len(value)} chars (max ${max})`);
	}
}

const bundles: Array<{ filename: string; bundle: ContentBundle }> = [];

for (const topic of topics.toSorted((a, b) => a.id - b.id)) {
	const prefix = String(topic.id).padStart(2, '0');
	const mdName = `${prefix}-${topic.slug}.md`;
	if (!mdFiles.includes(mdName)) fail(`topic ${topic.id} "${topic.slug}": no file ${mdName}`);

	const raw = await readFile(path.join(ARTICLES_DIR, mdName), 'utf8');
	const lines = raw.split('\n');
	if (!lines[0]?.startsWith('# ')) {
		fail(`${mdName}: line 1 is not a "# " H1 (these files have no frontmatter)`);
	}
	const title = lines[0].slice(2).trim();
	if (!title) fail(`${mdName}: empty H1 title`);
	const bodyMd = lines.slice(1).join('\n').trim() + '\n';
	if (bodyMd.trim().length === 0) fail(`${mdName}: empty body`);

	const m = meta[topic.slug];
	if (!m) fail(`"${topic.slug}": no entry in article-meta.ro.json`);
	unusedMeta.delete(topic.slug);
	checkMetaField(topic.slug, 'excerpt', m.excerpt);
	checkMetaField(topic.slug, 'seoTitle', m.seoTitle, SEO_TITLE_MAX);
	checkMetaField(topic.slug, 'seoDescription', m.seoDescription, SEO_DESCRIPTION_MAX);

	// The English topics.json title/excerpt must never leak into a bundle.
	for (const [field, value] of [
		['title', title],
		['excerpt', m.excerpt],
		['seoTitle', m.seoTitle],
		['seoDescription', m.seoDescription]
	] as const) {
		if (value === topic.title || value === topic.excerpt) {
			fail(`"${topic.slug}": ${field} equals the ENGLISH topics.json copy`);
		}
	}

	// Heuristic backstop (L-12): a LIFTED English sentence — not just a
	// verbatim topics.json copy — must not ship either.
	for (const [field, value] of [
		['title', title],
		['excerpt', m.excerpt],
		['seoTitle', m.seoTitle],
		['seoDescription', m.seoDescription],
		['bodyMd', bodyMd]
	] as const) {
		const english = findEnglishSentence(value);
		if (english) fail(`"${topic.slug}": ${field} contains an English sentence: "${english}"`);
	}

	const publishedAt = new Date(
		PUBLISHED_ANCHOR_MS - (topics.length - topic.id) * TWO_DAYS_MS
	).toISOString();

	bundles.push({
		filename: `${String(topic.id * 10).padStart(4, '0')}-${topic.slug}.json`,
		bundle: {
			version: CONTENT_BUNDLE_VERSION,
			type: 'article',
			pillars: ['somn'],
			media: [],
			article: {
				slug: topic.slug,
				// Stable import identity (M-7): a slug edit in topics.json then
				// RENAMES the seeded row instead of orphaning the old slug.
				importKey: `topic-${topic.id}`,
				title,
				excerpt: m.excerpt,
				bodyMd,
				coverMediaId: null,
				status: 'published',
				publishedAt,
				seoTitle: m.seoTitle,
				seoDescription: m.seoDescription
			}
		}
	});
}

if (unusedMeta.size > 0) {
	fail(`article-meta.ro.json has entries for unknown slugs: ${[...unusedMeta].join(', ')}`);
}

await mkdir(OUT_DIR, { recursive: true });

// Drop stale generated article bundles (a renamed slug would otherwise leave
// its old file behind and re-import under the dead slug). Only files a
// PREVIOUS run recorded in the manifest may be deleted — hand-authored
// bundles in the same directory are never ours to touch (M-9).
const manifestPath = path.join(OUT_DIR, GENERATED_MANIFEST_NAME);
const manifest = parseGeneratedManifest(
	await readFile(manifestPath, 'utf8')
		.then((raw) => JSON.parse(raw) as unknown)
		.catch(() => null)
);
const filenames = bundles.map((b) => b.filename);
for (const stale of staleGeneratedFiles(manifest, 'article', filenames, await readdir(OUT_DIR))) {
	await unlink(path.join(OUT_DIR, stale));
	console.log(`Removed stale ${stale}`);
}

for (const { filename, bundle } of bundles) {
	await writeFileAtomic(path.join(OUT_DIR, filename), JSON.stringify(bundle, null, '\t') + '\n');
}
await writeFileAtomic(
	manifestPath,
	serializeGeneratedManifest(updateGeneratedManifest(manifest, 'article', filenames))
);
console.log(`Wrote ${bundles.length} article bundle(s) to ${OUT_DIR}`);
