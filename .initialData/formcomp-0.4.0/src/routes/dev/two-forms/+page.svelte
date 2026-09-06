<script lang="ts">
	import { MultiStepForm, createFormState } from '$lib/index.js';
	import { minimalConfig } from '$examples';

	// Two instances of the same config on one page: every DOM id (inputs,
	// group wrappers, alerts, likert statements) and every radio `name` must
	// be unique per instance, so labels resolve to their own input and the
	// forms validate independently (R-9). The controllers do not persist —
	// with a shared storage key the two forms would cross-talk.
	const first = createFormState(minimalConfig, { persist: false });
	const second = createFormState(minimalConfig, { persist: false });
</script>

<svelte:head>
	<title>Two forms on one page — formComp dev</title>
</svelte:head>

<div class="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-4xl space-y-12">
		<div class="text-center">
			<h1 class="text-3xl font-bold tracking-tight">Two forms on one page</h1>
			<p class="mt-2 text-muted-foreground">
				Dev route for the per-instance id test — not linked from the gallery.
			</p>
		</div>

		<section aria-labelledby="two-forms-first" class="rounded-lg border p-6">
			<h2 id="two-forms-first" class="mb-4 text-xl font-semibold">Form A</h2>
			<MultiStepForm config={minimalConfig} state={first} />
		</section>

		<section aria-labelledby="two-forms-second" class="rounded-lg border p-6">
			<h2 id="two-forms-second" class="mb-4 text-xl font-semibold">Form B</h2>
			<MultiStepForm config={minimalConfig} state={second} />
		</section>
	</div>
</div>
