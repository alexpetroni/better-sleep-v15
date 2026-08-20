<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 4: three short paragraphs, no bullets — lead + explanation.
	const paragraphs = [
		{ lead: m.home_reframe_1_lead(), body: m.home_reframe_1_body() },
		{ lead: m.home_reframe_2_lead(), body: m.home_reframe_2_body() },
		{ lead: m.home_reframe_3_lead(), body: m.home_reframe_3_body() }
	];
</script>

<section data-testid="landing-reframe" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div class="mx-auto max-w-2xl">
			<div use:reveal aria-hidden="true">
				<Eyebrow label="04" />
			</div>
			<h2
				use:reveal={{ delay: 90 }}
				class="mt-5 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
			>
				{m.home_reframe_heading()}
			</h2>

			<div class="mt-12 space-y-10">
				{#each paragraphs as paragraph, i (paragraph.lead)}
					<div use:reveal={{ delay: i * 90 }} class="border-l-2 border-(--color-brand-soft) pl-6">
						<p class="text-lg font-bold sm:text-xl">{paragraph.lead}</p>
						<p class="mt-2 leading-relaxed text-(--color-ink)/70">{paragraph.body}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
