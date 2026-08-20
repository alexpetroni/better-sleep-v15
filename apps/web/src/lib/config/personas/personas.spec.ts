import { describe, expect, it } from 'vitest';
import { resolveSiteConfig } from '../index.ts';
import { resolvePersona } from './index.ts';

describe('chat personas', () => {
	it('sleep boot resolves the sleep-coach persona', () => {
		const site = resolveSiteConfig('sleep');
		const persona = resolvePersona(site.chatPersonaKey);
		expect(persona.key).toBe('sleep-coach');
	});

	it('throws on an unknown persona key', () => {
		expect(() => resolvePersona('nope')).toThrow(/Unknown chat persona/);
	});

	it('the removed life-coach persona is gone', () => {
		expect(() => resolvePersona('life-coach')).toThrow(/Unknown chat persona/);
	});

	it('sleep-coach is scoped to sleep, brand-free until interpolated', () => {
		const prompt = resolvePersona('sleep-coach').systemPrompt({ siteName: 'Better Sleep' });
		expect(prompt).toContain('Better Sleep');
		expect(prompt).toMatch(/somn/i);
		// The required stances: no medical advice, off-topic refusal, quiz funnel.
		expect(prompt).toMatch(/NU oferi sfaturi medicale/);
		expect(prompt).toMatch(/refuz[aă]/i);
		expect(prompt).toMatch(/chestionar/i);
	});

	it('the site enables the chat widget via config', () => {
		expect(resolveSiteConfig('sleep').chatWidget).toBe(true);
	});
});
