import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import messages from '../../../messages/ro.json';
import { SLEEP_PATTERNS } from '../../lib/modules/quiz/index.ts';
import LandingCost from '../../lib/components/landing/LandingCost.svelte';
import LandingFinalCta from '../../lib/components/landing/LandingFinalCta.svelte';
import LandingHero from '../../lib/components/landing/LandingHero.svelte';
import LandingNightMap from '../../lib/components/landing/LandingNightMap.svelte';
import LandingObjections from '../../lib/components/landing/LandingObjections.svelte';
import LandingPatterns, {
	type PatternCard
} from '../../lib/components/landing/LandingPatterns.svelte';
import LandingProof from '../../lib/components/landing/LandingProof.svelte';
import LandingReframe from '../../lib/components/landing/LandingReframe.svelte';
import LandingRisk from '../../lib/components/landing/LandingRisk.svelte';
import LandingSteps from '../../lib/components/landing/LandingSteps.svelte';

// M-15: every deck block must RENDER its own copy — a namespace pin alone
// (landing.spec.ts) cannot catch two message keys swapped between blocks.
// Each component is server-rendered and asserted to contain the block's
// distinctive strings, so wiring the wrong key into a component fails here.

vi.mock('$app/paths', () => ({
	resolve: (id: string, params: Record<string, string> = {}) =>
		id.replace(/\[(\w+)\]/g, (_, key: string) => params[key] ?? '')
}));

function html(component: unknown, props?: Record<string, unknown>): string {
	// svelte/server render typing wants concrete component generics — the
	// dynamic-per-test shape is what this harness is about.
	return render(component as never, { props: props as never }).body;
}

describe('each landing block renders its own deck copy (M-15)', () => {
	it('hero (block 1)', () => {
		const body = html(LandingHero, { siteName: 'betterSleep' });
		expect(body).toContain(messages.home_hero_h1_a);
		expect(body).toContain(messages.home_hero_h1_b);
		expect(body).toContain(messages.home_hero_sub);
		expect(body).toContain(messages.home_hero_cta);
		expect(body).toContain(messages.home_hero_trust_1);
		expect(body).toContain(messages.home_hero_trust_3);
	});

	it('cost of bad sleep (block 2)', () => {
		const body = html(LandingCost);
		expect(body).toContain(messages.home_cost_heading);
		for (const n of [1, 2, 3, 4] as const) {
			expect(body).toContain(messages[`home_cost_${n}_title`]);
			expect(body).toContain(messages[`home_cost_${n}_body`]);
		}
		expect(body).toContain(messages.home_cost_closing);
	});

	it('pattern cards (block 3): every card carries ITS OWN copy', () => {
		const patterns: PatternCard[] = SLEEP_PATTERNS.map((p) => ({
			slug: p.slug,
			archetypes: [{ name: 'Străjerul', slug: 'strajerul' }]
		}));
		const body = html(LandingPatterns, { patterns });

		// Slice per card via the data-pattern attribute, so a symptom swapped
		// between two cards fails — not just a page-wide contains().
		const byKey = messages as Record<string, string>;
		const cards = body.split('data-pattern=');
		for (const p of SLEEP_PATTERNS) {
			const card = cards.find((chunk) => chunk.startsWith(`"${p.slug}"`));
			const key = p.slug.replaceAll('-', '_');
			expect(card, p.slug).toBeDefined();
			for (const part of ['title', 'symptom', 'mechanism'] as const) {
				const value = byKey[`home_pattern_${key}_${part}`];
				expect(value, `home_pattern_${key}_${part}`).toBeTruthy();
				expect(card, `${p.slug} ${part}`).toContain(value);
			}
		}
	});

	it('reframe (block 4): each lead is followed by its own body', () => {
		const body = html(LandingReframe);
		expect(body).toContain(messages.home_reframe_heading);
		for (const n of [1, 2, 3] as const) {
			const lead = body.indexOf(messages[`home_reframe_${n}_lead`]);
			const answer = body.indexOf(messages[`home_reframe_${n}_body`]);
			expect(lead, `lead ${n}`).toBeGreaterThan(-1);
			expect(answer, `body ${n} follows lead ${n}`).toBeGreaterThan(lead);
			if (n < 3) {
				expect(answer).toBeLessThan(
					body.indexOf(messages[`home_reframe_${(n + 1) as 2 | 3}_lead`])
				);
			}
		}
	});

	it('three steps (block 5)', () => {
		const body = html(LandingSteps);
		expect(body).toContain(messages.home_steps_heading);
		for (const n of [1, 2, 3] as const) {
			const title = body.indexOf(messages[`home_steps_${n}_title`]);
			const stepBody = body.indexOf(messages[`home_steps_${n}_body`]);
			expect(title, `step ${n}`).toBeGreaterThan(-1);
			expect(stepBody, `step ${n} body follows its title`).toBeGreaterThan(title);
		}
	});

	it('night map (block 6): four segments, times with their own bodies', () => {
		const body = html(LandingNightMap);
		expect(body).toContain(messages.home_nightmap_heading);
		for (const n of [1, 2, 3, 4] as const) {
			const time = body.indexOf(messages[`home_nightmap_${n}_time`]);
			const segment = body.indexOf(messages[`home_nightmap_${n}_body`]);
			expect(time, `segment ${n} time`).toBeGreaterThan(-1);
			expect(body).toContain(messages[`home_nightmap_${n}_title`]);
			expect(segment, `segment ${n} body follows its time`).toBeGreaterThan(time);
		}
	});

	it('proof (block 7)', () => {
		const body = html(LandingProof);
		expect(body).toContain(messages.home_proof_heading);
		for (const n of [1, 2, 3, 4] as const) {
			const title = body.indexOf(messages[`home_proof_${n}_title`]);
			const proofBody = body.indexOf(messages[`home_proof_${n}_body`]);
			expect(title, `proof ${n}`).toBeGreaterThan(-1);
			expect(proofBody, `proof ${n} body follows its title`).toBeGreaterThan(title);
		}
	});

	it('objections (block 9): every answer sits under its own question', () => {
		const body = html(LandingObjections);
		expect(body).toContain(messages.home_objections_heading);
		for (const n of [1, 2, 3, 4] as const) {
			const question = body.indexOf(messages[`home_objection_${n}_q`]);
			const answer = body.indexOf(messages[`home_objection_${n}_a`]);
			expect(question, `objection ${n}`).toBeGreaterThan(-1);
			// The melatonin-dependency answer (n=1) is the legally sensitive
			// string on the page — it must sit under ITS question, not another.
			expect(answer, `answer ${n} follows question ${n}`).toBeGreaterThan(question);
		}
	});

	it('risk reversal (block 11)', () => {
		const body = html(LandingRisk);
		expect(body).toContain(messages.home_risk_line_a);
		expect(body).toContain(messages.home_risk_line_b);
		expect(body).toContain(messages.home_risk_subscription);
	});

	it('final CTA (block 12)', () => {
		const body = html(LandingFinalCta);
		expect(body).toContain(messages.home_final_heading);
		expect(body).toContain(messages.home_final_line_a);
		expect(body).toContain(messages.home_final_line_b);
		expect(body).toContain(messages.home_final_cta);
		expect(body).toContain(messages.home_final_note);
	});
});
