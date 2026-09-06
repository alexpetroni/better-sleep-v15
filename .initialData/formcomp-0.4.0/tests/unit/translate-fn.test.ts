/**
 * `TranslateFn` is `(key: string) => string` (R-11). The type used to
 * advertise a `params` argument that no call site ever passed. This file is
 * type-checked by svelte-check (tests/ is in the tsconfig), so the
 * `expectTypeOf` line fails the gate while the type still carries `params`,
 * and a legacy two-argument function with an optional second parameter must
 * keep being assignable. Rendered server-side, every call from the form
 * passes exactly one argument.
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import { render } from 'svelte/server';
import MultiStepForm from '../../src/lib/components/core/MultiStepForm.svelte';
import type { FormConfig, TranslateFn } from '../../src/lib/types.js';

const config: FormConfig = {
	steps: [
		{
			id: 'a',
			label: 'step.a',
			groups: [
				{
					id: 'g',
					label: 'group.g',
					questions: [{ id: 'q', type: 'text-input', label: 'q.label', tooltip: 'q.tip', required: true }]
				}
			]
		}
	]
};

describe('TranslateFn', () => {
	it('takes a single key parameter', () => {
		expectTypeOf<TranslateFn>().parameters.toEqualTypeOf<[string]>();
		expectTypeOf<TranslateFn>().returns.toEqualTypeOf<string>();
	});

	it('a one-argument function is the prop type, and the form calls it with exactly one argument', () => {
		const calls: unknown[][] = [];
		const translate: TranslateFn = (...args: unknown[]) => {
			calls.push(args);
			return `t:${String(args[0])}`;
		};
		const { body } = render(MultiStepForm, { props: { config, translate } });

		expect(body).toContain('t:step.a');
		expect(body).toContain('t:group.g');
		expect(body).toContain('t:q.label');
		expect(body).toContain('t:q.tip');
		expect(calls.length).toBeGreaterThan(0);
		for (const args of calls) expect(args).toHaveLength(1);
	});

	it('a legacy two-argument function with an optional params parameter still fits', () => {
		const legacy = (key: string, params?: Record<string, string | number>) =>
			params ? `${key}:${JSON.stringify(params)}` : `legacy:${key}`;
		const translate: TranslateFn = legacy;
		expect(translate('x')).toBe('legacy:x');
		const { body } = render(MultiStepForm, { props: { config, translate } });
		expect(body).toContain('legacy:q.label');
	});
});
