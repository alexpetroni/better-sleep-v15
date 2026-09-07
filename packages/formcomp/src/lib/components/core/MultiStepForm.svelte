<script lang="ts">
	import { setContext, tick, untrack, type Snippet } from 'svelte';
	import type { FormConfig, FormStateController, TranslateFn, FormCallbacks, SubmitPayload } from '../../types.js';
	import { FORM_STATE_KEY, TRANSLATE_KEY, FORM_ID_KEY } from '../../types.js';
	import { createFormState } from '../../state/form-state.svelte.js';
	import { validateStep, collectResponses, isStepVisible } from '../../validation/validator.js';
	import { validateConfig } from '../../validation/config-check.js';
	import { buildSubmitPayload, HONEYPOT_FIELD, SubmitError } from '../../submission.js';
	import { cn, scopedId, groupElementId } from '../../utils.js';
	import ProgressBar from '../layout/ProgressBar.svelte';
	import NavigationButtons from '../layout/NavigationButtons.svelte';
	import FormStep from './FormStep.svelte';
	import SummaryStep from './SummaryStep.svelte';

	interface Props {
		config: FormConfig;
		translate?: TranslateFn;
		state?: FormStateController;
		callbacks?: FormCallbacks;
		/** Custom success screen, rendered in place of the built-in one after a successful submission (POST or callback transport) */
		success?: Snippet<[SubmitPayload, unknown]>;
	}

	let { config, translate: translateFn, state: externalState, callbacks, success }: Props = $props();

	// The form state is intentionally captured once at mount time — to swap
	// configs at runtime, re-create the component with {#key}. That capture is
	// the documented API contract, so the initial-value warning is suppressed
	// rather than "fixed" into reactivity the component does not promise (L-1).
	// svelte-ignore state_referenced_locally
	const formState = externalState ?? createFormState(config, { version: config.version });
	const settings = $derived(config.settings ?? {});
	const t = (key: string) => (translateFn ? translateFn(key) : key);

	let rootEl = $state<HTMLDivElement>();
	let warningGroupId = $state<string | null>(null);
	let warningMessage = $state<string | undefined>();
	let showingSummary = $state(false);
	let completed = $state(false); // onFormComplete fired for the current answers
	let submitState = $state<'idle' | 'submitting' | 'succeeded'>('idle');
	let submitError = $state<string | null>(null);
	let successPayload = $state<SubmitPayload | null>(null);
	let successResponse = $state<unknown>(null);
	let successText = $state<{ title: string; message: string } | null>(null);
	let honeypotValue = $state('');

	setContext(FORM_STATE_KEY, formState);
	// Per-instance prefix for every DOM id and radio name inside this form, so
	// two forms on one page (or a host element with the same id) do not
	// collide. Stable across SSR and hydration.
	const formId = $props.id();
	setContext(FORM_ID_KEY, formId);
	// Context is init-only in Svelte — a runtime translate swap is not part of
	// the API (re-create with {#key}), so the initial capture is deliberate.
	// svelte-ignore state_referenced_locally
	if (translateFn) {
		// svelte-ignore state_referenced_locally
		setContext(TRANSLATE_KEY, translateFn);
	}

	if (import.meta.env?.DEV) {
		// One-shot authoring check of the INITIAL config, on purpose.
		// svelte-ignore state_referenced_locally
		for (const warning of validateConfig(config)) {
			console.warn(`[formcomp] ${warning}`);
		}
	}

	const getResponse = (sid: string, qid: string) => formState.getResponse(sid, qid);

	const visibleSteps = $derived(config.steps.filter((s) => isStepVisible(s, getResponse)));
	const currentStep = $derived(config.steps[formState.currentStepIndex]);
	const currentVisibleIndex = $derived(
		currentStep ? visibleSteps.findIndex((s) => s.id === currentStep.id) : -1
	);
	const isFirstStep = $derived(currentVisibleIndex <= 0);
	const isLastStep = $derived(currentVisibleIndex === visibleSteps.length - 1);
	const canGoBack = $derived(settings.allowBackNavigation !== false);

	// A persisted step index can point at a step that current answers hide —
	// snap back to the nearest earlier visible step (or the first one). Runs
	// right after hydration; it moves the controller directly (no `goTo`), so
	// `onStepChange` is not fired.
	function snapBackToVisibleStep() {
		const idx = formState.currentStepIndex;
		const step = config.steps[idx];
		if (!step || isStepVisible(step, getResponse)) return;
		let target = config.steps.findIndex((s) => isStepVisible(s, getResponse));
		for (let i = idx - 1; i >= 0; i--) {
			if (isStepVisible(config.steps[i], getResponse)) {
				target = i;
				break;
			}
		}
		if (target >= 0) formState.goToStep(target);
	}

	// Persisted answers are applied after mount, not during init: the server
	// has no storage and renders the first step, so the first client render
	// must be the same for hydration to be clean (R-2). `$effect` — not
	// `$effect.pre`, which runs before the first client render and would
	// reproduce the mismatch — and `untrack` keeps it a one-shot: nothing read
	// in here becomes a dependency.
	$effect(() => {
		untrack(() => {
			formState.hydrate?.();
			snapBackToVisibleStep();
		});
	});

	/** Scroll to the top of the form and move focus to the new step heading. */
	async function focusStepStart() {
		await tick();
		const heading = rootEl?.querySelector<HTMLHeadingElement>('h2[tabindex="-1"]');
		heading?.focus({ preventScroll: true });
		rootEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function goTo(absoluteIndex: number) {
		warningGroupId = null;
		showingSummary = false;
		completed = false;
		submitError = null;
		const fromIndex = formState.currentStepIndex;
		formState.goToStep(absoluteIndex);
		const toIndex = formState.currentStepIndex;
		// Only a real move is a step change: the controller may ignore an
		// out-of-range index, and editing the current step from the summary
		// lands on the index it already had.
		if (toIndex !== fromIndex) callbacks?.onStepChange?.(fromIndex, toIndex);
		focusStepStart();
	}

	function handleNext() {
		if (!currentStep) return;

		if (showingSummary) {
			submitForm();
			return;
		}

		const result = validateStep(currentStep, getResponse, currentStep.id);

		if (!result.isValid) {
			warningGroupId = result.firstIncompleteGroupId;
			warningMessage =
				result.reason === 'invalid'
					? (settings.invalidMessage ?? 'Please correct the highlighted answers in this section.')
					: settings.requiredMessage;
			if (warningGroupId) {
				// Scoped to this instance's root: ids are per form, never global
				const el = rootEl?.querySelector<HTMLElement>(
					`#${CSS.escape(groupElementId(scopedId(formId, warningGroupId)))}`
				);
				el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
			return;
		}

		warningGroupId = null;
		// Once per validated step, whichever exit follows
		callbacks?.onStepComplete?.(currentStep.id, formState.currentStepIndex);

		if (isLastStep) {
			if (settings.showSummary) {
				showingSummary = true;
				focusStepStart();
			} else {
				submitForm();
			}
		} else {
			const next = visibleSteps[currentVisibleIndex + 1];
			goTo(config.steps.indexOf(next));
		}
	}

	const defaultSubmitError = () =>
		t(settings.submitErrorMessage ?? 'Something went wrong while submitting. Please try again.');

	/**
	 * Show the success screen from the captured payload / response, then clear
	 * the answers and the persisted entry so a reload cannot resubmit them.
	 * `text` (a server response) may override the configured title / message.
	 */
	function succeed(payload: SubmitPayload, response: unknown, text?: Record<string, unknown> | null) {
		successPayload = payload;
		successResponse = response;
		successText = {
			title: typeof text?.title === 'string' ? text.title : t(settings.successTitle ?? 'Thank you!'),
			message:
				typeof text?.message === 'string'
					? text.message
					: t(settings.successMessage ?? 'Your answers have been submitted.')
		};
		submitState = 'succeeded';
		formState.reset?.();
		focusStepStart();
	}

	/** Navigate away after success; the persisted state goes first so Back cannot resurrect it. */
	function redirectTo(url: string) {
		formState.reset?.();
		window.location.assign(url);
	}

	async function submitForm() {
		if (submitState !== 'idle') return;

		submitState = 'submitting';
		submitError = null;

		const payload = buildSubmitPayload(config, getResponse, t, honeypotValue);

		// onFormComplete runs once per set of answers (a retry after a failed
		// POST skips it) and is awaited inside the busy state: without a submit
		// endpoint it *is* the transport, and a rejection aborts the submission
		// so the next Submit calls it again.
		let callbackResult: unknown = null;
		if (!completed) {
			try {
				callbackResult = (await callbacks?.onFormComplete?.(collectResponses(config, getResponse))) ?? null;
			} catch (error) {
				submitState = 'idle';
				submitError = defaultSubmitError();
				callbacks?.onSubmitError?.(error);
				return;
			}
			completed = true;
		}

		if (!config.submit) {
			succeed(payload, callbackResult);
			return;
		}

		// A filled honeypot means a bot: mimic the normal success flow without
		// POSTing and without firing the submit callbacks, so the bot can't
		// tell it was dropped.
		if (settings.honeypot && honeypotValue.trim() !== '') {
			if (config.submit.successUrl) {
				redirectTo(config.submit.successUrl);
				return;
			}
			succeed(payload, null);
			return;
		}

		try {
			const res = await fetch(config.submit.url, {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...config.submit.headers },
				body: JSON.stringify(payload)
			});

			let data: Record<string, unknown> | null = null;
			try {
				data = await res.json();
			} catch {
				// non-JSON responses are fine
			}

			if (!res.ok) {
				// Show the server's error message when it sends one; otherwise the configured fallback
				submitState = 'idle';
				submitError = typeof data?.message === 'string' ? data.message : defaultSubmitError();
				callbacks?.onSubmitError?.(new SubmitError(res.status, data));
				return;
			}

			callbacks?.onSubmitSuccess?.(payload, data);

			// A subscription/results page can take over entirely; the server's
			// redirectUrl wins over the config's successUrl.
			const redirect =
				(typeof data?.redirectUrl === 'string' && data.redirectUrl) || config.submit.successUrl;
			if (redirect) {
				redirectTo(redirect);
				return;
			}

			succeed(payload, data, data);
		} catch (error) {
			// Network failure — don't surface browser-internal messages to the user
			submitState = 'idle';
			submitError = defaultSubmitError();
			callbacks?.onSubmitError?.(error);
		}
	}

	function handleBack() {
		if (showingSummary) {
			showingSummary = false;
			completed = false;
			submitError = null;
			focusStepStart();
			return;
		}
		if (isFirstStep) return;
		const prev = visibleSteps[currentVisibleIndex - 1];
		goTo(config.steps.indexOf(prev));
	}

	function handleStepClick(visibleIndex: number) {
		if (!canGoBack) return;
		if (showingSummary || visibleIndex < currentVisibleIndex) {
			goTo(config.steps.indexOf(visibleSteps[visibleIndex]));
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		handleNext();
	}

	const nextLabel = $derived(
		showingSummary || (isLastStep && !settings.showSummary)
			? (settings.submitLabel ?? 'Submit')
			: (settings.nextLabel ?? 'Next')
	);
</script>

<div bind:this={rootEl} class={cn('formcomp mx-auto max-w-4xl scroll-mt-4', config.class)}>
	{#if submitState === 'succeeded'}
		{#if success}
			{@render success(successPayload!, successResponse)}
		{:else}
			<div class="py-12 text-center">
				<svg class="mx-auto mb-4 size-12 text-(--form-accent)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<path d="m9 12 2 2 4-4" />
				</svg>
				<h2 tabindex="-1" class="text-xl font-semibold tracking-tight outline-none">{successText?.title}</h2>
				<p class="mt-2 text-sm text-(--form-muted)">{successText?.message}</p>
			</div>
		{/if}
	{:else}
	{#if visibleSteps.length > 1 && settings.showProgress !== false}
		<ProgressBar
			steps={visibleSteps}
			currentIndex={showingSummary ? visibleSteps.length : currentVisibleIndex}
			onStepClick={handleStepClick}
			clickable={canGoBack}
			label={settings.progressLabel}
		/>
	{/if}

	<form novalidate onsubmit={handleSubmit}>
		{#if settings.honeypot}
			<!-- Anti-spam honeypot: kept out of sight and out of the tab order but
			     NOT display:none, so naive bots still fill it. -->
			<div class="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
				<input
					type="text"
					name={HONEYPOT_FIELD}
					tabindex="-1"
					autocomplete="off"
					value={honeypotValue}
					oninput={(e) => (honeypotValue = (e.target as HTMLInputElement).value)}
				/>
			</div>
		{/if}
		{#if showingSummary}
			<SummaryStep
				{config}
				heading={settings.summaryLabel}
				editLabel={settings.editLabel}
				onEdit={(i) => goTo(i)}
			/>
		{:else if currentStep}
			{#key currentStep.id}
				<FormStep stepConfig={currentStep} {warningGroupId} {warningMessage} />
			{/key}
		{/if}

		{#if submitError}
			<p role="alert" class="mt-6 rounded-(--form-radius) bg-(--form-error)/5 p-3 text-sm font-medium text-(--form-error) ring-1 ring-(--form-error)/20">
				{submitError}
			</p>
		{/if}

		<NavigationButtons
			showBack={(showingSummary || !isFirstStep) && canGoBack}
			showNext={true}
			submit={true}
			nextDisabled={submitState === 'submitting'}
			{nextLabel}
			backLabel={settings.backLabel ?? 'Back'}
			onback={handleBack}
		/>
	</form>
	{/if}
</div>
