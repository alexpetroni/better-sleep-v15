<script lang="ts">
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
<LandingNightMap />
<LandingProof />
<LandingObjections />
<LandingRisk />
<LandingFinalCta />
