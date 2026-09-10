<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { ARCHETYPE_QUIZ_SLUG } from '$lib/modules/quiz';
	import CtaButton from './CtaButton.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	let { siteName }: { siteName: string } = $props();

	const quizHref = resolve('/(public)/quiz/[slug]', { slug: ARCHETYPE_QUIZ_SLUG });
	const trust = [m.home_hero_trust_1(), m.home_hero_trust_2(), m.home_hero_trust_3()];

	// The subtitle is one catalog string; the "3 minute" promise inside it is
	// set in bold by splitting on its own (pinned) message rather than
	// shipping markup through Paraglide.
	const subEmphasis = m.home_hero_sub_emphasis();
	const [subBefore, subAfter = ''] = m.home_hero_sub().split(subEmphasis);

	// The collage (2026-09-09 redesign): three tilted paper cards that preview
	// what the site holds — the four sleep patterns, one night-map segment and
	// a step — all from existing copy, decorative (aria-hidden) and static.
	const patterns = [
		m.home_pattern_adormitul_imposibil_title(),
		m.home_pattern_trezirea_de_la_3_title(),
		m.home_pattern_somnul_care_nu_odihneste_title(),
		m.home_pattern_ritmul_dat_peste_cap_title()
	];
</script>

<section
	data-testid="landing-hero"
	class="relative overflow-hidden pt-16 pb-24 sm:pt-24 md:pt-28 md:pb-32 lg:min-h-[92svh]"
>
	<!-- Dawn on paper: one warm apricot glow top-right, one faint cool haze
	     bottom-left — gradients only (no blur filters). -->
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute -top-48 right-[-10%] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-moon)_55%,transparent),transparent_70%)]"
		></div>
		<div
			class="absolute bottom-[-30%] left-[-15%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand-soft)_90%,transparent),transparent_70%)]"
		></div>
	</div>

	<div
		class="relative mx-auto grid w-full max-w-6xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8"
	>
		<div class="max-w-2xl">
			<div use:reveal>
				<Eyebrow label={siteName} />
			</div>
			<h1
				use:reveal={{ delay: 90 }}
				class="mt-7 text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[4.75rem]"
			>
				{m.home_hero_h1_a()}
				<span
					class="mt-2 block font-serif text-[0.74em] leading-[1.08] font-normal tracking-[-0.01em] text-(--color-ink)/85 italic"
				>
					{m.home_hero_h1_b()}
				</span>
			</h1>
			<p
				use:reveal={{ delay: 180 }}
				class="mt-8 max-w-xl text-lg leading-relaxed text-(--color-ink)/70 sm:text-xl"
			>
				{subBefore}<strong class="font-semibold text-(--color-ink)">{subEmphasis}</strong>{subAfter}
			</p>
			<div use:reveal={{ delay: 270 }} class="mt-10 flex flex-wrap items-center gap-4">
				<CtaButton href={quizHref} label={m.home_hero_cta()} testid="hero-cta-primary" />
				<a
					href="#cum-functioneaza"
					data-testid="hero-cta-secondary"
					class="inline-flex items-center gap-2 rounded-full bg-white/80 px-6 py-3 text-base font-semibold text-(--color-ink) shadow-pill backdrop-blur-sm transition-transform duration-500 ease-glide hover:scale-[1.02] active:scale-[0.98]"
				>
					{m.home_hero_cta_secondary()}
					<span aria-hidden="true" class="text-(--color-ink)/50">↓</span>
				</a>
			</div>
			<ul
				use:reveal={{ delay: 360 }}
				class="mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-(--color-ink)/60"
			>
				<!-- Keyed by index (L-10): keying by translated string crashes dev on duplicates. -->
				{#each trust as item, i (i)}
					{#if i > 0}
						<li aria-hidden="true" class="text-(--color-accent)">·</li>
					{/if}
					<li>{item}</li>
				{/each}
			</ul>
		</div>

		<!-- The collage. Hidden below lg so the phone gate (no horizontal scroll
		     at 360px) never sees the tilted, overflowing cards. -->
		<div aria-hidden="true" class="relative hidden h-[34rem] lg:block">
			<!-- 1 · the four patterns -->
			<div
				class="float-in absolute top-4 left-0 w-72 rounded-[1.5rem] bg-white p-6 shadow-paper-lg [--float-delay:200ms] [--tilt:-4deg]"
			>
				<p class="text-[10px] font-semibold tracking-[0.2em] text-(--color-ink)/45 uppercase">
					{m.home_patterns_heading()}
				</p>
				<ul class="mt-4 space-y-2.5">
					{#each patterns as pattern, i (i)}
						<li class="flex items-center gap-3 text-[13px] font-semibold">
							<span
								class={[
									'h-2 w-2 shrink-0 rounded-full',
									i === 1 ? 'bg-(--color-accent)' : 'bg-(--color-brand-soft)'
								]}
							></span>
							{pattern}
						</li>
					{/each}
				</ul>
			</div>
			<!-- 2 · one night-map segment, on night ground -->
			<div
				class="float-in absolute top-44 right-[-1rem] w-80 rounded-[1.5rem] bg-(--color-night) p-6 text-(--color-night-ink) shadow-paper-lg [--float-delay:420ms] [--tilt:3deg]"
			>
				<p class="text-sm font-bold tracking-[0.16em] text-(--color-moon) tabular-nums">
					{m.home_nightmap_2_time()}
				</p>
				<p class="mt-2 text-base font-extrabold tracking-[0.1em] uppercase">
					{m.home_nightmap_2_title()}
				</p>
				<p class="mt-3 text-[13px] leading-relaxed text-(--color-night-muted)">
					{m.home_nightmap_2_body()}
				</p>
				<div class="mt-5 flex items-center gap-1.5">
					{#each [0, 1, 2, 3] as i (i)}
						<span class={['h-1 flex-1 rounded-full', i === 1 ? 'bg-(--color-moon)' : 'bg-white/12']}
						></span>
					{/each}
				</div>
			</div>
			<!-- 3 · the first step -->
			<div
				class="float-in absolute bottom-0 left-14 w-64 rounded-[1.5rem] bg-white p-6 shadow-paper-lg [--float-delay:640ms] [--tilt:-2deg]"
			>
				<span class="font-serif text-4xl text-(--color-accent) italic">01</span>
				<p class="mt-2 text-base font-bold">{m.home_steps_1_title()}</p>
				<p class="mt-2 text-[13px] leading-relaxed text-(--color-ink)/65">
					{m.home_steps_1_body()}
				</p>
			</div>
		</div>
	</div>
</section>
