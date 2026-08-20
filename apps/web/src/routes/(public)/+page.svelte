<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import Seo from '$lib/components/Seo.svelte';
	import { canonicalUrl } from '$lib/seo';
	import LandingCost from '$lib/components/landing/LandingCost.svelte';
	import LandingFinalCta from '$lib/components/landing/LandingFinalCta.svelte';
	import LandingHero from '$lib/components/landing/LandingHero.svelte';
	import LandingNightMap from '$lib/components/landing/LandingNightMap.svelte';
	import LandingObjections from '$lib/components/landing/LandingObjections.svelte';
	import LandingPatterns from '$lib/components/landing/LandingPatterns.svelte';
	import LandingProof from '$lib/components/landing/LandingProof.svelte';
	import LandingReframe from '$lib/components/landing/LandingReframe.svelte';
	import LandingRisk from '$lib/components/landing/LandingRisk.svelte';
	import LandingSteps from '$lib/components/landing/LandingSteps.svelte';

	let { data } = $props();
</script>

<Seo
	title={`${data.site.name} — ${m.home_seo_title()}`}
	description={m.home_seo_description()}
	canonical={canonicalUrl('/')}
	siteName={data.site.name}
/>

<!-- The ten deck blocks, in deck order. Blocks 8 (Authority) and 10
     (Testimonials) are deliberately absent — the deck forbids shipping them
     as placeholders. -->
<LandingHero siteName={data.site.name} />
<LandingCost />
<LandingPatterns patterns={data.patterns} />
<LandingReframe />
<LandingSteps />
<LandingNightMap>
	{#snippet segmentExtra(segment)}
		<!-- BS-6: the deck's "name which SKUs support that phase" — real seeded
		     catalogue products, each linking to its shop page. -->
		<p class="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-(--color-night-muted)">
			{m.home_nightmap_sku_label()}
		</p>
		<ul class="mt-2.5 flex flex-wrap gap-2">
			{#each data.nightMapSkus[segment.key] as sku (sku.slug)}
				<li>
					<a
						href={resolve('/(public)/magazin/[slug]', { slug: sku.slug })}
						data-testid="nightmap-sku-link"
						class="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-(--color-night-ink) transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.04] hover:border-(--color-moon)/40 active:scale-[0.97]"
					>
						{sku.label}
					</a>
				</li>
			{/each}
		</ul>
	{/snippet}
</LandingNightMap>
<LandingProof />
<LandingObjections />
<LandingRisk />
<LandingFinalCta />
