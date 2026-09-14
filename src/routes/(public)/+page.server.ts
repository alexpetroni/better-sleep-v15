import { getDb } from '$lib/db';
import { ARCHETYPE_PAGES, SLEEP_PATTERNS } from '$lib/modules/quiz';
import { activeNightMapSkus } from '$lib/modules/shop/server';
import { getSite } from '$lib/server/site';
import type { PageServerLoad } from './$types';

const ARCHETYPES_BY_ID = new Map(ARCHETYPE_PAGES.map((page) => [page.id, page]));

/**
 * The deck's four block-3 patterns with their archetype links into /tipuri
 * (the many-to-many BS-2 mapping — this is the intended public entry point to
 * all nine archetype pages) plus the night map's per-segment SKUs. The SKUs
 * are filtered against the LIVE catalogue (review M-5): night-map.spec pins
 * every slug to a committed bundle, but an admin rename/archive drifts the
 * database from the bundles — the one query here drops such chips instead of
 * shipping dead /magazin links. Site config arrives through the root layout.
 */
export const load: PageServerLoad = async () => ({
	nightMapSkus: await activeNightMapSkus({ db: getDb() }, getSite().pillars),
	patterns: SLEEP_PATTERNS.map((pattern) => ({
		// Card copy (incl. the title) is Paraglide keyed on this literal slug —
		// see LandingPatterns' compile-checked copy map (M-14).
		slug: pattern.slug,
		archetypes: pattern.archetypeIds.map((id) => {
			const archetype = ARCHETYPES_BY_ID.get(id);
			if (!archetype) throw new Error(`No archetype page for id "${id}"`);
			return { name: archetype.name, slug: archetype.slug };
		})
	}))
});
