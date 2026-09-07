<script lang="ts">
	import { cn } from '../../utils.js';
	import { inputBase, warningField } from '../../styles.js';
	import { useTranslate } from '../../i18n.js';
	import FieldLabel from './FieldLabel.svelte';

	interface Props {
		value?: number | undefined;
		onchange?: (value: number | undefined) => void;
		name?: string;
		label?: string;
		tooltip?: string;
		min?: number;
		max?: number;
		step?: number;
		placeholder?: string;
		unit?: string;
		warning?: boolean;
		/** Mark the control(s) as required (aria-required) and show the label marker. */
		required?: boolean;
		/** Id of the element describing the control(s), e.g. the group's error message (aria-describedby). */
		describedBy?: string;
		class?: string;
	}

	let { value = $bindable(), onchange, name = 'number', label, tooltip, min, max, step, placeholder, unit, warning = false, required = false, describedBy, class: className }: Props = $props();

	const translate = useTranslate();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Store what was typed (undefined for empty or not a number). Nothing is
		// clamped to min/max: an out-of-range value must reach validation so it
		// is reported with invalidMessage instead of being silently rewritten.
		// min/max/step stay on the element as hints for the native spinner.
		const num = parseFloat(input.value);
		value = Number.isNaN(num) ? undefined : num;
		onchange?.(value);
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<FieldLabel forId={name} text={label} {tooltip} {required} />
	{/if}
	<div class="relative">
		<input
			type="number"
			{name}
			id={name}
			{min}
			{max}
			{step}
			value={value ?? ''}
			{placeholder}
			aria-required={required || undefined}
			aria-invalid={warning || undefined}
			aria-describedby={describedBy}
			onchange={handleInput}
			class={cn(inputBase, unit && 'pr-12', warning && warningField)}
		/>
		{#if unit}
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
				<span class="text-(--form-muted) text-sm">{translate(unit)}</span>
			</div>
		{/if}
	</div>
</div>
