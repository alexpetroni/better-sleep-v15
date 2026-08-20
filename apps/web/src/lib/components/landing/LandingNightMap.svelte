<script lang="ts" module>
	/** One 23:00→07:00 timeline segment; `key` is the BS-6 seam handle. */
	export interface NightSegment {
		key: 'adormirea' | 'somn-profund' | 'fereastra-fragila' | 'rem';
		time: string;
		title: string;
		body: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 6. The deck asks for the supporting SKU under each segment —
	// product naming lands in BS-6 through `segmentExtra` (renders nothing
	// until a caller provides it; no placeholder text).
	let { segmentExtra }: { segmentExtra?: Snippet<[NightSegment]> } = $props();

	const segments: NightSegment[] = [
		{
			key: 'adormirea',
			time: m.home_nightmap_1_time(),
			title: m.home_nightmap_1_title(),
			body: m.home_nightmap_1_body()
		},
		{
			key: 'somn-profund',
			time: m.home_nightmap_2_time(),
			title: m.home_nightmap_2_title(),
			body: m.home_nightmap_2_body()
		},
		{
			key: 'fereastra-fragila',
			time: m.home_nightmap_3_time(),
			title: m.home_nightmap_3_title(),
			body: m.home_nightmap_3_body()
		},
		{
			key: 'rem',
			time: m.home_nightmap_4_time(),
			title: m.home_nightmap_4_title(),
			body: m.home_nightmap_4_body()
		}
	];
</script>

<section
	data-testid="landing-nightmap"
	class="relative overflow-hidden bg-(--color-night) py-24 text-(--color-night-ink) md:py-32"
>
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-[-30%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand)_40%,transparent),transparent_72%)]"
		></div>
	</div>

	<div class="relative mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal aria-hidden="true">
			<Eyebrow label="06" dark />
		</div>
		<h2
			use:reveal={{ delay: 90 }}
			class="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
		>
			{m.home_nightmap_heading()}
		</h2>

		<div class="relative mt-16">
			<!-- The night's axis: a faint horizontal line behind the four segments. -->
			<div
				aria-hidden="true"
				class="absolute top-1.5 right-0 left-0 hidden h-px bg-gradient-to-r from-white/0 via-white/25 to-white/0 lg:block"
			></div>
			<ol class="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
				{#each segments as segment, i (segment.key)}
					<li use:reveal={{ delay: i * 120 }} class="relative">
						<span
							aria-hidden="true"
							class="mb-5 hidden h-3 w-3 rounded-full bg-(--color-moon) shadow-[0_0_18px_4px_color-mix(in_oklab,var(--color-moon)_35%,transparent)] lg:block"
						></span>
						<p class="text-sm font-bold tracking-[0.16em] text-(--color-moon) tabular-nums">
							{segment.time}
						</p>
						<h3 class="mt-2 text-base font-extrabold tracking-[0.12em] uppercase">
							{segment.title}
						</h3>
						<p class="mt-3 text-sm leading-relaxed text-(--color-night-muted)">{segment.body}</p>
						{#if segmentExtra}
							<div class="mt-4">{@render segmentExtra(segment)}</div>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>
