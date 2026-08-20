<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 2: four stat-free cards — icon, headline, one line. Thin-line
	// custom icons (1.25 stroke), no icon-font dependency.
	const cards = [
		{ icon: 'decisions', title: m.home_cost_1_title(), body: m.home_cost_1_body() },
		{ icon: 'patience', title: m.home_cost_2_title(), body: m.home_cost_2_body() },
		{ icon: 'sugar', title: m.home_cost_3_title(), body: m.home_cost_3_body() },
		{ icon: 'memory', title: m.home_cost_4_title(), body: m.home_cost_4_body() }
	];
</script>

{#snippet icon(name: string)}
	<svg
		viewBox="0 0 24 24"
		class="h-6 w-6 text-(--color-brand)"
		fill="none"
		stroke="currentColor"
		stroke-width="1.25"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#if name === 'decisions'}
			<!-- forked path: one decision splitting -->
			<path d="M12 20v-6m0 0c0-3 -3-4 -5-6m5 6c0-3 3-4 5-6M7 8V4m10 4V4" />
		{:else if name === 'patience'}
			<!-- flat pulse that spikes -->
			<path d="M3 14h5l2-6 3 9 2-3h6" />
		{:else if name === 'sugar'}
			<!-- clock at 16:00 -->
			<circle cx="12" cy="12" r="8" />
			<path d="M12 8v4l3 2" />
		{:else}
			<!-- memory: stacked layers, top one drifting away -->
			<path d="M5 16l7 4 7-4M5 12l7 4 7-4" />
			<path d="M9 6.5 12 5l3 1.5" opacity="0.5" />
		{/if}
	</svg>
{/snippet}

<section data-testid="landing-cost" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal aria-hidden="true">
			<Eyebrow label="02" />
		</div>
		<h2
			use:reveal={{ delay: 90 }}
			class="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
		>
			{m.home_cost_heading()}
		</h2>

		<div class="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each cards as card, i (card.title)}
				<div
					use:reveal={{ delay: i * 90 }}
					class="rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-black/5"
				>
					<div
						class="h-full rounded-[calc(2rem-0.375rem)] bg-white p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
					>
						<span
							class="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-brand-soft)/60"
						>
							{@render icon(card.icon)}
						</span>
						<h3 class="mt-5 text-lg font-bold">{card.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-(--color-ink)/70">{card.body}</p>
					</div>
				</div>
			{/each}
		</div>

		<p
			use:reveal={{ delay: 180 }}
			class="mx-auto mt-14 max-w-2xl text-center text-base leading-relaxed text-(--color-ink)/70 sm:text-lg"
		>
			{m.home_cost_closing()}
		</p>
	</div>
</section>
