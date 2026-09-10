import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * One Node major everywhere (2026-09-10). This week's outage came from three
 * Node versions in play at once: local 24 hid a `require(esm)` gap in
 * Vercel's nodejs22.x function runtime, while Vercel's build machine ran 24.
 * The project standardises on Node 24 (LTS; `require(esm)` and the global
 * WebSocket the Neon driver needs are both stable there), and every place
 * that names the version must agree so a drift is a failing test, not a
 * production 500.
 */
const root = path.resolve(import.meta.dirname, '../../../../..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const NODE_MAJOR = 24;

describe('Node version pins agree', () => {
	it('.node-version (CI runners and local tooling) is Node 24', () => {
		expect(read('.node-version').trim()).toBe(String(NODE_MAJOR));
	});

	it('the Vercel function runtime is nodejs24.x', () => {
		expect(read('apps/web/svelte.config.js')).toMatch(/runtime:\s*'nodejs24\.x'/);
	});

	it('the root engines field requires Node 24+', () => {
		const pkg = JSON.parse(read('package.json')) as { engines: { node: string } };
		expect(pkg.engines.node).toBe('>=24');
	});

	it('renovate keeps the node datasource on 24', () => {
		const renovate = JSON.parse(read('renovate.json')) as {
			packageRules: Array<{ matchDatasources?: string[]; allowedVersions?: string }>;
		};
		const rule = renovate.packageRules.find((r) => r.matchDatasources?.includes('node-version'));
		expect(rule?.allowedVersions).toBe(String(NODE_MAJOR));
	});
});
