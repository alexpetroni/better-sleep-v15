<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { ARCHETYPE_QUIZ_SLUG } from '$lib/modules/quiz';
	import CtaButton from './CtaButton.svelte';
	import { reveal } from './reveal.ts';

	const quizHref = resolve('/(public)/quiz/[slug]', { slug: ARCHETYPE_QUIZ_SLUG });
</script>

<section
	data-testid="landing-final-cta"
	class="relative overflow-hidden bg-(--color-night) py-28 text-(--color-night-ink) md:py-40"
>
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute bottom-[-40%] left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand)_45%,transparent),transparent_72%)]"
		></div>
	</div>

	<div class="relative mx-auto max-w-6xl px-5 text-center sm:px-8">
		<h2
			use:reveal
			class="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
		>
			{m.home_final_heading()}
		</h2>
		<p use:reveal={{ delay: 90 }} class="mt-6 text-lg text-(--color-night-muted) sm:text-xl">
			{m.home_final_line_a()}<br />
			{m.home_final_line_b()}
		</p>
		<div use:reveal={{ delay: 180 }} class="mt-10">
			<CtaButton
				href={quizHref}
				label={m.home_final_cta()}
				variant="moon"
				testid="final-cta-button"
			/>
		</div>
		<p use:reveal={{ delay: 260 }} class="mt-6 text-sm text-(--color-night-muted)">
			{m.home_final_note()}
		</p>
	</div>
</section>
