<script lang="ts" module>
	import type { PatternSlug } from '$lib/modules/quiz';

	/** What the landing load supplies per deck-block-3 card (BS-2 mapping). */
	export interface PatternCard {
		slug: PatternSlug;
		archetypes: { name: string; slug: string }[];
	}
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { ARCHETYPE_QUIZ_SLUG } from '$lib/modules/quiz';
	import BezelCard from './BezelCard.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	let { patterns }: { patterns: PatternCard[] } = $props();

	// Deck-verbatim card copy. Keyed on the LITERAL slug union (M-14): renaming
	// a slug in SLEEP_PATTERNS is a compile error here, never a silently
	// half-empty card. Titles render mixed-case with CSS uppercase (L-10) so
	// screen readers don't spell out baked ALL-CAPS.
	const copy: Record<
		PatternSlug,
		{ title: () => string; symptom: () => string; mechanism: () => string }
	> = {
		'adormitul-imposibil': {
			title: m.home_pattern_adormitul_imposibil_title,
			symptom: m.home_pattern_adormitul_imposibil_symptom,
			mechanism: m.home_pattern_adormitul_imposibil_mechanism
		},
		'trezirea-de-la-3': {
			title: m.home_pattern_trezirea_de_la_3_title,
			symptom: m.home_pattern_trezirea_de_la_3_symptom,
			mechanism: m.home_pattern_trezirea_de_la_3_mechanism
		},
		'somnul-care-nu-odihneste': {
			title: m.home_pattern_somnul_care_nu_odihneste_title,
			symptom: m.home_pattern_somnul_care_nu_odihneste_symptom,
			mechanism: m.home_pattern_somnul_care_nu_odihneste_mechanism
		},
		'ritmul-dat-peste-cap': {
			title: m.home_pattern_ritmul_dat_peste_cap_title,
			symptom: m.home_pattern_ritmul_dat_peste_cap_symptom,
			mechanism: m.home_pattern_ritmul_dat_peste_cap_mechanism
		}
	};

	const quizHref = resolve('/(public)/quiz/[slug]', { slug: ARCHETYPE_QUIZ_SLUG });
</script>

<section data-testid="landing-patterns" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal aria-hidden="true">
			<Eyebrow label="03" />
		</div>
		<h2 use:reveal={{ delay: 90 }} class="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
			{m.home_patterns_heading()}
		</h2>
		<p use:reveal={{ delay: 160 }} class="mt-4 max-w-xl text-lg text-(--color-ink)/70">
			{m.home_patterns_sub()}
		</p>

		<div class="mt-14 grid gap-6 md:grid-cols-2">
			{#each patterns as pattern, i (pattern.slug)}
				{@const c = copy[pattern.slug]}
				<article
					use:reveal={{ delay: (i % 2) * 100 }}
					data-testid="pattern-card"
					data-pattern={pattern.slug}
				>
					<BezelCard class="h-full" innerClass="flex h-full flex-col bg-white p-7 sm:p-8">
						<h3 class="text-[13px] font-bold tracking-[0.14em] text-(--color-accent) uppercase">
							{c.title()}
						</h3>
						<p class="mt-3 font-serif text-xl leading-snug">{c.symptom()}</p>
						<p class="mt-4 flex gap-2 text-sm leading-relaxed font-medium text-(--color-ink)/70">
							<span aria-hidden="true" class="text-(--color-accent)">→</span>
							{c.mechanism()}
						</p>
						<div class="mt-6 border-t border-black/5 pt-5">
							<p class="text-[11px] font-medium tracking-[0.14em] text-(--color-ink)/70 uppercase">
								{m.home_patterns_archetypes_label()}
							</p>
							<ul class="mt-3 flex flex-wrap gap-2">
								{#each pattern.archetypes as archetype (archetype.slug)}
									<li>
										<a
											href={resolve('/(public)/tipuri/[archetype]', { archetype: archetype.slug })}
											data-testid="pattern-archetype-link"
											class="inline-flex rounded-full bg-(--color-brand-soft)/60 px-3.5 py-1.5 text-sm font-semibold text-(--color-ink) transition-transform duration-500 ease-glide hover:scale-[1.04] active:scale-[0.97]"
										>
											{archetype.name}
										</a>
									</li>
								{/each}
							</ul>
						</div>
					</BezelCard>
				</article>
			{/each}
		</div>

		<p use:reveal class="mt-12 text-center text-base text-(--color-ink)/70">
			<a href={quizHref} class="font-semibold text-(--color-brand) underline underline-offset-4">
				{m.home_patterns_cta()}
			</a>
		</p>
	</div>
</section>
