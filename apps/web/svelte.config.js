// SvelteKit config in its conventional file (2026-09-10). It used to be passed
// inline to `sveltekit()` in vite.config.ts, which made kit IGNORE any
// svelte.config.js — and Vercel's SvelteKit preset keys on this file being
// present (their support: without it, environment-variable updates were not
// picked up by the build). Plain JS on purpose: kit and Vercel load it
// without a TypeScript step.
import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';

/**
 * Deployment target. `adapter-node` (a long-lived server next to docker
 * compose / on a VPS) stays the default; Vercel sets `VERCEL=1` in its build
 * container, and `DEPLOY_TARGET` forces either one so both outputs can be
 * produced locally. See DEPLOYMENT.md.
 *
 * The Vercel functions run on Node 24 (2026-09-10; one major everywhere,
 * `node-version.spec.ts`): the Neon driver (`DB_DRIVER=neon`) needs a global
 * `WebSocket`, and CommonJS deps that require() ESM packages need
 * `require(esm)` — stable in 24, missing from Vercel's nodejs22.x runtime
 * (the sanitize-html outage). Everything server-side here is Node-only anyway
 * (node:crypto, pg), so the edge runtime is never an option.
 */
const target = process.env.DEPLOY_TARGET ?? (process.env.VERCEL ? 'vercel' : 'node');
const adapter = target === 'vercel' ? vercelAdapter({ runtime: 'nodejs24.x' }) : nodeAdapter();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter,
		// The origin check lives in hooks.server.ts (handleCsrf) with the same
		// rule plus one exemption — the RFC 8058 one-click unsubscribe POST
		// mail clients send without an Origin header. See $lib/server/csrf.
		csrf: { checkOrigin: false },
		// The STATIC half of the CSP — kit nonces its inline bootstrap under
		// 'strict-dynamic' (script tags the nonced bootstrap creates are
		// trusted transitively, which is how the consent-gated analytics
		// loader injects its script). The env-derived half (img-src,
		// connect-src, frame-src, form-action, frame-ancestors) is appended
		// per-response by handleSecurityHeaders in hooks.server.ts.
		// NOTE: SvelteKit strips 'strict-dynamic' in dev — validate CSP
		// behavior on `pnpm build && pnpm preview`, never on the dev server.
		csp: {
			mode: 'auto',
			directives: {
				'script-src': ['self', 'strict-dynamic'],
				// Inline styles are load-bearing: the theme token style
				// attribute, blurhash placeholders and the quiz score bar.
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		}
	}
};

export default config;
