<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The landing's double-bezel card (L-10): a soft dark rim (outer) around an
	 * inset-highlighted face (inner). Extracted from four copy-pasted blocks
	 * (cost, patterns, steps, risk); the objections block keeps its own inline
	 * variant because there the white face is the <summary> and the answer
	 * paragraph sits on the rim itself.
	 *
	 * Radii are a closed set — Tailwind only generates classes it can see
	 * statically, so the two variants are spelled out rather than interpolated.
	 */
	interface Props {
		radius?: '2rem' | '1.75rem';
		/** Extra classes for the outer rim (sizing/positioning). */
		class?: string;
		/** Face classes (background, padding, layout); the inset highlight is built in. */
		innerClass?: string;
		children: Snippet;
	}
	let { radius = '2rem', class: outerClass = '', innerClass = '', children }: Props = $props();
</script>

<div
	class={[
		radius === '2rem' ? 'rounded-[2rem]' : 'rounded-[1.75rem]',
		'bg-black/5 p-1.5 ring-1 ring-black/5',
		outerClass
	]}
>
	<div
		class={[
			radius === '2rem' ? 'rounded-[calc(2rem-0.375rem)]' : 'rounded-[calc(1.75rem-0.375rem)]',
			'shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]',
			innerClass
		]}
	>
		{@render children()}
	</div>
</div>
