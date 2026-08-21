import { describe, expect, it, vi } from 'vitest';

// L-8: /blog?page=99 must 404, not render a 200 soft-404 with "no articles
// yet" copy and a canonical to itself. Unit scope — listPublished is stubbed
// (its pagination arithmetic has its own specs; the real 40-article corpus is
// pinned in sleep-content.spec.ts).

const TOTAL = 40;
const PAGE_SIZE = 9;
const PAGE_COUNT = Math.ceil(TOTAL / PAGE_SIZE);

vi.mock('$lib/db', () => ({ getDb: () => ({}) }));
vi.mock('$lib/server/site', () => ({ getSite: () => ({ pillars: ['somn'] }) }));
vi.mock('$lib/modules/media/server', () => ({ imgSources: () => null }));
vi.mock('$lib/modules/blog/server', () => ({
	listPublished: async (_deps: unknown, opts: { page?: number }) => {
		const page = Math.max(1, opts.page ?? 1);
		const onPage = page <= PAGE_COUNT ? Math.min(PAGE_SIZE, TOTAL - (page - 1) * PAGE_SIZE) : 0;
		return {
			items: Array.from({ length: onPage }, (_, i) => ({
				article: {
					slug: `articol-${(page - 1) * PAGE_SIZE + i}`,
					title: 'T',
					excerpt: 'E',
					publishedAt: null
				},
				cover: null
			})),
			total: TOTAL,
			page,
			pageSize: PAGE_SIZE,
			pageCount: PAGE_COUNT
		};
	}
}));
const { load } = await import('./+page.server.ts');

function loadPage(page?: number) {
	const url = new URL(`https://example.ro/blog${page ? `?page=${page}` : ''}`);
	return load({ url } as never) as Promise<{ cards: unknown[]; page: number; pageCount: number }>;
}

describe('blog +page.server load pagination (L-8)', () => {
	it('serves real pages 1..pageCount', async () => {
		expect((await loadPage()).cards).toHaveLength(PAGE_SIZE);
		const last = await loadPage(PAGE_COUNT);
		expect(last.cards.length).toBeGreaterThan(0);
		expect(last.pageCount).toBe(PAGE_COUNT);
	});

	it('a page past the archive is a 404, not a soft-404 (pre-fix: 200 + empty grid)', async () => {
		await expect(loadPage(PAGE_COUNT + 1)).rejects.toMatchObject({ status: 404 });
		await expect(loadPage(99)).rejects.toMatchObject({ status: 404 });
	});
});
