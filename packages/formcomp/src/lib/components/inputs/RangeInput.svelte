<script lang="ts">
	import type { RangeValue } from '../../types.js';
	import { cn } from '../../utils.js';
	import { inputBase, warningField } from '../../styles.js';
	import { useTranslate } from '../../i18n.js';
	import FieldLabel from './FieldLabel.svelte';

	interface Props {
		value?: RangeValue | undefined;
		onchange?: (value: RangeValue | undefined) => void;
		name?: string;
		label?: string;
		tooltip?: string;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		/** Label above the lower field. Default: 'From'. */
		minLabel?: string;
		/** Label above the upper field. Default: 'To'. */
		maxLabel?: string;
		warning?: boolean;
		/** Mark the control(s) as required (aria-required) and show the label marker. */
		required?: boolean;
		/** Id of the element describing the control(s), e.g. the group's error message (aria-describedby). */
		describedBy?: string;
		class?: string;
	}

	let {
		value = $bindable(),
		onchange,
		name = 'range',
		label,
		tooltip,
		min,
		max,
		step,
		unit,
		minLabel = 'From',
		maxLabel = 'To',
		warning = false,
		required = false,
		describedBy,
		class: className
	}: Props = $props();

	const translate = useTranslate();

	/** The typed number, undefined for empty or not a number. Not clamped: validation reports out-of-range ends. */
	function parseField(raw: string): number | undefined {
		const num = parseFloat(raw);
		return Number.isNaN(num) ? undefined : num;
	}

	function handleChange(field: 'from' | 'to', e: Event) {
		const num = parseField((e.target as HTMLInputElement).value);
		const next: RangeValue = { ...value, [field]: num };
		if (next.from === undefined && next.to === undefined) {
			value = undefined;
		} else {
			value = next;
		}
		onchange?.(value);
	}
</script>

<fieldset class={className} aria-label={label ? undefined : name}>
	{#if label}
		<FieldLabel tag="legend" text={label} {tooltip} {required} />
	{/if}
	<div class="grid grid-cols-2 gap-4">
		{#each [['from', minLabel], ['to', maxLabel]] as const as [field, fieldLabel] (field)}
			{@const id = `${name}-${field}`}
			<div class="space-y-1">
				<label for={id} class="text-xs font-medium text-(--form-muted)">{translate(fieldLabel)}</label>
				<div class="relative">
					<input
						type="number"
						name={id}
						{id}
						{min}
						{max}
						{step}
						value={value?.[field] ?? ''}
						aria-required={required || undefined}
						aria-invalid={warning || undefined}
						aria-describedby={describedBy}
						onchange={(e) => handleChange(field, e)}
						class={cn(inputBase, unit && 'pr-12', warning && warningField)}
					/>
					{#if unit}
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
							<span class="text-(--form-muted) text-sm">{translate(unit)}</span>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</fieldset>
