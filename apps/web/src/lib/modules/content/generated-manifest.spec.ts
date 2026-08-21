import { describe, expect, it } from 'vitest';
import {
	parseGeneratedManifest,
	serializeGeneratedManifest,
	staleGeneratedFiles,
	updateGeneratedManifest,
	type GeneratedManifest
} from './generated-manifest.ts';

// Review M-9: the regeneration sweep may delete ONLY files a previous run
// generated (per the committed manifest) — a hand-authored bundle exported
// into content/sleep/ per the README convention must survive every run.

describe('staleGeneratedFiles', () => {
	const manifest: GeneratedManifest = {
		article: ['0010-vechi.json', '0020-ramane.json'],
		product: ['1010-produs.json']
	};

	it('deletes a previously generated file that is no longer generated', () => {
		const stale = staleGeneratedFiles(
			manifest,
			'article',
			['0020-ramane.json'],
			['0010-vechi.json', '0020-ramane.json', '1010-produs.json']
		);
		expect(stale).toEqual(['0010-vechi.json']);
	});

	it('NEVER deletes a hand-authored bundle absent from the manifest (M-9)', () => {
		// The review's exact scenario: a maintainer exports 0405-articol-nou.json
		// into the directory. It matches the generated naming convention but is
		// not in the manifest, so the sweep must not touch it.
		const stale = staleGeneratedFiles(
			manifest,
			'article',
			['0020-ramane.json'],
			['0020-ramane.json', '0405-articol-nou.json']
		);
		expect(stale).not.toContain('0405-articol-nou.json');
		expect(stale).toEqual([]);
	});

	it('leaves the other type alone', () => {
		const stale = staleGeneratedFiles(manifest, 'article', [], ['1010-produs.json']);
		expect(stale).toEqual([]);
	});

	it('skips manifest entries already gone from disk', () => {
		const stale = staleGeneratedFiles(manifest, 'article', [], ['0020-ramane.json']);
		expect(stale).toEqual(['0020-ramane.json']);
	});
});

describe('parseGeneratedManifest', () => {
	it('round-trips through serialize', () => {
		const manifest: GeneratedManifest = { article: ['0010-a.json'], product: ['1010-p.json'] };
		expect(parseGeneratedManifest(JSON.parse(serializeGeneratedManifest(manifest)))).toEqual(
			manifest
		);
	});

	it('treats a missing or malformed manifest as empty — the sweep then deletes nothing', () => {
		for (const raw of [null, undefined, 'x', 42, [], { article: 'not-a-list', product: [3] }]) {
			const parsed = parseGeneratedManifest(raw);
			expect(parsed).toEqual({ article: [], product: [] });
			expect(staleGeneratedFiles(parsed, 'article', [], ['0010-orfan.json'])).toEqual([]);
		}
	});
});

describe('updateGeneratedManifest', () => {
	it('replaces only its own type, sorted', () => {
		const manifest: GeneratedManifest = { article: ['0010-a.json'], product: ['1010-p.json'] };
		const next = updateGeneratedManifest(manifest, 'article', ['0030-c.json', '0020-b.json']);
		expect(next).toEqual({
			article: ['0020-b.json', '0030-c.json'],
			product: ['1010-p.json']
		});
	});
});
