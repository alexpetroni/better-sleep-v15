<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Eyebrow from './Eyebrow.svelte';
	import { reveal } from './reveal.ts';

	// Deck block 9: the four purchase blockers, killed explicitly. Native
	// <details>/<summary> — keyboard and screen-reader accessible for free.
	const objections = [
		{ question: m.home_objection_1_q(), answer: m.home_objection_1_a() },
		{ question: m.home_objection_2_q(), answer: m.home_objection_2_a() },
		{ question: m.home_objection_3_q(), answer: m.home_objection_3_a() },
		{ question: m.home_objection_4_q(), answer: m.home_objection_4_a() }
	];
</script>

<section data-testid="landing-objections" class="relative overflow-hidden py-24 md:py-32">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div class="mx-auto max-w-2xl">
			<div use:reveal aria-hidden="true">
				<!-- Numbered by render position (L-10): deck blocks 8/10 don't ship,
				     so the visible sequence must not skip. -->
				<Eyebrow label="08" />
			</div>
			<h2
				use:reveal={{ delay: 90 }}
				class="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl"
			>
				{m.home_objections_heading()}
			</h2>

			<div class="mt-12 space-y-4">
				{#each objections as objection, i (objection.question)}
					<div use:reveal={{ delay: i * 80 }}>
						<details
							data-testid="objection-item"
							class="group rounded-[1.75rem] bg-black/5 p-1.5 ring-1 ring-black/5"
						>
							<summary
								class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[calc(1.75rem-0.375rem)] bg-white px-6 py-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] [&::-webkit-details-marker]:hidden"
							>
								<span class="text-base font-bold">„{objection.question}”</span>
								<span
									aria-hidden="true"
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 transition-transform duration-500 ease-glide group-open:rotate-45"
								>
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									>
										<path d="M12 5v14M5 12h14" />
									</svg>
								</span>
							</summary>
							<p class="px-6 pt-4 pb-5 text-sm leading-relaxed text-(--color-ink)/75">
								{objection.answer}
							</p>
						</details>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
