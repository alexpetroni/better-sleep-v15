import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Deployment regression (2026-09-09): `sanitize-html` is CommonJS and
 * `require()`s `htmlparser2`. From sanitize-html 2.17.6 that dependency is
 * htmlparser2 ^12, an ESM-only package — loading it needs Node's
 * `require(esm)`, which Vercel's nodejs22.x runtime does not provide. Every
 * route whose server chunk imported the media module (blog, magazin, quiz,
 * pagini, tipuri, sanatate, cos, sitemap, /api/health/ready) then 500'd with
 * ERR_REQUIRE_ESM before its `load` ran. Locally Node 22.12+/24 masks it.
 *
 * The htmlparser2 that sanitize-html resolves must therefore be loadable via
 * `require` — i.e. offer a "require" export condition (a dual package). A
 * bump of sanitize-html that drags in an ESM-only htmlparser2 fails here.
 */
describe('sanitize-html packaging', () => {
	it('resolves an htmlparser2 that CommonJS can require()', () => {
		const require = createRequire(import.meta.url);
		const sanitizeHtmlPkg = require.resolve('sanitize-html/package.json');
		const fromSanitizeHtml = createRequire(sanitizeHtmlPkg);
		// An ESM-only package does not export its package.json, so resolve the
		// entry point and walk up to the named manifest instead of requiring it
		// (dual packages keep a nameless `{ "type": ... }` marker next to each
		// build, which is not the one wanted).
		type Manifest = {
			name?: string;
			version: string;
			type?: string;
			exports?: Record<string, unknown>;
		};
		const readManifest = (dir: string): Manifest | null => {
			const file = path.join(dir, 'package.json');
			return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Manifest) : null;
		};
		let dir = path.dirname(fromSanitizeHtml.resolve('htmlparser2'));
		let htmlparser2Pkg = readManifest(dir);
		while (htmlparser2Pkg?.name !== 'htmlparser2') {
			const parent = path.dirname(dir);
			if (parent === dir) throw new Error('htmlparser2 manifest not found');
			dir = parent;
			htmlparser2Pkg = readManifest(dir);
		}
		const root = htmlparser2Pkg.exports?.['.'];
		const hasRequireCondition = typeof root === 'object' && root !== null && 'require' in root;
		expect(
			hasRequireCondition || htmlparser2Pkg.type !== 'module',
			`sanitize-html resolved htmlparser2@${htmlparser2Pkg.version}, which is ESM-only; ` +
				`CommonJS sanitize-html cannot require() it on runtimes without require(esm)`
		).toBe(true);
	});
});
