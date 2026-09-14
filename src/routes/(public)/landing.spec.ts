import { describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/ro.json';
import pinnedLandingCopy from './landing-copy.pinned.json';
import { ARCHETYPE_PAGES, SLEEP_PATTERNS } from '../../lib/modules/quiz/index.ts';
import {
	filterNightMapSkus,
	NIGHT_MAP_SKUS,
	NIGHT_SEGMENT_KEYS
} from '../../lib/modules/shop/index.ts';

// M-5: the load filters night-map slugs against the live catalogue. Unit
// scope here — the DB-backed query is stubbed to "everything active except
// one archived SKU"; the real query is covered in shop.spec.ts and the
// seeded-DB invariant (all 11 slugs active) in sleep-content.spec.ts.
const INACTIVE_SLUG = 'gaba-750-mg';
vi.mock('$lib/db', () => ({ getDb: () => ({}) }));
vi.mock('$lib/server/site', () => ({ getSite: () => ({ pillars: ['somn'] }) }));
vi.mock('$lib/modules/shop/server', async () => {
	const nightMap = await import('../../lib/modules/shop/night-map.ts');
	const all = Object.values(nightMap.NIGHT_MAP_SKUS)
		.flat()
		.map((sku) => sku.slug);
	return {
		activeNightMapSkus: async () =>
			nightMap.filterNightMapSkus(new Set(all.filter((slug) => slug !== INACTIVE_SLUG)))
	};
});
const { load } = await import('./+page.server.ts');

// The generated load type unions with `void`, so narrow to the actual shape.
const data = (await load({} as never)) as {
	nightMapSkus: typeof NIGHT_MAP_SKUS;
	patterns: { slug: string; title: string; archetypes: { name: string; slug: string }[] }[];
};

describe('landing +page.server load', () => {
	it('supplies the four deck patterns in deck order', () => {
		// Card copy is Paraglide keyed on these literal slugs (M-14) — render
		// coverage lives in landing-render.spec.ts.
		expect(data.patterns.map((p) => p.slug)).toEqual(SLEEP_PATTERNS.map((p) => p.slug));
	});

	it('links every pattern to real archetype pages, covering all nine', () => {
		const validSlugs = new Set(ARCHETYPE_PAGES.map((p) => p.slug));
		const linked = new Set<string>();
		for (const pattern of data.patterns) {
			expect(pattern.archetypes.length).toBeGreaterThan(0);
			for (const archetype of pattern.archetypes) {
				expect(validSlugs.has(archetype.slug)).toBe(true);
				expect(archetype.name.length).toBeGreaterThan(0);
				linked.add(archetype.slug);
			}
		}
		// The landing is the intended entry point to /tipuri — every archetype
		// page must be reachable from the pattern grid.
		expect(linked.size).toBe(ARCHETYPE_PAGES.length);
	});

	it('supplies the night-map SKUs filtered to the visible catalogue (BS-6 seam, M-5)', () => {
		// Slug/name validity against the committed catalogue is pinned in
		// modules/shop/night-map.spec.ts — here the DB filter pass-through
		// matters: the archived SKU's chip is gone, everything else survives
		// in declaration order.
		expect(data.nightMapSkus).toEqual(
			filterNightMapSkus(
				new Set(
					Object.values(NIGHT_MAP_SKUS)
						.flat()
						.map((sku) => sku.slug)
						.filter((slug) => slug !== INACTIVE_SLUG)
				)
			)
		);
		const flat = Object.values(data.nightMapSkus).flat();
		expect(flat.some((sku) => sku.slug === INACTIVE_SLUG)).toBe(false);
		expect(flat.length).toBe(Object.values(NIGHT_MAP_SKUS).flat().length - 1);
		for (const key of NIGHT_SEGMENT_KEYS) {
			expect(data.nightMapSkus[key].length, key).toBeGreaterThanOrEqual(2);
		}
	});
});

describe('the full home_* namespace is pinned (M-15)', () => {
	it('every landing message matches the checked-in extraction of the deck', () => {
		// landing-copy.pinned.json is the committed deck extraction (verified
		// against .initialData/somnium-landing-copy-deck.md at BS-5/BS-10): ANY
		// edit to a home_* message — or a new/removed key — fails here until
		// the pin is consciously regenerated alongside the copy change.
		// Per-block RENDER coverage lives in landing-render.spec.ts.
		const home = Object.fromEntries(
			Object.entries(messages as Record<string, string>).filter(([key]) => key.startsWith('home_'))
		);
		expect(home).toEqual(pinnedLandingCopy);
	});
});

describe('landing copy is deck-verbatim', () => {
	// The copy deck (.initialData/somnium-landing-copy-deck.md) is the spec:
	// these strings must ship exactly as written there. A "helpful" rewording
	// of ro.json fails here.
	it('hero', () => {
		expect(messages.home_hero_h1_a).toBe('Nu dormi prost.');
		expect(messages.home_hero_h1_b).toBe('Dormi prost dintr-un motiv anume.');
		expect(messages.home_hero_sub).toBe(
			'Insomnia de stres, cea hormonală și cea de ritm circadian au aceleași simptome la 3 dimineața și tratamente complet diferite. Testul nostru de 3 minute îți spune care e a ta.'
		);
		expect(messages.home_hero_cta).toBe('Află-ți tipul de somn');
		expect(messages.home_hero_cta_secondary).toBe('Vezi cum funcționează');
		expect(messages.home_hero_trust_1).toBe('Gratuit, fără cont');
		expect(messages.home_hero_trust_2).toBe('Fără nicio obligație');
		expect(messages.home_hero_trust_3).toBe(
			'Soluții dovedite, formulate de specialiști în medicină funcțională'
		);
	});

	it('section headings', () => {
		expect(messages.home_cost_heading).toBe('Ce ți-a luat noaptea trecută');
		expect(messages.home_patterns_heading).toBe('Recunoaște-te');
		expect(messages.home_patterns_sub).toBe(
			'Patru tipare acoperă majoritatea insomniilor. Fiecare cere altceva.'
		);
		expect(messages.home_reframe_heading).toBe('De ce nu au funcționat până acum');
		expect(messages.home_steps_heading).toBe('Trei pași');
		expect(messages.home_nightmap_heading).toBe('Ce se întâmplă între 23:00 și 07:00');
		expect(messages.home_proof_heading).toBe('Ce poți verifica');
		expect(messages.home_final_heading).toBe('Începe cu întrebarea corectă');
	});

	it('pattern cards (block 3)', () => {
		// Deck titles are ALL-CAPS as presentation; the messages hold mixed
		// case and the card uppercases via CSS (L-10 — screen readers must not
		// spell out baked capitals; the night map already did it this way).
		expect(messages.home_pattern_adormitul_imposibil_title).toBe('Adormitul imposibil');
		expect(messages.home_pattern_trezirea_de_la_3_title).toBe('Trezirea de la 3');
		expect(messages.home_pattern_somnul_care_nu_odihneste_title).toBe('Somnul care nu odihnește');
		expect(messages.home_pattern_ritmul_dat_peste_cap_title).toBe('Ritmul dat peste cap');
		expect(messages.home_pattern_adormitul_imposibil_mechanism).toBe(
			'Cortizol seara. Problema e activarea, nu lipsa de somn.'
		);
		expect(messages.home_pattern_trezirea_de_la_3_mechanism).toBe(
			'Glicemie sau cortizol matinal. Problema e menținerea.'
		);
		expect(messages.home_pattern_somnul_care_nu_odihneste_mechanism).toBe(
			'Somn fragmentat sau superficial. Problema e adâncimea.'
		);
		expect(messages.home_pattern_ritmul_dat_peste_cap_mechanism).toBe(
			'Ceas circadian deplasat. Problema e sincronizarea.'
		);
	});

	// 2026-09-10: the site sells no program, so the refund promise was not
	// applicable. Block 11 is now the 30-night self-experiment — what to
	// watch, and that the difference shows in a log, not in promises.
	it('30-night experiment and final CTA (blocks 11–12)', () => {
		expect(messages.home_risk_line_a).toBe(
			'30 de nopți. Atât îți ia să afli dacă ai nimerit cauza.'
		);
		expect(messages.home_risk_line_b).toBe(
			'Fă testul, aplică protocolul tipului tău și urmărește trei lucruri: în cât timp adormi, de câte ori te trezești, cum te simți la ora 10 dimineața. După 30 de nopți diferența se vede în jurnal, nu în promisiuni.'
		);
		expect(messages.home_risk_subscription).toBe(
			'Începe cu un singur obicei în seara asta. Consecvența bate perfecțiunea.'
		);
		expect(messages.home_final_cta).toBe('Fă testul · 3 minute');
		expect(messages.home_final_note).toBe(
			'Gratuit. Fără cont. Rezultatul e al tău indiferent dacă cumperi ceva.'
		);
	});
});
