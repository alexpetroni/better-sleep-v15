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
</script>

<section
	data-testid="landing-hero"
	class="relative flex min-h-[100dvh] items-center overflow-hidden bg-(--color-night) text-(--color-night-ink)"
>
	<!-- Night sky: radial brand/moon glows + a moon disc, gradients only (no blur filters). -->
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute -top-40 right-[-15%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand)_50%,transparent),transparent_72%)]"
		></div>
		<div
			class="absolute bottom-[-25%] left-[-12%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent_70%)]"
		></div>
		<div
			class="absolute top-24 right-[12%] hidden h-20 w-20 rounded-full bg-(--color-moon) shadow-[0_0_90px_35px_color-mix(in_oklab,var(--color-moon)_30%,transparent)] md:block"
		></div>
	</div>

	<div class="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 md:py-32">
		<div class="max-w-3xl">
			<div use:reveal>
				<Eyebrow label={siteName} dark />
			</div>
			<h1
				use:reveal={{ delay: 90 }}
				class="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl"
			>
				{m.home_hero_h1_a()}<br />
				<span class="text-(--color-night-muted)">{m.home_hero_h1_b()}</span>
			</h1>
			<p
				use:reveal={{ delay: 180 }}
				class="mt-8 max-w-2xl text-lg leading-relaxed text-(--color-night-muted) sm:text-xl"
			>
				{m.home_hero_sub()}
			</p>
			<div use:reveal={{ delay: 270 }} class="mt-10 flex flex-wrap items-center gap-4">
				<CtaButton
					href={quizHref}
					label={m.home_hero_cta()}
					variant="moon"
					testid="hero-cta-primary"
				/>
				<a
					href="#cum-functioneaza"
					data-testid="hero-cta-secondary"
					class="inline-flex items-center rounded-full px-6 py-3 text-base font-semibold text-(--color-night-ink) ring-1 ring-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] active:scale-[0.98]"
				>
					{m.home_hero_cta_secondary()}
				</a>
			</div>
			<ul
				use:reveal={{ delay: 360 }}
				class="mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-(--color-night-muted)"
			>
				{#each trust as item, i (item)}
					{#if i > 0}
						<li aria-hidden="true" class="text-(--color-night-muted)/50">·</li>
					{/if}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
