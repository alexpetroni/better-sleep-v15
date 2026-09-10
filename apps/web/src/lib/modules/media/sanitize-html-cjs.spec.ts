import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/**
 * `sanitize-html` is CommonJS and `require()`s `htmlparser2`, which is
 * ESM-only from sanitize-html 2.17.6 on. Loading it therefore needs Node's
 * `require(esm)`. On 2026-09-09 Vercel's nodejs22.x runtime had none and
 * every route whose server chunk imported the media module 500'd with
 * ERR_REQUIRE_ESM before its `load` ran; the package was pinned to 2.17.5.
 * Since 2026-09-10 the project runs Node 24 everywhere (`node-version.spec.ts`),
 * where `require(esm)` is stable, and the pin is lifted.
 *
 * This spec is the guard that replaces the pin: sanitize-html must load
 * through a real CommonJS `require` on the Node this suite runs on, and do
 * its job. If the Node major ever drops below 24 again, or a future
 * sanitize-html needs something the runtime lacks, this fails here — not
 * in production.
 */
describe('sanitize-html loads via CommonJS require on the pinned Node', () => {
	it('runs on a Node with require(esm) (24+)', () => {
		expect(Number(process.versions.node.split('.')[0])).toBeGreaterThanOrEqual(24);
	});

	it('require("sanitize-html") resolves, loads htmlparser2 and sanitizes', () => {
		const require = createRequire(import.meta.url);
		const sanitize = require('sanitize-html') as (html: string) => string;
		expect(sanitize('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
	});
});
