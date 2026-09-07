import type { FormConfig, FormStateController } from '../types.js';

export interface FormStateOptions {
	persist?: 'sessionStorage' | 'localStorage' | false;
	storageKey?: string;
	debounceMs?: number;
	/**
	 * Version stamp of the form config. Defaults to `config.version`. Persisted
	 * state saved under a different version is discarded by `hydrate()` — bump
	 * it whenever the config changes shape so stale answers can't attach to
	 * new questions. When neither this nor `config.version` is set, any stored
	 * entry is accepted.
	 */
	version?: string | number;
}

export function createFormState(
	config: FormConfig,
	options: FormStateOptions = {}
): FormStateController & {
	readonly currentStepId: string;
	readonly stepCount: number;
	readonly allResponses: Record<string, Record<string, unknown>>;
	hydrate(): void;
	reset(): void;
} {
	const {
		persist = 'sessionStorage',
		storageKey = 'formcomp-state',
		debounceMs = 300,
		version = config.version
	} = options;

	// One empty bucket per step
	const emptyBuckets = () => {
		const buckets: Record<string, Record<string, unknown>> = {};
		for (const step of config.steps) {
			buckets[step.id] = {};
		}
		return buckets;
	};

	// Construction is pure: no storage read here, so the server and the first
	// client render agree (empty buckets, first step) and hydration is clean.
	// The persisted entry is applied by `hydrate()`, after mount.
	let responses = $state<Record<string, Record<string, unknown>>>(emptyBuckets());
	let currentStepIndex = $state(0);
	let hydrated = false;

	// Debounced persistence
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleSave() {
		if (!persist || typeof window === 'undefined') return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			try {
				const storage = persist === 'sessionStorage' ? sessionStorage : localStorage;
				storage.setItem(
					storageKey,
					JSON.stringify({ responses, currentStepIndex, version })
				);
			} catch {
				// storage full or unavailable
			}
		}, debounceMs);
	}

	return {
		get currentStepIndex() {
			return currentStepIndex;
		},
		set currentStepIndex(v: number) {
			currentStepIndex = v;
			scheduleSave();
		},

		get currentStepId() {
			return config.steps[currentStepIndex]?.id ?? '';
		},

		get stepCount() {
			return config.steps.length;
		},

		nextStep() {
			if (currentStepIndex < config.steps.length - 1) {
				currentStepIndex++;
				scheduleSave();
			}
		},

		prevStep() {
			if (currentStepIndex > 0) {
				currentStepIndex--;
				scheduleSave();
			}
		},

		goToStep(index: number) {
			if (index >= 0 && index < config.steps.length) {
				currentStepIndex = index;
				scheduleSave();
			}
		},

		getResponse(stepId: string, questionId: string): unknown {
			return responses[stepId]?.[questionId];
		},

		setResponse(stepId: string, questionId: string, value: unknown) {
			if (!responses[stepId]) {
				responses[stepId] = {};
			}
			responses[stepId][questionId] = value;
			scheduleSave();
		},

		getStepResponses(stepId: string): Record<string, unknown> {
			return responses[stepId] ?? {};
		},

		get allResponses() {
			return responses;
		},

		/**
		 * Apply the persisted entry: responses merged over empty buckets and the
		 * step index clamped to the current config, provided the entry's version
		 * matches; corrupt JSON is ignored. Schedules no save. Idempotent — the
		 * first call in a browser does the work; later calls, and every call on
		 * the server or with `persist: false`, are no-ops, so answers given in
		 * the meantime are never overwritten. `MultiStepForm` calls it once from
		 * an effect after mount, which keeps the first client render equal to
		 * the server render.
		 */
		hydrate() {
			if (hydrated || !persist || typeof window === 'undefined') return;
			hydrated = true;
			try {
				const storage = persist === 'sessionStorage' ? sessionStorage : localStorage;
				const stored = storage.getItem(storageKey);
				if (!stored) return;
				const parsed = JSON.parse(stored);
				if (version !== undefined && parsed.version !== version) return;
				if (parsed.responses) responses = { ...emptyBuckets(), ...parsed.responses };
				if (typeof parsed.currentStepIndex === 'number') {
					// Clamp against the current config — it may have fewer steps
					// than when the state was persisted.
					currentStepIndex = Math.min(Math.max(parsed.currentStepIndex, 0), config.steps.length - 1);
				}
			} catch {
				// corrupt JSON or storage unavailable — start empty
			}
		},

		/**
		 * Back to the initial state: one empty bucket per step, index 0, any
		 * pending debounced save cancelled, and the storage entry removed right
		 * away (`removeItem`, not on the debounce timer) so nothing can
		 * re-persist it. `MultiStepForm` calls this after a successful
		 * submission.
		 */
		reset() {
			clearTimeout(saveTimer);
			saveTimer = undefined;
			responses = emptyBuckets();
			currentStepIndex = 0;
			if (!persist || typeof window === 'undefined') return;
			try {
				const storage = persist === 'sessionStorage' ? sessionStorage : localStorage;
				storage.removeItem(storageKey);
			} catch {
				// storage unavailable
			}
		}
	};
}
