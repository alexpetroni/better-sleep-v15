import { ARCHETYPE_PAGES, SLEEP_PATTERNS } from '$lib/modules/quiz';
import { NIGHT_MAP_SKUS } from '$lib/modules/shop';
import type { PageServerLoad } from './$types';

const ARCHETYPES_BY_ID = new Map(ARCHETYPE_PAGES.map((page) => [page.id, page]));

/**
 * The landing needs only static data: the deck's four block-3 patterns with
 * their archetype links into /tipuri (the many-to-many BS-2 mapping — this is
 * the intended public entry point to all nine archetype pages) and the
 * night map's per-segment SKUs (BS-6; night-map.spec pins every slug to a
 * committed product bundle). Site config arrives through the root layout load.
 */
export const load: PageServerLoad = () => ({
	nightMapSkus: NIGHT_MAP_SKUS,
	patterns: SLEEP_PATTERNS.map((pattern) => ({
		slug: pattern.slug,
		title: pattern.title,
		archetypes: pattern.archetypeIds.map((id) => {
			const archetype = ARCHETYPES_BY_ID.get(id);
			if (!archetype) throw new Error(`No archetype page for id "${id}"`);
			return { name: archetype.name, slug: archetype.slug };
		})
	}))
});
