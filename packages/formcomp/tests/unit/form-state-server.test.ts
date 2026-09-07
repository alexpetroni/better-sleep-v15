/**
 * `createFormState` on the server (R-2): no `window`, no storage. Construction
 * is pure and `hydrate()` is a no-op, so a server render always starts from
 * the empty first step — exactly what the first client render shows before
 * `MultiStepForm` hydrates the persisted entry after mount. Runs in the
 * default node environment on purpose (no jsdom).
 */
import { describe, it, expect } from 'vitest';
import { createFormState } from '../../src/lib/state/form-state.svelte.js';
import type { FormConfig } from '../../src/lib/types.js';

const config: FormConfig = {
	version: 2,
	steps: [
		{ id: 'one', label: 'One', groups: [{ id: 'g1', label: 'G1', questions: [{ id: 'q1', type: 'text-input', label: 'Q1' }] }] },
		{ id: 'two', label: 'Two', groups: [{ id: 'g2', label: 'G2', questions: [{ id: 'q2', type: 'number-input', label: 'Q2' }] }] }
	]
};

describe('createFormState without a window', () => {
	it('constructs the empty state and hydrate() is a no-op', () => {
		expect(typeof window).toBe('undefined');

		const state = createFormState(config, { storageKey: 'formcomp-server' });

		expect(state.allResponses).toEqual({ one: {}, two: {} });
		expect(state.currentStepIndex).toBe(0);

		expect(() => state.hydrate()).not.toThrow();

		expect(state.allResponses).toEqual({ one: {}, two: {} });
		expect(state.currentStepIndex).toBe(0);
		expect(state.currentStepId).toBe('one');
	});

	it('answers, navigation and reset() work in memory', () => {
		const state = createFormState(config, { storageKey: 'formcomp-server' });

		state.setResponse('one', 'q1', 'x');
		state.nextStep();
		expect(state.getResponse('one', 'q1')).toBe('x');
		expect(state.currentStepIndex).toBe(1);

		expect(() => state.reset()).not.toThrow();
		expect(state.allResponses).toEqual({ one: {}, two: {} });
		expect(state.currentStepIndex).toBe(0);
	});
});
