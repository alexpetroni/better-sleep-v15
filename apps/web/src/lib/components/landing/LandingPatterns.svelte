<script lang="ts" module>
	/** What the landing load supplies per deck-block-3 card (BS-2 mapping). */
	export interface PatternCard {
		slug: string;
		title: string;
		archetypes: { name: string; slug: string }[];
	}
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { ARCHETYPE_QUIZ_SLUG } from '$lib/modules/quiz';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	let { patterns }: { patterns: PatternCard[] } = $props();

	// Deck-verbatim card copy, keyed by the pattern slugs from `SLEEP_PATTERNS`.
	const copy: Record<string, { symptom: () => string; mechanism: () => string }> = {
		'adormitul-imposibil': {
			symptom: m.home_pattern_adormitul_imposibil_symptom,
			mechanism: m.home_pattern_adormitul_imposibil_mechanism
		},
		'trezirea-de-la-3': {
			symptom: m.home_pattern_trezirea_de_la_3_symptom,
			mechanism: m.home_pattern_trezirea_de_la_3_mechanism
		},
		'somnul-care-nu-odihneste': {
			symptom: m.home_pattern_somnul_care_nu_odihneste_symptom,
			mechanism: m.home_pattern_somnul_care_nu_odihneste_mechanism
		},
		'ritmul-dat-peste-cap': {
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
					class="rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-black/5"
				>
					<div
						class="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-white p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-8"
					>
						<h3 class="text-lg font-extrabold tracking-[0.08em] text-(--color-brand)">
							{pattern.title}
						</h3>
						{#if c}
							<p class="mt-3 text-base leading-relaxed">{c.symptom()}</p>
							<p class="mt-4 flex gap-2 text-sm leading-relaxed font-medium text-(--color-ink)/70">
								<span aria-hidden="true" class="text-(--color-accent)">→</span>
								{c.mechanism()}
							</p>
						{/if}
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
											class="inline-flex rounded-full bg-(--color-brand-soft)/50 px-3.5 py-1.5 text-sm font-semibold text-(--color-brand) ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.04] active:scale-[0.97]"
										>
											{archetype.name}
										</a>
									</li>
								{/each}
							</ul>
						</div>
					</div>
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
