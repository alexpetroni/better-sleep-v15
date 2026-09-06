<script lang="ts">
	import { getContext } from 'svelte';
	import {
		FORM_STATE_KEY, STEP_ID_KEY, FORM_ID_KEY,
		type FormStateAdapter, type QuestionGroup
	} from '../../types.js';
	import { scopedId, groupAlertId } from '../../utils.js';
	import { evaluateCondition } from '../../conditions/evaluator.js';
	import { questionStatus } from '../../validation/validator.js';
	import QuestionGroupWrapper from '../layout/QuestionGroupWrapper.svelte';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import LikertGroup from '../inputs/LikertGroup.svelte';

	interface Props {
		group: QuestionGroup;
		warningGroupId?: string | null;
		warningMessage?: string;
	}

	let { group, warningGroupId = null, warningMessage }: Props = $props();

	const state = getContext<FormStateAdapter>(FORM_STATE_KEY);
	const stepId = getContext<string>(STEP_ID_KEY);
	const formId = getContext<string | undefined>(FORM_ID_KEY);

	const isWarning = $derived(warningGroupId === group.id);

	// The wrapper's id base is prefixed per form instance (see FORM_ID_KEY);
	// the alert rendered by QuestionGroupWrapper while the group is in warning
	// derives from it, and failing controls reference it with aria-describedby.
	const wrapperId = $derived(scopedId(formId, group.id));
	const alertId = $derived(groupAlertId(wrapperId));

	// Filter visible questions based on conditions
	const visibleQuestions = $derived(
		group.questions.filter((q) => {
			if (!q.condition) return true;
			return evaluateCondition(
				q.condition,
				(sid, qid) => state.getResponse(sid, qid),
				stepId
			);
		})
	);

	// While this is the warning group, only the questions that actually fail
	// get the field ring and aria-invalid — not every question in the group.
	// Derived from the live answers, so a corrected field drops its ring at
	// once; the group ring and message stay until the next attempt.
	const failingIds = $derived(
		isWarning
			? visibleQuestions
					.filter((q) => questionStatus(q, state.getResponse(stepId, q.id)) !== 'ok')
					.map((q) => q.id)
			: []
	);

	// Check if group itself is visible
	const groupVisible = $derived(
		!group.condition ||
		evaluateCondition(
			group.condition,
			(sid, qid) => state.getResponse(sid, qid),
			stepId
		)
	);

	// Clear stored answers of questions that become hidden, so stale values
	// can't keep dependent conditions alive or leak into the submission.
	// Clearing may cascade (hiding one question can hide the next); the effect
	// re-runs until nothing is left to clear.
	$effect(() => {
		const hidden = groupVisible
			? group.questions.filter((q) => !visibleQuestions.includes(q))
			: group.questions;
		for (const question of hidden) {
			if (state.getResponse(stepId, question.id) !== undefined) {
				state.setResponse(stepId, question.id, undefined);
			}
		}
	});

	const gridColsClass = $derived(
		group.layout?.columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-6' :
		group.layout?.columns === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-6' :
		''
	);
</script>

{#if groupVisible && visibleQuestions.length > 0}
	<QuestionGroupWrapper id={wrapperId} label={group.label} intro={group.intro} warning={isWarning} {warningMessage} class={group.class}>
		{#if group.renderMode === 'likert-batch'}
			<!-- All questions rendered as a single LikertGroup -->
			<LikertGroup questions={visibleQuestions} warningIds={failingIds} describedBy={isWarning ? alertId : undefined} />
		{:else}
			<!-- individual (default): each question gets its own space, in a
			     layout.columns grid when set. 'inline' is a deprecated alias
			     of this branch — it never rendered anything different. -->
			<div class={gridColsClass || 'space-y-6'}>
				{#each visibleQuestions as question (question.id)}
					{@const failing = failingIds.includes(question.id)}
					<QuestionRenderer {question} warning={failing} describedBy={failing ? alertId : undefined} />
				{/each}
			</div>
		{/if}
	</QuestionGroupWrapper>
{/if}
