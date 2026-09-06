<script lang="ts">
	import { useTranslate } from '../../i18n.js';
	import { cn } from '../../utils.js';
	import { labelBase } from '../../styles.js';

	interface Props {
		/** Render as <label for={forId}> or as <legend> inside a fieldset */
		tag?: 'label' | 'legend';
		forId?: string;
		text: string;
		/**
		 * Help text. Rendered as an info button after the label (named by the
		 * text, with `title` for hover) that toggles a visible description
		 * below the label; Escape closes it.
		 */
		tooltip?: string;
		/** Show the required marker (a red asterisk) after the label text. */
		required?: boolean;
		class?: string;
	}

	let { tag = 'label', forId, text, tooltip, required = false, class: className }: Props = $props();

	const translate = useTranslate();
	const tooltipText = $derived(tooltip ? translate(tooltip) : undefined);

	// The tooltip description stays in the DOM (hidden) so the button's
	// aria-controls always resolves; its id is unique per instance and stable
	// across SSR and hydration, so several forms on one page do not collide.
	let open = $state(false);
	const uid = $props.id();
	const descriptionId = `${uid}-tooltip`;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) open = false;
	}
</script>

<svelte:element
	this={tag}
	for={tag === 'label' ? forId : undefined}
	class={cn(labelBase, tag === 'legend' && 'mb-3', className)}
>
	{translate(text)}
	{#if tag === 'legend'}
		{#if required}
			{@render marker()}
		{/if}
		{#if tooltipText}
			{@render info(tooltipText)}
		{/if}
	{/if}
</svelte:element>
{#if tag === 'label' && (required || tooltipText)}
	<!-- One inline wrapper: a direct child of the inputs' space-y container
	     would pick up its vertical margin and push the button off the baseline. -->
	<span>
		{#if required}
			{@render marker()}
		{/if}
		{#if tooltipText}
			{@render info(tooltipText)}
		{/if}
	</span>
{/if}
{#if tooltipText}
	<p id={descriptionId} hidden={!open} class="mt-1 text-sm text-(--form-muted)">{tooltipText}</p>
{/if}

<!-- The marker is aria-hidden so the accessible name stays the label text.
     Next to a <label> it is rendered as a following sibling, not inside: tools
     that read a label's full text content (Playwright's getByLabel, for one)
     ignore aria-hidden, so an asterisk inside the label would change the label
     text they see. A <legend> is followed by the fieldset content on a new
     line, so its marker sits inside the legend. -->
{#snippet marker()}
	<span aria-hidden="true" class="ml-0.5 text-sm font-medium text-(--form-error)">*</span>
{/snippet}

<!-- The tooltip is a real button, so keyboard and touch users reach it. It
     follows the marker and, next to a <label>, sits outside the label: it is
     interactive content of its own, so activating it never focuses or
     toggles the labelled control, and the label text stays the control's
     accessible name. Inside a <legend> for the same reason as the marker. -->
{#snippet info(description: string)}
	<button
		type="button"
		title={description}
		aria-label={description}
		aria-expanded={open}
		aria-controls={descriptionId}
		onclick={() => (open = !open)}
		onkeydown={handleKeydown}
		class="ml-1 inline-flex cursor-help rounded-sm align-text-bottom text-(--form-muted) transition-colors hover:text-(--form-fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--form-accent)/40"
	>
		<svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="10" />
			<path d="M12 16v-4" /><path d="M12 8h.01" />
		</svg>
	</button>
{/snippet}
