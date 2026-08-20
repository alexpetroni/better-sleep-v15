import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ARCHETYPE_ARTICLES } from './archetype-articles.ts';
import { ARCHETYPE_PAGES, ARCHETYPE_PAGES_BY_SLUG } from './archetype-pages.ts';
import { ARCHETYPE_IDS } from './patterns.ts';

const ROOT = path.resolve(import.meta.dirname, '../../../../../..');

/** Slugs of the generated article bundles in content/sleep (the seeded 40). */
function bundleArticleSlugs(): Set<string> {
	const dir = path.join(ROOT, 'content/sleep');
	const slugs = new Set<string>();
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json')) continue;
		const bundle = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as {
			type: string;
			article?: { slug: string; status: string };
		};
		if (bundle.type === 'article' && bundle.article?.status === 'published') {
			slugs.add(bundle.article.slug);
		}
	}
	return slugs;
}

describe('ARCHETYPE_ARTICLES', () => {
	it('maps every archetype to at least 3 distinct articles', () => {
		for (const id of ARCHETYPE_IDS) {
			const slugs = ARCHETYPE_ARTICLES[id];
			expect(slugs.length, id).toBeGreaterThanOrEqual(3);
			expect(new Set(slugs).size, `${id} has duplicate slugs`).toBe(slugs.length);
		}
	});

	it('only references slugs that exist as published content/sleep bundles', () => {
		const known = bundleArticleSlugs();
		expect(known.size).toBe(40);
		for (const id of ARCHETYPE_IDS) {
			for (const slug of ARCHETYPE_ARTICLES[id]) {
				expect(known.has(slug), `${id} -> "${slug}" is not a seeded article`).toBe(true);
			}
		}
	});
});

describe('ARCHETYPE_PAGES', () => {
	it('covers all nine archetypes with unique slugs and non-empty copy', () => {
		expect(ARCHETYPE_PAGES.map((p) => p.id).toSorted()).toEqual([...ARCHETYPE_IDS].toSorted());
		expect(new Set(ARCHETYPE_PAGES.map((p) => p.slug)).size).toBe(ARCHETYPE_PAGES.length);
		for (const page of ARCHETYPE_PAGES) {
			expect(page.name.length, page.slug).toBeGreaterThan(0);
			expect(page.essence.length, page.slug).toBeGreaterThan(0);
			expect(page.keyPhrase.length, page.slug).toBeGreaterThan(0);
			expect(page.intro.length, page.slug).toBeGreaterThanOrEqual(2);
			expect(page.avoid.length, page.slug).toBeGreaterThanOrEqual(3);
			expect(page.start.length, page.slug).toBeGreaterThanOrEqual(3);
			for (const text of [...page.intro, ...page.avoid, ...page.start]) {
				expect(text.trim().length, page.slug).toBeGreaterThan(0);
			}
		}
	});

	it('is indexed by slug', () => {
		expect(ARCHETYPE_PAGES_BY_SLUG.size).toBe(ARCHETYPE_PAGES.length);
		expect(ARCHETYPE_PAGES_BY_SLUG.get('ruminatorul')?.id).toBe('RU');
		expect(ARCHETYPE_PAGES_BY_SLUG.get('nope')).toBeUndefined();
	});
});
