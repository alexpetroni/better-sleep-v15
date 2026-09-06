<script lang="ts">
	import { getContext } from 'svelte';
	import {
		FORM_STATE_KEY, STEP_ID_KEY, FORM_ID_KEY,
		type FormStateAdapter, type Question
	} from '../../types.js';
	import { cn, scopedId } from '../../utils.js';
	import { warningRing, optionFocus } from '../../styles.js';
	import { useTranslate } from '../../i18n.js';

	interface Props {
		questions: Question[];
		/** Ring the whole component and mark every row invalid (standalone use). */
		warning?: boolean;
		/** Ids of the rows in warning: only those rows get the ring and aria-invalid (likert-batch use). */
		warningIds?: string[];
		/** Id of the element describing the rows in warning, e.g. the group's error message. */
		describedBy?: string;
		class?: string;
	}

	let { questions, warning = false, warningIds = [], describedBy, class: className }: Props = $props();

	const state = getContext<FormStateAdapter>(FORM_STATE_KEY);
	const stepId = getContext<string>(STEP_ID_KEY);
	const formId = getContext<string | undefined>(FORM_ID_KEY);

	const translate = useTranslate();

	const scaleOptions = $derived(questions[0]?.options ?? []);

	/** Radio `name` of a row (and id base): prefixed per form instance, raw outside a form. */
	const rowName = (question: Question) => scopedId(formId, question.id);
	/** DOM id of a statement cell; the row's radiogroup is labelled by it. */
	const statementId = (question: Question) => `formcomp-likert-${rowName(question)}-statement`;

	function getQuestionValue(questionId: string): string | undefined {
		return state.getResponse(stepId, questionId) as string | undefined;
	}

	function setQuestionValue(questionId: string, value: string) {
		state.setResponse(stepId, questionId, value);
	}
</script>

<div
	class={cn(
		'space-y-3 rounded-(--form-radius) p-1',
		warning && cn(warningRing, 'p-4'),
		className
	)}
>
	<!-- Scale header (desktop only). Hidden from assistive technology: every
	     radio already carries its option label as its accessible name. -->
	{#if scaleOptions.length > 0}
		<div aria-hidden="true" class="hidden sm:grid sm:gap-2" style="grid-template-columns: 1fr repeat({scaleOptions.length}, minmax(0, 1fr))">
			<div></div>
			{#each scaleOptions as option (option.value)}
				<div class="text-center text-xs text-(--form-muted) font-medium">{translate(option.label)}</div>
			{/each}
		</div>
	{/if}

	<!-- Question rows: one radiogroup per statement, named by the statement.
	     The radios of a row share one name, so arrow keys stay within the row. -->
	{#each questions as question (question.id)}
		{@const currentValue = getQuestionValue(question.id)}
		{@const rowFailing = warningIds.includes(question.id)}
		{@const rowWarning = warning || rowFailing}
		<!-- Required/invalid state lives on the row's radiogroup: ARIA has neither
		     aria-required nor aria-invalid on the radio role. -->
		<div
			role="radiogroup"
			aria-labelledby={statementId(question)}
			aria-required={question.required || undefined}
			aria-invalid={rowWarning || undefined}
			aria-describedby={rowWarning ? describedBy : undefined}
			class={cn(
				'sm:grid sm:gap-2 sm:items-center border-b border-(--form-border) pb-3 last:border-0 last:pb-0',
				rowFailing && cn(warningRing, 'rounded-(--form-radius) p-2')
			)}
			style="grid-template-columns: 1fr repeat({scaleOptions.length}, minmax(0, 1fr))"
		>
			<div id={statementId(question)} class="text-sm mb-2 sm:mb-0">
				{translate(question.label)}
				{#if question.required}
					<!-- The visible required marker, as in FieldLabel. It is aria-hidden, so
					     the row's name (aria-labelledby → this cell) stays the statement. -->
					<span aria-hidden="true" class="ml-0.5 font-medium text-(--form-error)">*</span>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2 sm:contents">
				{#each scaleOptions as option (option.value)}
					{@const selected = currentValue === option.value}
					<label
						class={cn(
							'flex cursor-pointer items-center justify-center rounded-(--form-radius) px-3 py-2 text-sm font-medium border transition-all sm:flex-1',
							optionFocus,
							selected
								? 'bg-(--form-accent) text-(--form-accent-foreground) border-(--form-accent)'
								: 'border-(--form-border) bg-(--form-bg) hover:bg-(--form-accent)/10',
							question.optionClass
						)}
					>
						<input
							type="radio"
							name={rowName(question)}
							value={option.value}
							checked={selected}
							onchange={() => setQuestionValue(question.id, option.value)}
							class="sr-only"
						/>
						<!-- The option label stays in the DOM at every viewport; on desktop it
						     is only visually hidden (sr-only, never display:none) so it remains
						     the radio's accessible name. The bullet is decoration. -->
						<span class="sm:sr-only">{translate(option.label)}</span>
						<span class="hidden sm:inline" aria-hidden="true">&bull;</span>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</div>
