/**
 * The deck's block-6 loop, closed (BS-6): which catalogue SKUs support each
 * segment of the 23:00→07:00 night map. Pure data for the landing's
 * `LandingNightMap` seam — each named SKU links to its `/magazin/[slug]` page.
 *
 * Assignment follows the actual ingredients, not marketing categories:
 * - ADORMIREA — the falling-asleep signal: melatonin (the start signal
 *   itself) and glycine (drops core temperature before sleep onset).
 * - SOMNUL PROFUND — physical repair: highly bioavailable magnesium aimed at
 *   the nervous system (bisglycinate; treonate crosses into the brain).
 * - FEREASTRA FRAGILĂ — the 02:00–05:00 cortisol/glycemia window: magnesium
 *   with B6 (PentaMag), taurate (stabilises the cardiovascular response) and
 *   GABA (the inhibitory brake when arousal breaks through).
 * - REM — emotional processing late in the night: L-theanine (calm without
 *   sedation) and ashwagandha (cortisol regulation across the night).
 *
 * `label` is the SKU name without its pack-size suffix; `night-map.spec.ts`
 * checks every entry against the committed product bundles, so a renamed or
 * removed product fails the suite instead of shipping a dead link.
 */

export const NIGHT_SEGMENT_KEYS = [
	'adormirea',
	'somn-profund',
	'fereastra-fragila',
	'rem'
] as const;

export type NightSegmentKey = (typeof NIGHT_SEGMENT_KEYS)[number];

export interface NightMapSku {
	/** `products.slug` of a seeded catalogue product (→ /magazin/[slug]). */
	slug: string;
	/** The product name minus the ", N capsule/plicuri" pack suffix. */
	label: string;
}

/**
 * Keep only the SKUs whose slug is in `activeSlugs`, preserving segment and
 * chip order (review M-5). Pure — the landing load feeds it the result of one
 * `status='active'` catalogue query, so an admin rename or archive drops the
 * chip instead of shipping a dead /magazin link; segments simply render fewer
 * (possibly zero) chips.
 */
export function filterNightMapSkus(
	activeSlugs: ReadonlySet<string>
): Record<NightSegmentKey, NightMapSku[]> {
	const filtered = {} as Record<NightSegmentKey, NightMapSku[]>;
	for (const key of NIGHT_SEGMENT_KEYS) {
		filtered[key] = NIGHT_MAP_SKUS[key].filter((sku) => activeSlugs.has(sku.slug));
	}
	return filtered;
}

export const NIGHT_MAP_SKUS: Record<NightSegmentKey, NightMapSku[]> = {
	adormirea: [
		{ slug: 'melatonin-3-mg', label: 'Melatonină 3 mg' },
		{ slug: 'glicina-1000-mg-60-capsule', label: 'Glicină 1000 mg' },
		{ slug: 'melatonin-forte-10-mg', label: 'Melatonină Forte 10 mg' }
	],
	'somn-profund': [
		{ slug: 'magnesium-bisglycinate-90-capsule', label: 'Magneziu Bisglicinat 1000 mg' },
		{ slug: 'magtein-magneziu-treonat-90-capsule', label: 'Magneziu Treonat Magtein®' },
		{ slug: 'magnesium-bisglycinate-optimum-60-cps', label: 'Magneziu Bisglicinat Optimum 900 mg' }
	],
	'fereastra-fragila': [
		{ slug: 'pentamag-90-capsule', label: 'PentaMag' },
		{ slug: 'magnesium-taurate', label: 'Magneziu Taurat 1000 mg' },
		{ slug: 'gaba-750-mg', label: 'GABA 750 mg' }
	],
	rem: [
		{ slug: 'l-theanine-100-mg', label: 'L-Teanină 100 mg' },
		{ slug: 'ashwagandha-ksm-66-forte', label: 'Ashwagandha KSM-66 Forte 500 mg' }
	]
};
