<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';
</script>

<!-- Deck block 11: sits immediately above the final CTA. -->
<section data-testid="landing-risk" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal class="mx-auto max-w-3xl rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-black/5">
			<div
				class="rounded-[calc(2rem-0.375rem)] bg-(--color-brand-soft)/40 px-7 py-12 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:px-12"
			>
				<div aria-hidden="true">
					<Eyebrow label="11" />
				</div>
				<p class="mt-6 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
					{m.home_risk_line_a()}
				</p>
				<p class="mt-3 text-lg text-(--color-ink)/70">{m.home_risk_line_b()}</p>
				<p class="mt-6 text-sm font-semibold tracking-wide text-(--color-brand)">
					{m.home_risk_subscription()}
				</p>
			</div>
		</div>
	</div>
</section>
