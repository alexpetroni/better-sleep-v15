// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFormState } from '../../src/lib/state/form-state.svelte.js';
import type { FormConfig } from '../../src/lib/types.js';

/**
 * Unit tests for the built-in state controller: buckets, navigation bounds,
 * debounced persistence, `hydrate()`, version invalidation, index clamping
 * and `reset()`. Construction never touches storage (R-2): the persisted
 * entry is applied by `hydrate()`, which `MultiStepForm` calls after mount.
 * Runs under jsdom for `sessionStorage` / `localStorage`; timers are faked so
 * the debounced save can be advanced deterministically.
 */

const KEY = 'formcomp-test';

function makeConfig(version?: string | number): FormConfig {
	const config: FormConfig = {
		steps: [
			{
				id: 'one',
				label: 'One',
				groups: [{ id: 'g1', label: 'G1', questions: [{ id: 'q1', type: 'text-input', label: 'Q1' }] }]
			},
			{
				id: 'two',
				label: 'Two',
				groups: [{ id: 'g2', label: 'G2', questions: [{ id: 'q2', type: 'number-input', label: 'Q2' }] }]
			},
			{
				id: 'three',
				label: 'Three',
				groups: [{ id: 'g3', label: 'G3', questions: [{ id: 'q3', type: 'scale', label: 'Q3', min: 1, max: 5 }] }]
			}
		]
	};
	if (version !== undefined) config.version = version;
	return config;
}

const FRESH = { one: {}, two: {}, three: {} };

function seed(storage: Storage, entry: unknown) {
	storage.setItem(KEY, JSON.stringify(entry));
}

