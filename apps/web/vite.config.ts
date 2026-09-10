import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadRootEnv } from './scripts/env.ts';

// The .env lives at the repo root, shared with docker compose and drizzle-kit.
// Load it into process.env for dev/preview/test; existing env vars win. It also
// rewrites the compose-service URLs to the hostname reachable from this process
// (localhost on the host, host.docker.internal from a sibling container), so
// vitest/dev work from either without anyone editing .env.
loadRootEnv();

/**
 * The git commit baked into the build, reported by the liveness probe
 * (/api/health, FIX-16) so an operator can tell WHICH build answers. Vercel
 * exposes it as an env var at build time; elsewhere ask git; a tarball
 * without either reports 'unknown' rather than failing the build.
 */
function buildCommit(): string {
	if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
	try {
		return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	envDir: '../../',
	define: { __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
	plugins: [
		tailwindcss(),
		// Adapter, CSRF and CSP live in svelte.config.js (the conventional file,
		// which Vercel's preset expects); passing them here would make kit ignore it.
		sveltekit(),
		paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./tests/vitest-setup.ts'],
					// Integration specs reset and re-migrate the shared test database;
					// running spec files concurrently would have them race each other.
					fileParallelism: false
				}
			}
		]
	}
});
