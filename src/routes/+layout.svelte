<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	// Preload the two subsets every Romanian page needs (L-10): latin +
	// latin-ext (diacritics). Without the hint the font is discovered only
	// after CSS parses — a wider swap/CLS window than necessary.
	import fontLatin from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url';
	import fontLatinExt from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2?url';

	let { data, children } = $props();

	// E2E hydration marker: tests must not type into inputs with a server-echoed
	// `value` before hydration, because hydration resets them (see e2e/helpers.ts).
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	const themeStyle = $derived(
		Object.entries(data.site.theme)
			.map(([token, value]) => `--${token}: ${value}`)
			.join('; ')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Same-origin font files; `crossorigin` is still required — font fetches
	     are CORS-mode, and a mode mismatch would double-download. -->
	<link rel="preload" as="font" type="font/woff2" href={fontLatin} crossorigin="anonymous" />
	<link rel="preload" as="font" type="font/woff2" href={fontLatinExt} crossorigin="anonymous" />
</svelte:head>

<div class="min-h-screen bg-(--color-surface) text-(--color-ink)" style={themeStyle}>
	{@render children()}
</div>
