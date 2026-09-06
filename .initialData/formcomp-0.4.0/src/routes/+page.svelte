<script lang="ts">
	import { resolve } from '$app/paths';
	import { MultiStepForm } from '$lib/index.js';
	import type { FormCallbacks } from '$lib/types.js';
	import { sleepAssessmentConfig } from '$examples';

	const callbacks: FormCallbacks = {
		onStepComplete(stepId, stepIndex) {
			console.log(`Step completed: ${stepId} (index: ${stepIndex})`);
		},
		onStepChange(from, to) {
			console.log(`Step changed: ${from} → ${to}`);
		},
		onFormComplete(allResponses) {
			console.log('Form completed!', allResponses);
			alert('Form submitted! Check console for data.');
		}
	};
</script>

<div class="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-4xl">
		<div class="text-right mb-2">
			<a
				href={resolve('/examples')}
				class="text-sm text-muted-foreground hover:text-foreground"
			>
				Browse all examples →
			</a>
		</div>
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold tracking-tight">Better Sleep Assessment</h1>
			<p class="mt-2 text-muted-foreground">Demo of the config-driven multi-step form</p>
		</div>
		<MultiStepForm config={sleepAssessmentConfig} {callbacks} />
	</div>
</div>
