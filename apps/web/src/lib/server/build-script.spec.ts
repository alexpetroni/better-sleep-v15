import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vercel build regression (2026-09-10): `packages/formcomp` is vendored with
 * its `dist/` gitignored and produced by the ROOT `prepare` script at
 * install time. A Vercel deploy that restores its build cache and finds the
 * lockfile unchanged runs no install ("Already up to date"), so no
 * `prepare` runs, `dist/` never exists in the fresh clone, and the web build
 * dies with ERR_MODULE_NOT_FOUND on `formcomp/dist/...`. Deploys that
 * happened to change the lockfile masked it. The web build must therefore
 * produce formcomp's dist itself, never rely on install-time lifecycle.
 */
describe('formcomp is packaged exactly once per install', () => {
	// Vercel deploy failure 2026-09-10 (commit b8bde1a): the ROOT `prepare`
	// (`pnpm --filter formcomp package`) and formcomp's OWN `prepare`
	// (`npm run package`) both ran during `pnpm install`, racing on
	// `packages/formcomp/dist` — svelte-package's rimraf hit ENOTEMPTY while
	// the other process was writing, and the install (so the deploy) failed.
	// Earlier deploys won that race by luck. formcomp packages itself on
	// install; the root must not do it a second time in parallel.
	it('the root package.json has no prepare script packaging formcomp', () => {
		const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../../../../package.json'), 'utf8')) as {
			scripts: Record<string, string>;
		};
		expect(pkg.scripts.prepare ?? '').not.toMatch(/formcomp/);
	});

	it("formcomp's own prepare packages it", () => {
		const pkg = JSON.parse(
			readFileSync(path.resolve(import.meta.dirname, '../../../../../packages/formcomp/package.json'), 'utf8')
		) as { scripts: Record<string, string> };
		expect(pkg.scripts.prepare).toMatch(/package/);
	});
});

describe('apps/web build script', () => {
	it('packages formcomp before vite build (no reliance on install-time prepare)', () => {
		const pkg = JSON.parse(
			readFileSync(path.resolve(import.meta.dirname, '../../../package.json'), 'utf8')
		) as {
			scripts: Record<string, string>;
		};
		const build = pkg.scripts.build;
		expect(build).toMatch(/pnpm --filter formcomp package && vite build$/);
	});
});
