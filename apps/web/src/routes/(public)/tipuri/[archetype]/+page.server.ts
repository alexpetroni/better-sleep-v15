import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { listPublishedBySlugs } from '$lib/modules/blog/server';
import { imgSources } from '$lib/modules/media/server';
import { ARCHETYPE_ARTICLES, ARCHETYPE_PAGES_BY_SLUG } from '$lib/modules/quiz';
import { canonicalUrl } from '$lib/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const archetype = ARCHETYPE_PAGES_BY_SLUG.get(params.archetype);
	if (!archetype) error(404);

	// The archetype's curated reading list (seeded articles; whatever is
	// actually published renders — an unpublished slug just drops out).
	const rows = await listPublishedBySlugs({ db: getDb() }, ARCHETYPE_ARTICLES[archetype.id]);

	return {
		archetype,
		canonical: canonicalUrl(`/tipuri/${archetype.slug}`),
		articles: rows.map(({ article, cover }) => ({
			slug: article.slug,
			title: article.title,
			excerpt: article.excerpt,
			publishedAt: article.publishedAt,
			cover: cover?.key ? imgSources(cover, { w: 480, h: 300, fit: 'fill' }) : null
		}))
	};
};
