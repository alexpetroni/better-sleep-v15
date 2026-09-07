import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// The Svelte plugin compiles rune modules (`*.svelte.ts`, e.g. the form-state
	// controller) so unit tests can import them. Tests run in the node
	// environment by default; a test that needs the DOM (storage, timers on
	// `window`) opts in per file with `// @vitest-environment jsdom`.
	plugins: [svelte()],
	test: {
		include: ['tests/unit/**/*.test.ts']
	}
});
