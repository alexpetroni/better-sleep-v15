<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The landing's paper card (2026-09-09 redesign, formerly the double
	 * bezel): a white face on the cream ground, carried by a hairline and one
	 * soft, deep, warm shadow (`shadow-paper`), lifting a notch on hover. The
	 * outer/inner split survives so the four callers (cost, patterns, steps,
	 * risk) keep their API; the objections block keeps its own inline variant
	 * because there the face is the <summary>.
	 *
	 * Radii are a closed set — Tailwind only generates classes it can see
	 * statically, so the two variants are spelled out rather than interpolated.
	 */
	interface Props {
		radius?: '2rem' | '1.75rem';
		/** Extra classes for the outer shell (sizing/positioning). */
		class?: string;
		/** Face classes (background, padding, layout). */
		innerClass?: string;
		children: Snippet;
	}
	let { radius = '2rem', class: outerClass = '', innerClass = '', children }: Props = $props();
</script>

<div
	class={[
		radius === '2rem' ? 'rounded-[2rem]' : 'rounded-[1.75rem]',
		'group/card shadow-paper transition-[transform,box-shadow] duration-500 ease-glide hover:-translate-y-1 hover:shadow-paper-lg',
		outerClass
	]}
>
	<div
		class={[
			radius === '2rem' ? 'rounded-[2rem]' : 'rounded-[1.75rem]',
			'overflow-hidden',
			innerClass
		]}
	>
		{@render children()}
	</div>
</div>
