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
		class?: string;
	}

	let { value = $bindable(false), onchange, name = 'consent', label, tooltip, warning = false, class: className }: Props = $props();

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
		onchange={handleChange}
		class={cn(controlBase, 'mt-0.5')}
	/>
	{#if label}
		<FieldLabel forId={name} text={label} {tooltip} class="cursor-pointer font-normal" />
	{/if}
</div>
