<script lang="ts">
	import { getContext } from 'svelte';
	import {
		FORM_STATE_KEY, STEP_ID_KEY, FORM_ID_KEY,
		type FormStateAdapter, type Question
	} from '../../types.js';
	import { scopedId } from '../../utils.js';
	import RadioListGroup from '../inputs/RadioListGroup.svelte';
	import RadioCardGroup from '../inputs/RadioCardGroup.svelte';
	import CheckboxGroup from '../inputs/CheckboxGroup.svelte';
	import SelectInput from '../inputs/SelectInput.svelte';
	import ScaleInput from '../inputs/ScaleInput.svelte';
	import TimeInput from '../inputs/TimeInput.svelte';
	import DateInput from '../inputs/DateInput.svelte';
	import NumberInput from '../inputs/NumberInput.svelte';
	import RangeInput from '../inputs/RangeInput.svelte';
	import TextInput from '../inputs/TextInput.svelte';
	import TextArea from '../inputs/TextArea.svelte';
	import ConsentCheckbox from '../inputs/ConsentCheckbox.svelte';
	import LikertGroup from '../inputs/LikertGroup.svelte';
	import type { RangeValue } from '../../types.js';

	interface Props {
		question: Question;
		warning?: boolean;
		/** Id of the element describing the question while it is in warning (the group's alert). */
		describedBy?: string;
	}

	let { question, warning = false, describedBy }: Props = $props();

	const state = getContext<FormStateAdapter>(FORM_STATE_KEY);
	const stepId = getContext<string>(STEP_ID_KEY);
	const formId = getContext<string | undefined>(FORM_ID_KEY);

	// DOM id / name base of the input: prefixed with the form instance's id so
	// several forms on one page do not collide; the raw question id when
	// rendered outside a MultiStepForm.
	const name = $derived(scopedId(formId, question.id));

	// Reactive accessor bridging FormStateAdapter ↔ component props
	function getValue(): unknown {
		return state.getResponse(stepId, question.id);
	}

	function setValue(v: unknown) {
		state.setResponse(stepId, question.id, v);
	}
</script>

{#if question.type === 'single-select'}
	{#if question.displayVariant === 'card'}
		<RadioCardGroup
			options={question.options ?? []}
			value={getValue() as string | undefined}
			onchange={(v) => setValue(v)}
			{name}
			label={question.label}
			tooltip={question.tooltip}
			{warning}
			required={question.required}
			{describedBy}
			columns={question.layout?.columns}
			class={question.class}
			optionClass={question.optionClass}
		/>
	{:else}
		<RadioListGroup
			options={question.options ?? []}
			value={getValue() as string | undefined}
			onchange={(v) => setValue(v)}
			{name}
			label={question.label}
			tooltip={question.tooltip}
			{warning}
			required={question.required}
			{describedBy}
			class={question.class}
			optionClass={question.optionClass}
		/>
	{/if}
{:else if question.type === 'multi-select'}
	<CheckboxGroup
		options={question.options ?? []}
		value={getValue() as string[] ?? []}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
		optionClass={question.optionClass}
	/>
{:else if question.type === 'select'}
	<SelectInput
		options={question.options ?? []}
		value={getValue() as string | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		placeholder={question.placeholder}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'likert'}
	<!-- A likert question outside a likert-batch group: a one-row scale with its
	     own header. LikertGroup reads the answer from context, like this renderer. -->
	<LikertGroup questions={[question]} {warning} {describedBy} class={question.class} />
{:else if question.type === 'scale'}
	<ScaleInput
		min={question.min ?? 1}
		max={question.max ?? 10}
		value={getValue() as number | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		minLabel={question.minLabel}
		maxLabel={question.maxLabel}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
		optionClass={question.optionClass}
	/>
{:else if question.type === 'time-input'}
	<TimeInput
		value={getValue() as string | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		step={question.step}
		placeholder={question.placeholder}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'date-input'}
	<DateInput
		value={getValue() as string | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'number-input'}
	<NumberInput
		value={getValue() as number | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		min={question.min}
		max={question.max}
		step={question.step}
		placeholder={question.placeholder}
		unit={question.unit}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'range'}
	<RangeInput
		value={getValue() as RangeValue | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		min={question.min}
		max={question.max}
		step={question.step}
		unit={question.unit}
		minLabel={question.minLabel ?? 'From'}
		maxLabel={question.maxLabel ?? 'To'}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'text-input'}
	<TextInput
		value={getValue() as string | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		type={question.inputType ?? 'text'}
		placeholder={question.placeholder}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'consent'}
	<ConsentCheckbox
		value={getValue() as boolean | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{:else if question.type === 'textarea'}
	<TextArea
		value={getValue() as string | undefined}
		onchange={(v) => setValue(v)}
		{name}
		label={question.label}
		tooltip={question.tooltip}
		placeholder={question.placeholder}
		rows={question.rows}
		{warning}
		required={question.required}
		{describedBy}
		class={question.class}
	/>
{/if}
