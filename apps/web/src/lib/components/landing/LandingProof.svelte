<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 7: checkable claims instead of outcome percentages.
	const items = [
		{ title: m.home_proof_1_title(), body: m.home_proof_1_body() },
		{ title: m.home_proof_2_title(), body: m.home_proof_2_body() },
		{ title: m.home_proof_3_title(), body: m.home_proof_3_body() },
		{ title: m.home_proof_4_title(), body: m.home_proof_4_body() }
	];
</script>

<section data-testid="landing-proof" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal aria-hidden="true">
			<Eyebrow label="07" />
		</div>
		<h2 use:reveal={{ delay: 90 }} class="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
			{m.home_proof_heading()}
		</h2>

		<ul class="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
			{#each items as item, i (item.title)}
				<li use:reveal={{ delay: (i % 2) * 90 }} class="flex gap-5 border-t border-black/10 pt-6">
					<svg
						viewBox="0 0 24 24"
						class="mt-1 h-5 w-5 shrink-0 text-(--color-brand)"
						fill="none"
						stroke="currentColor"
						stroke-width="1.25"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M4 12.5l5 5L20 6.5" />
					</svg>
					<div>
						<h3 class="text-lg font-bold">{item.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-(--color-ink)/70">{item.body}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>
