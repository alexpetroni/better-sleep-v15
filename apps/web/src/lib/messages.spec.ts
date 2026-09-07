import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Message catalog policy (BS-0, kept through the BS-11 upstream sync): the
// site ships `ro` ONLY. Upstream keeps an `en.json` in parity; here it is
// deleted on purpose — `ro.json` is the single catalog and paraglide compiles
// exactly one locale. A second catalog (or a second locale in the inlang
// project) would start a crawlable duplicate tree with silent fallbacks.
const messagesDir = path.resolve(import.meta.dirname, '../messages');

function keysOf(locale: string): string[] {
	const file = path.join(messagesDir, `${locale}.json`);
	return Object.keys(JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>)
		.filter((k) => k !== '$schema')
		.sort();
}

describe('messages/*.json', () => {
	it('ro.json is the only catalog', () => {
		const catalogs = readdirSync(messagesDir)
			.filter((f) => f.endsWith('.json'))
			.sort();
		expect(catalogs).toEqual(['ro.json']);
		expect(keysOf('ro').length).toBeGreaterThan(0);
	});

	it('the inlang project lists exactly the ro locale', () => {
		const settings = JSON.parse(
			readFileSync(path.resolve(import.meta.dirname, '../project.inlang/settings.json'), 'utf8')
		) as { baseLocale: string; locales: string[] };
		expect(settings.baseLocale).toBe('ro');
		expect(settings.locales).toEqual(['ro']);
	});

	it('every key has a non-empty string value (no silent blanks)', () => {
		const catalog = JSON.parse(
			readFileSync(path.join(messagesDir, 'ro.json'), 'utf8')
		) as Record<string, unknown>;
		const blank = Object.entries(catalog)
			.filter(([k]) => k !== '$schema')
			.filter(([, v]) => typeof v !== 'string' || v.trim() === '')
			.map(([k]) => k);
		expect(blank).toEqual([]);
	});
});