describe('createFormState', () => {
	beforeEach(() => {
		sessionStorage.clear();
		localStorage.clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('fresh state', () => {
		it('starts with one empty bucket per step, index 0, currentStepId and stepCount', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY });

			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
			expect(state.currentStepId).toBe('one');
			expect(state.stepCount).toBe(3);
			expect(state.getStepResponses('one')).toEqual({});
		});
	});

	describe('responses', () => {
		it('setResponse stores a value that getResponse and getStepResponses read back', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY });

			state.setResponse('one', 'q1', 'hello');
			state.setResponse('two', 'q2', 42);

			expect(state.getResponse('one', 'q1')).toBe('hello');
			expect(state.getResponse('one', 'missing')).toBeUndefined();
			expect(state.getStepResponses('one')).toEqual({ q1: 'hello' });
			expect(state.getStepResponses('two')).toEqual({ q2: 42 });
			expect(state.allResponses).toEqual({ one: { q1: 'hello' }, two: { q2: 42 }, three: {} });
		});

		it('a step id absent from the config reads as {} and gets a bucket on write', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY });

			expect(state.getStepResponses('ghost')).toEqual({});
			expect(state.getResponse('ghost', 'x')).toBeUndefined();

			state.setResponse('ghost', 'x', 1);

			expect(state.getStepResponses('ghost')).toEqual({ x: 1 });
			expect(state.getResponse('ghost', 'x')).toBe(1);
			expect(state.allResponses).toEqual({ ...FRESH, ghost: { x: 1 } });
		});
	});

	describe('navigation', () => {
		it('nextStep and prevStep stop at the bounds', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY });

			state.prevStep();
			expect(state.currentStepIndex).toBe(0);

			state.nextStep();
			state.nextStep();
			expect(state.currentStepIndex).toBe(2);
			expect(state.currentStepId).toBe('three');

			state.nextStep();
			expect(state.currentStepIndex).toBe(2);

			state.prevStep();
			expect(state.currentStepIndex).toBe(1);
			expect(state.currentStepId).toBe('two');
		});

		it('goToStep ignores out-of-range indices', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY });

			state.goToStep(2);
			expect(state.currentStepIndex).toBe(2);

			state.goToStep(3);
			expect(state.currentStepIndex).toBe(2);

			state.goToStep(-1);
			expect(state.currentStepIndex).toBe(2);

			state.goToStep(0);
			expect(state.currentStepIndex).toBe(0);
		});
	});

	describe('persistence', () => {
		it('writes { responses, currentStepIndex, version } to sessionStorage after debounceMs', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300, version: 3 });

			state.setResponse('one', 'q1', 'a');
			state.nextStep();
			expect(sessionStorage.getItem(KEY)).toBeNull();

			vi.advanceTimersByTime(299);
			expect(sessionStorage.getItem(KEY)).toBeNull();

			vi.advanceTimersByTime(1);
			expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({
				responses: { one: { q1: 'a' }, two: {}, three: {} },
				currentStepIndex: 1,
				version: 3
			});
		});

		it('two rapid writes produce one save', () => {
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });

			state.setResponse('one', 'q1', 'first');
			vi.advanceTimersByTime(100);
			state.setResponse('two', 'q2', 'second');
			vi.advanceTimersByTime(300);

			expect(setItem).toHaveBeenCalledTimes(1);
			expect(JSON.parse(sessionStorage.getItem(KEY)!).responses).toEqual({
				one: { q1: 'first' },
				two: { q2: 'second' },
				three: {}
			});
		});

		it('the currentStepIndex setter also schedules a save', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });

			state.currentStepIndex = 2;
			vi.advanceTimersByTime(300);

			expect(JSON.parse(sessionStorage.getItem(KEY)!).currentStepIndex).toBe(2);
		});

		it('writes to localStorage when persist is "localStorage"', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300, persist: 'localStorage' });

			state.setResponse('one', 'q1', 'local');
			vi.advanceTimersByTime(300);

			expect(sessionStorage.getItem(KEY)).toBeNull();
			expect(JSON.parse(localStorage.getItem(KEY)!).responses.one).toEqual({ q1: 'local' });
		});

		it('persist: false never reads or writes storage', () => {
			seed(sessionStorage, { responses: { one: { q1: 'session' } }, currentStepIndex: 2 });
			seed(localStorage, { responses: { one: { q1: 'local' } }, currentStepIndex: 1 });
			const getItem = vi.spyOn(Storage.prototype, 'getItem');
			const setItem = vi.spyOn(Storage.prototype, 'setItem');

			const state = createFormState(makeConfig(), { storageKey: KEY, persist: false, debounceMs: 300 });
			state.hydrate();

			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);

			state.setResponse('one', 'q1', 'memory');
			state.nextStep();
			vi.advanceTimersByTime(1000);

			expect(getItem).not.toHaveBeenCalled();
			expect(setItem).not.toHaveBeenCalled();
			expect(JSON.parse(sessionStorage.getItem(KEY)!).responses.one).toEqual({ q1: 'session' });
			expect(JSON.parse(localStorage.getItem(KEY)!).responses.one).toEqual({ q1: 'local' });
		});
	});

	describe('hydrate', () => {
		it('construction reads nothing: a seeded entry yields empty buckets and index 0 until hydrate()', () => {
			seed(sessionStorage, { responses: { one: { q1: 'saved' } }, currentStepIndex: 1 });
			const getItem = vi.spyOn(Storage.prototype, 'getItem');

			const state = createFormState(makeConfig(), { storageKey: KEY });

			// Pure construction — the server and the first client render agree.
			expect(getItem).not.toHaveBeenCalled();
			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
			expect(state.currentStepId).toBe('one');

			state.hydrate();

			expect(getItem).toHaveBeenCalledTimes(1);
			expect(getItem).toHaveBeenCalledWith(KEY);
			expect(state.getResponse('one', 'q1')).toBe('saved');
			expect(state.allResponses).toEqual({ one: { q1: 'saved' }, two: {}, three: {} });
			expect(state.currentStepIndex).toBe(1);
			expect(state.currentStepId).toBe('two');
		});

		it('schedules no save: the entry is left exactly as it was', () => {
			seed(sessionStorage, { responses: { one: { q1: 'saved' } }, currentStepIndex: 1, version: 3 });
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300, version: 3 });

			state.hydrate();
			vi.advanceTimersByTime(1000);

			expect(setItem).not.toHaveBeenCalled();
			expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({
				responses: { one: { q1: 'saved' } },
				currentStepIndex: 1,
				version: 3
			});
		});

		it('is idempotent: a second call reads nothing and does not overwrite answers given since', () => {
			seed(sessionStorage, { responses: { one: { q1: 'saved' } }, currentStepIndex: 1 });
			const getItem = vi.spyOn(Storage.prototype, 'getItem');
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });

			state.hydrate();
			state.setResponse('one', 'q1', 'edited');
			state.setResponse('two', 'q2', 9);
			state.nextStep();
			state.hydrate();

			expect(getItem).toHaveBeenCalledTimes(1);
			expect(state.getResponse('one', 'q1')).toBe('edited');
			expect(state.getResponse('two', 'q2')).toBe(9);
			expect(state.currentStepIndex).toBe(2);

			// …even after the entry itself changed in the meantime
			seed(sessionStorage, { responses: { one: { q1: 'from another tab' } }, currentStepIndex: 0 });
			state.hydrate();

			expect(getItem).toHaveBeenCalledTimes(1);
			expect(state.getResponse('one', 'q1')).toBe('edited');
			expect(state.currentStepIndex).toBe(2);
		});

		it('restores from localStorage when persist is "localStorage"', () => {
			seed(sessionStorage, { responses: { one: { q1: 'session' } }, currentStepIndex: 2 });
			seed(localStorage, { responses: { two: { q2: 7 } }, currentStepIndex: 1 });

			const state = createFormState(makeConfig(), { storageKey: KEY, persist: 'localStorage' });
			expect(state.allResponses).toEqual(FRESH);

			state.hydrate();

			expect(state.allResponses).toEqual({ one: {}, two: { q2: 7 }, three: {} });
			expect(state.currentStepIndex).toBe(1);
		});

		it('persist: false makes hydrate() a no-op that never reads storage', () => {
			seed(sessionStorage, { responses: { one: { q1: 'session' } }, currentStepIndex: 2 });
			seed(localStorage, { responses: { one: { q1: 'local' } }, currentStepIndex: 1 });
			const getItem = vi.spyOn(Storage.prototype, 'getItem');

			const state = createFormState(makeConfig(), { storageKey: KEY, persist: false });
			state.hydrate();

			expect(getItem).not.toHaveBeenCalled();
			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
		});

		it('ignores corrupt JSON in storage', () => {
			sessionStorage.setItem(KEY, '{not json');
			const state = createFormState(makeConfig(), { storageKey: KEY });

			expect(() => state.hydrate()).not.toThrow();

			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
		});

		it('clamps a persisted index beyond the current step count to the last step', () => {
			seed(sessionStorage, { responses: { one: { q1: 'x' } }, currentStepIndex: 7 });
			const state = createFormState(makeConfig(), { storageKey: KEY });

			state.hydrate();

			expect(state.currentStepIndex).toBe(2);
			expect(state.currentStepId).toBe('three');
			expect(state.getResponse('one', 'q1')).toBe('x');
		});

		it('clamps a negative persisted index to the first step', () => {
			seed(sessionStorage, { responses: {}, currentStepIndex: -3 });
			const state = createFormState(makeConfig(), { storageKey: KEY });

			state.hydrate();

			expect(state.currentStepIndex).toBe(0);
			expect(state.currentStepId).toBe('one');
		});

		it('finds nothing to restore after reset() removed the entry', () => {
			seed(sessionStorage, { responses: { one: { q1: 'saved' } }, currentStepIndex: 1 });
			const state = createFormState(makeConfig(), { storageKey: KEY });
			state.hydrate();
			expect(state.currentStepIndex).toBe(1);

			state.reset();
			const fresh = createFormState(makeConfig(), { storageKey: KEY });
			fresh.hydrate();

			expect(fresh.allResponses).toEqual(FRESH);
			expect(fresh.currentStepIndex).toBe(0);
		});
	});

	describe('version', () => {
		it('ignores an entry stored under a different version on hydrate()', () => {
			seed(sessionStorage, { responses: { one: { q1: 'old' } }, currentStepIndex: 2, version: 1 });

			const state = createFormState(makeConfig(), { storageKey: KEY, version: 2 });
			state.hydrate();

			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
		});

		it('applies an entry stored under the same version', () => {
			seed(sessionStorage, { responses: { one: { q1: 'same' } }, currentStepIndex: 2, version: 2 });

			const state = createFormState(makeConfig(), { storageKey: KEY, version: 2 });
			state.hydrate();

			expect(state.getResponse('one', 'q1')).toBe('same');
			expect(state.currentStepIndex).toBe(2);
		});

		it('accepts any stored entry when neither the option nor the config has a version', () => {
			seed(sessionStorage, { responses: { one: { q1: 'stamped' } }, currentStepIndex: 1, version: 'anything' });
			const stamped = createFormState(makeConfig(), { storageKey: KEY });
			stamped.hydrate();
			expect(stamped.getResponse('one', 'q1')).toBe('stamped');
			expect(stamped.currentStepIndex).toBe(1);

			seed(sessionStorage, { responses: { one: { q1: 'unstamped' } }, currentStepIndex: 2 });
			const unstamped = createFormState(makeConfig(), { storageKey: KEY });
			unstamped.hydrate();
			expect(unstamped.getResponse('one', 'q1')).toBe('unstamped');
			expect(unstamped.currentStepIndex).toBe(2);
		});

		it('defaults version to config.version when the option is omitted', () => {
			seed(sessionStorage, { responses: { one: { q1: 'stale' } }, currentStepIndex: 2, version: 1 });

			const state = createFormState(makeConfig(2), { storageKey: KEY, debounceMs: 300 });
			state.hydrate();

			// Saved under version 1, config is now version 2 → the entry is discarded…
			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);

			// …and new saves are stamped with the config version.
			state.setResponse('one', 'q1', 'fresh');
			vi.advanceTimersByTime(300);
			expect(JSON.parse(sessionStorage.getItem(KEY)!).version).toBe(2);
		});

		it('an explicit version option wins over config.version', () => {
			seed(sessionStorage, { responses: { one: { q1: 'nine' } }, currentStepIndex: 1, version: 9 });

			const state = createFormState(makeConfig(2), { storageKey: KEY, version: 9, debounceMs: 300 });
			state.hydrate();

			expect(state.getResponse('one', 'q1')).toBe('nine');
			state.setResponse('one', 'q1', 'still nine');
			vi.advanceTimersByTime(300);
			expect(JSON.parse(sessionStorage.getItem(KEY)!).version).toBe(9);
		});
	});

	describe('reset', () => {
		it('empties the responses to one bucket per step, returns to index 0 and removes the entry synchronously', () => {
			seed(sessionStorage, { responses: { one: { q1: 'saved' }, ghost: { x: 1 } }, currentStepIndex: 2 });
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });
			state.hydrate();
			expect(state.getResponse('one', 'q1')).toBe('saved');
			expect(state.currentStepIndex).toBe(2);

			state.reset();

			expect(state.allResponses).toEqual(FRESH);
			expect(state.getResponse('one', 'q1')).toBeUndefined();
			expect(state.getStepResponses('ghost')).toEqual({});
			expect(state.currentStepIndex).toBe(0);
			expect(state.currentStepId).toBe('one');
			// Removed right away — not on the debounce timer — so nothing can
			// re-persist it in between.
			expect(sessionStorage.getItem(KEY)).toBeNull();
		});

		it('a save scheduled before reset() does not resurrect the entry after the timers advance', () => {
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });

			state.setResponse('one', 'q1', 'pending');
			state.nextStep();
			expect(sessionStorage.getItem(KEY)).toBeNull(); // still debounced

			state.reset();
			vi.advanceTimersByTime(1000);

			expect(setItem).not.toHaveBeenCalled();
			expect(sessionStorage.getItem(KEY)).toBeNull();
			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
		});

		it('removes the localStorage entry when persist is "localStorage" and leaves sessionStorage alone', () => {
			seed(localStorage, { responses: { one: { q1: 'local' } }, currentStepIndex: 1 });
			seed(sessionStorage, { responses: { one: { q1: 'session' } }, currentStepIndex: 1 });
			const state = createFormState(makeConfig(), { storageKey: KEY, persist: 'localStorage' });
			state.hydrate();
			expect(state.getResponse('one', 'q1')).toBe('local');

			state.reset();

			expect(localStorage.getItem(KEY)).toBeNull();
			expect(state.allResponses).toEqual(FRESH);
			expect(JSON.parse(sessionStorage.getItem(KEY)!).responses.one).toEqual({ q1: 'session' });
		});

		it('persist: false resets in memory without touching storage', () => {
			const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			const state = createFormState(makeConfig(), { storageKey: KEY, persist: false, debounceMs: 300 });

			state.setResponse('one', 'q1', 'memory');
			state.goToStep(2);
			state.reset();
			vi.advanceTimersByTime(1000);

			expect(state.allResponses).toEqual(FRESH);
			expect(state.currentStepIndex).toBe(0);
			expect(removeItem).not.toHaveBeenCalled();
			expect(setItem).not.toHaveBeenCalled();
		});

		it('the controller keeps working after reset(): new answers persist again under the fresh buckets', () => {
			const state = createFormState(makeConfig(), { storageKey: KEY, debounceMs: 300 });
			state.setResponse('one', 'q1', 'before');
			state.nextStep();
			vi.advanceTimersByTime(300);
			expect(JSON.parse(sessionStorage.getItem(KEY)!).currentStepIndex).toBe(1);

			state.reset();
			expect(sessionStorage.getItem(KEY)).toBeNull();

			state.setResponse('two', 'q2', 5);
			vi.advanceTimersByTime(300);

			expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({
				responses: { one: {}, two: { q2: 5 }, three: {} },
				currentStepIndex: 0
			});
		});
	});
});
