<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import BezelCard from './BezelCard.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';
</script>

<!-- Deck block 11: sits immediately above the final CTA. -->
<section data-testid="landing-risk" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal class="mx-auto max-w-3xl">
			<BezelCard innerClass="bg-white px-7 py-12 text-center sm:px-12">
				<div aria-hidden="true">
					<!-- Numbered by render position (L-10), see LandingObjections. -->
					<Eyebrow label="09" />
				</div>
				<p class="mt-6 font-serif text-3xl leading-tight text-balance sm:text-4xl">
					{m.home_risk_line_a()}
				</p>
				<p class="mt-3 text-lg text-(--color-ink)/70">{m.home_risk_line_b()}</p>
				<p class="mt-6 text-sm font-semibold tracking-wide text-(--color-accent)">
					{m.home_risk_subscription()}
				</p>
			</BezelCard>
		</div>
	</div>
</section>
