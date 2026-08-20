<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 5: three steps, no more. Anchor target of the hero's
	// secondary CTA ("Vezi cum funcționează").
	const steps = [
		{ number: '01', title: m.home_steps_1_title(), body: m.home_steps_1_body() },
		{ number: '02', title: m.home_steps_2_title(), body: m.home_steps_2_body() },
		{ number: '03', title: m.home_steps_3_title(), body: m.home_steps_3_body() }
	];
</script>

<section
	id="cum-functioneaza"
	data-testid="landing-steps"
	class="relative scroll-mt-8 overflow-hidden py-24 md:py-32"
>
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div use:reveal aria-hidden="true">
			<Eyebrow label="05" />
		</div>
		<h2 use:reveal={{ delay: 90 }} class="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
			{m.home_steps_heading()}
		</h2>

		<ol class="mt-14 grid gap-6 md:grid-cols-3">
			{#each steps as step, i (step.number)}
				<li
					use:reveal={{ delay: i * 110 }}
					class="rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-black/5"
				>
					<div
						class="h-full rounded-[calc(2rem-0.375rem)] bg-white p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-8"
					>
						<span
							aria-hidden="true"
							class="text-sm font-bold tracking-[0.2em] text-(--color-brand) tabular-nums"
						>
							{step.number}
						</span>
						<h3 class="mt-3 text-xl font-bold">{step.title}</h3>
						<p class="mt-3 text-sm leading-relaxed text-(--color-ink)/70">{step.body}</p>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>
