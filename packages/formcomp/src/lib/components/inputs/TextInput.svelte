<script lang="ts">
	import { cn } from '../../utils.js';
	import { inputBase, warningField } from '../../styles.js';
	import { useTranslate } from '../../i18n.js';
	import FieldLabel from './FieldLabel.svelte';

	interface Props {
		value?: string | undefined;
		onchange?: (value: string) => void;
		name?: string;
		label?: string;
		tooltip?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'url';
		warning?: boolean;
		/** Mark the control(s) as required (aria-required) and show the label marker. */
		required?: boolean;
		/** Id of the element describing the control(s), e.g. the group's error message (aria-describedby). */
		describedBy?: string;
		class?: string;
	}

	let { value = $bindable(), onchange, name = 'text', label, tooltip, placeholder, type = 'text', warning = false, required = false, describedBy, class: className }: Props = $props();

	const translate = useTranslate();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.value;
		onchange?.(input.value);
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<FieldLabel forId={name} text={label} {tooltip} {required} />
	{/if}
	<input
		{type}
		{name}
		id={name}
		value={value ?? ''}
		{placeholder}
		aria-required={required || undefined}
		aria-invalid={warning || undefined}
		aria-describedby={describedBy}
		oninput={handleInput}
		class={cn(inputBase, warning && warningField)}
	/>
</div>
