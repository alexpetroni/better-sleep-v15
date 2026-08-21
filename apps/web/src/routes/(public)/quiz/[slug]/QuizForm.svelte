<script lang="ts">
	import { createFormState, MultiStepForm, type FormConfig } from 'formcomp';
	import 'formcomp/theme.css';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	interface Props {
		quiz: PageData['quiz'];
	}
	let { quiz }: Props = $props();

	// Config and form state are created ONCE at mount (L-5): a load
	// invalidation must never recreate the form state mid-fill or rotate the
	// `x-quiz-attempt` idempotency token (a replayed POST of the same answers
	// must dedupe server-side). The parent's {#key data.quiz.slug} remounts
	// this component when navigating between quizzes.
	// svelte-ignore state_referenced_locally
	const config: FormConfig = {
		...quiz.formSchema,
		version: quiz.version,
		settings: {
			nextLabel: m.quiz_next(),
			backLabel: m.quiz_back(),
			submitLabel: m.quiz_submit(),
			requiredMessage: m.quiz_required(),
			invalidMessage: m.quiz_invalid(),
			submitErrorMessage: m.quiz_submit_error(),
			...quiz.formSchema.settings
		},
		submit: {
			url: `/quiz/${quiz.slug}/submit`,
			// Per-attempt idempotency token: a retried/replayed POST of the same
			// answers must not create a second result row (server dedupes on it).
			headers: { 'x-quiz-attempt': crypto.randomUUID() }
		}
	};
	const state = createFormState(config, {
		// svelte-ignore state_referenced_locally
		storageKey: `quiz-${quiz.slug}`,
		// svelte-ignore state_referenced_locally
		version: quiz.version
	});
</script>

<div class="formcomp">
	<MultiStepForm {config} {state} />
</div>
