<script lang="ts">
	// Pill CTA with the nested trailing-icon circle; scales on hover/press,
	// the inner circle drifts diagonally — transform/opacity only.
	// `brand` is the ink pill on paper; `moon` the apricot pill on night ground.
	let {
		href,
		label,
		variant = 'brand',
		testid
	}: {
		href: string;
		label: string;
		variant?: 'brand' | 'moon';
		testid?: string;
	} = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass an already-resolve()d href -->
<a
	{href}
	data-testid={testid}
	class={[
		'group inline-flex items-center gap-3 rounded-full py-3 pr-2 pl-7 text-base font-semibold transition-[transform,box-shadow] duration-500 ease-glide hover:scale-[1.02] active:scale-[0.98]',
		variant === 'moon'
			? 'bg-(--color-moon) text-(--color-night) shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--color-moon)_60%,transparent)]'
			: 'bg-(--color-brand) text-(--color-night-ink) shadow-[0_16px_32px_-14px_color-mix(in_oklab,var(--color-brand)_70%,transparent)]'
	]}
>
	{label}
	<span
		aria-hidden="true"
		class={[
			'flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-glide group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105',
			variant === 'moon' ? 'bg-(--color-night)/10' : 'bg-white/12'
		]}
	>
		<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M4 12h15m0 0-6-6m6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</span>
</a>
