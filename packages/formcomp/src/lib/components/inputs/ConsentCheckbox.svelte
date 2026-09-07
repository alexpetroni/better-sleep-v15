<script lang="ts">
	import { cn } from '../../utils.js';
	import { warningRing, controlBase } from '../../styles.js';
	import FieldLabel from './FieldLabel.svelte';

	interface Props {
		value?: boolean;
		onchange?: (value: boolean) => void;
		name?: string;
		label?: string;
		tooltip?: string;
		warning?: boolean;
		/** Mark the control(s) as required (aria-required) and show the label marker. */
		required?: boolean;
		/** Id of the element describing the control(s), e.g. the group's error message (aria-describedby). */
		describedBy?: string;
		class?: string;
	}

	let { value = $bindable(false), onchange, name = 'consent', label, tooltip, warning = false, required = false, describedBy, class: className }: Props = $props();

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.checked;
		onchange?.(input.checked);
	}
</script>

<div class={cn('flex items-start gap-3 rounded-(--form-radius) p-1', warning && cn(warningRing, 'p-4'), className)}>
	<input
		type="checkbox"
		id={name}
		{name}
		checked={value === true}
		aria-required={required || undefined}
		aria-invalid={warning || undefined}
		aria-describedby={describedBy}
		onchange={handleChange}
		class={cn(controlBase, 'mt-0.5')}
	/>
	{#if label}
		<!-- One flex item for label + required marker -->
		<div>
			<FieldLabel forId={name} text={label} {tooltip} {required} class="cursor-pointer font-normal" />
		</div>
	{/if}
</div>
