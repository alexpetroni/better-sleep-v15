// Regenerates the 33 product content bundles in `content/sleep/` from the
// vendored Zenyth capture in `.initialData/`. Deterministic and rerunnable —
// run it after editing `scripts/product-descriptions.ro.json`:
//
//   pnpm --filter web products:from-initialdata
//
// Sources (see docs/phases/BS-6-PRODUCTS.md):
// - `.initialData/zenyth-products.json` — 33 real products with real integer
//   lei prices, captured at planning time. The slug is the last URL segment;
//   name and price are used as captured. The `blurb` is working copy (some of
//   it auto-translated English) and must NEVER reach a bundle.
// - `scripts/product-descriptions.ro.json` — the committed Romanian editorial
//   pass: a fresh 2–4 sentence `description` per slug, written from
//   name+blurb. The script appends a "Sursă preț" line citing the captured
//   URL and date.
//
// Bundles are numbered 1010… so they sort AFTER the article bundles
// (0010…0400) and `content:init` imports articles-then-products. The script
// fails loudly on any gap: slug mismatch, missing/empty/overlong description,
// a description that copies the captured blurb, or a non-integer price.
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_BUNDLE_VERSION, type ContentBundle } from '../src/lib/modules/content/bundle.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const PRODUCTS_FILE = path.join(ROOT, '.initialData/zenyth-products.json');
const DESCRIPTIONS_FILE = path.resolve(import.meta.dirname, 'product-descriptions.ro.json');
const OUT_DIR = path.join(ROOT, 'content/sleep');

const EXPECTED_PRODUCTS = 33;
/** Arbitrary test stock until a real supplier relationship fixes numbers. */
const SEED_STOCK = 25;
/** First bundle number — after the 0010…0400 article bundles. */
const NUMBER_BASE = 1010;

interface CapturedProduct {
	name: string;
	priceLei: number;
	url: string;
	blurb: string;
}

interface Capture {
	source: string;
	capturedAt: string;
	products: CapturedProduct[];
}

function fail(message: string): never {
	console.error(`products-from-initialdata: ${message}`);
	process.exit(1);
}

const capture = JSON.parse(await readFile(PRODUCTS_FILE, 'utf8')) as Capture;
if (!Array.isArray(capture.products) || capture.products.length !== EXPECTED_PRODUCTS) {
	fail(`expected ${EXPECTED_PRODUCTS} products, found ${capture.products?.length ?? 0}`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(capture.capturedAt)) {
	fail(`capturedAt "${capture.capturedAt}" is not an ISO date`);
}

const descriptions = JSON.parse(await readFile(DESCRIPTIONS_FILE, 'utf8')) as Record<
	string,
	{ description: string }
>;
const unusedDescriptions = new Set(Object.keys(descriptions));

/** Slug = last non-empty URL path segment (the capture note's rule). */
function slugFromUrl(url: string): string {
	const segment = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
	if (!/^[a-z0-9-]+$/.test(segment)) fail(`"${url}": cannot derive a slug`);
	return segment;
}

const bundles: Array<{ filename: string; bundle: ContentBundle }> = [];
const seenSlugs = new Set<string>();

capture.products.forEach((product, index) => {
	const slug = slugFromUrl(product.url);
	if (seenSlugs.has(slug)) fail(`duplicate slug "${slug}"`);
	seenSlugs.add(slug);

	if (!product.name?.trim()) fail(`"${slug}": empty name`);
	if (!Number.isInteger(product.priceLei) || product.priceLei <= 0) {
		fail(`"${slug}": priceLei must be a positive integer, got ${product.priceLei}`);
	}

	const entry = descriptions[slug];
	if (!entry?.description?.trim()) {
		fail(`"${slug}": no description in product-descriptions.ro.json`);
	}
	unusedDescriptions.delete(slug);
	const description = entry.description.trim();
	// Code points, not UTF-16 units — diacritics count as one character.
	const length = [...description].length;
	if (length < 80 || length > 700) {
		fail(`"${slug}": description is ${length} chars (expected 80–700, ~2–4 sentences)`);
	}
	// The captured blurb (partly auto-translated English) must never ship.
	if (product.blurb.trim() && description.includes(product.blurb.trim())) {
		fail(`"${slug}": description copies the captured blurb — write fresh Romanian copy`);
	}

	const descriptionMd = `${description}\n\nSursă preț: [zenyth.ro](${product.url}), ${capture.capturedAt}\n`;

	bundles.push({
		filename: `${NUMBER_BASE + index * 10}-${slug}.json`,
		bundle: {
			version: CONTENT_BUNDLE_VERSION,
			type: 'product',
			pillars: ['somn'],
			media: [],
			product: {
				slug,
				// Stable import identity (M-7), pinned to the captured URL's last
				// segment — survives a future editorial slug override.
				importKey: `zenyth-${slug}`,
				name: product.name,
				descriptionMd,
				// Integer bani; lowercase 'ron' is the schema default and what
				// Stripe expects as a currency code.
				priceCents: product.priceLei * 100,
				currency: 'ron',
				status: 'active',
				coverMediaId: null,
				gallery: [],
				stock: SEED_STOCK
			}
		}
	});
});

if (unusedDescriptions.size > 0) {
	fail(
		`product-descriptions.ro.json has entries for unknown slugs: ${[...unusedDescriptions].join(', ')}`
	);
}

await mkdir(OUT_DIR, { recursive: true });

// Drop stale generated product bundles (a renamed slug would otherwise leave
// its old file behind and re-import under the dead slug).
const keep = new Set(bundles.map((b) => b.filename));
for (const existing of await readdir(OUT_DIR)) {
	if (!/^\d{4}-.+\.json$/.test(existing) || keep.has(existing)) continue;
	const parsed = JSON.parse(await readFile(path.join(OUT_DIR, existing), 'utf8')) as {
		type?: string;
	};
	if (parsed.type !== 'product') continue;
	await unlink(path.join(OUT_DIR, existing));
	console.log(`Removed stale ${existing}`);
}

for (const { filename, bundle } of bundles) {
	await writeFile(path.join(OUT_DIR, filename), JSON.stringify(bundle, null, '\t') + '\n', 'utf8');
}
console.log(`Wrote ${bundles.length} product bundle(s) to ${OUT_DIR}`);
