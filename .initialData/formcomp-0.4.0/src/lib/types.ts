// ── Condition System ──

export type ConditionOperator =
	| 'equals'
	| 'not-equals'
	| 'includes'
	| 'not-includes'
	| 'greater-than'
	| 'less-than'
	| 'answered'
	| 'not-answered';

export interface SimpleCondition {
	questionId: string;
	operator: ConditionOperator;
	/** Comparison value. Not used by 'answered' / 'not-answered'. */
	value?: unknown;
	/** Which step to look up the response in (for cross-step conditions) */
	stepId?: string;
}

export interface CompoundCondition {
	operator: 'and' | 'or';
	conditions: Condition[];
}

export type Condition = SimpleCondition | CompoundCondition;

// ── Question Types ──

export type QuestionType =
	| 'single-select'
	| 'multi-select'
	| 'select'
	| 'time-input'
	| 'date-input'
	| 'number-input'
	| 'range'
	| 'text-input'
	| 'textarea'
	| 'likert'
	| 'scale'
	| 'consent';

/** Answer value of a 'range' question: an inclusive from–to interval. */
export interface RangeValue {
	from?: number;
	to?: number;
}

export type DisplayVariant = 'list' | 'card';

export interface QuestionOption {
	value: string;
	label: string;
	description?: string;
	exclusive?: boolean;
}

export interface LayoutHint {
	columns?: 1 | 2 | 3;
}

export interface Question {
	id: string;
	/**
	 * Stable identifier included in the submission payload. Assign it once and
	 * never change it — then labels, ids, and step placement can evolve while
	 * your backend keeps matching answers across quiz revisions. Falls back to
	 * `id` when omitted.
	 */
	uuid?: string;
	type: QuestionType;
	label: string;
	options?: QuestionOption[];
	required?: boolean;
	/** Help text behind an info button after the label — keyboard-reachable, it toggles a visible description; Escape closes it */
	tooltip?: string;
	min?: number;
	max?: number;
	step?: number;
	/** HTML input type for 'text-input' questions (default 'text') */
	inputType?: 'text' | 'email' | 'url';
	placeholder?: string;
	condition?: Condition;
	displayVariant?: DisplayVariant;
	layout?: LayoutHint;
	minLabel?: string;
	maxLabel?: string;
	rows?: number;
	unit?: string;
	/** Extra classes merged onto the question's root element */
	class?: string;
	/** Extra classes merged onto each option (select-type questions only) */
	optionClass?: string;
}

// ── Group & Step Config ──

/**
 * @deprecated `'inline'` is an alias of `'individual'` — both render each
 * question on its own; use `layout.columns` for side-by-side fields.
 */
export type InlineRenderMode = 'inline';

export interface QuestionGroup {
	id: string;
	label: string;
	intro?: string;
	questions: Question[];
	condition?: Condition;
	/**
	 * How the questions are rendered. `'individual'` (default): each question
	 * on its own, in a `layout.columns` grid when set; `'likert-batch'`: every
	 * question as one row of a single likert table. `'inline'` is deprecated:
	 * an alias of `'individual'` (see `InlineRenderMode`).
	 */
	renderMode?: 'individual' | 'likert-batch' | InlineRenderMode;
	layout?: LayoutHint;
	/** Extra classes merged onto the group wrapper */
	class?: string;
}

export interface StepConfig {
	id: string;
	label: string;
	intro?: string;
	groups: QuestionGroup[];
	/**
	 * Skip this entire step unless the condition is met. Conditions on a step
	 * should reference questions on other steps via `stepId`. Skipped steps are
	 * hidden from the progress header and excluded from navigation, validation,
	 * and the submitted responses.
	 */
	condition?: Condition;
	/** Extra classes merged onto the step container */
	class?: string;
}

export interface FormSettings {
	/** Show the step progress header. Default: true (hidden automatically when only one step is visible). */
	showProgress?: boolean;
	/** Accessible name of the progress header's `<nav>` landmark (or i18n key). Default: 'Progress'. */
	progressLabel?: string;
	/**
	 * Allow navigating back to earlier steps. When false, both the Back button
	 * and clicking completed steps in the progress header are disabled.
	 * Default: true.
	 */
	allowBackNavigation?: boolean;
	/** Show a read-only summary of all answers (with edit links) before submitting. Default: false. */
	showSummary?: boolean;
	/** Heading of the summary screen (or i18n key). Default: 'Review your answers'. */
	summaryLabel?: string;
	/** Label of the per-step edit buttons on the summary screen (or i18n key). Default: 'Edit'. */
	editLabel?: string;
	/** Label for the next button (or i18n key). Default: 'Next'. */
	nextLabel?: string;
	/** Label for the back button (or i18n key). Default: 'Back'. */
	backLabel?: string;
	/** Label for the submit button on the last step (or i18n key). Default: 'Submit'. */
	submitLabel?: string;
	/** Message shown on the first incomplete group when a required answer is missing (or i18n key). */
	requiredMessage?: string;
	/** Message shown when an answer is present but invalid, e.g. out of range (or i18n key). */
	invalidMessage?: string;
	/** Heading of the built-in success screen (or i18n key). Default: 'Thank you!'. A `title` in the server response takes precedence. */
	successTitle?: string;
	/** Body of the built-in success screen (or i18n key). Default: 'Your answers have been submitted.'. A `message` in the server response takes precedence. */
	successMessage?: string;
	/** Message shown when the submission fails — the POST, or a rejected `onFormComplete` (or i18n key). Server-provided error messages take precedence. */
	submitErrorMessage?: string;
	/**
	 * Render a visually-hidden anti-spam text field. When a bot fills it, the
	 * client shows the normal success state without POSTing and without firing
	 * the submit callbacks. The field name and value are also included in the
	 * submit payload (`payload.honeypot`) so a server can reject independently.
	 * Default: false.
	 */
	honeypot?: boolean;
}

export interface FormConfig {
	steps: StepConfig[];
	settings?: FormSettings;
	/**
	 * Version stamp of this config. Included in the submission payload and used
	 * to invalidate persisted in-progress answers from older config versions.
	 */
	version?: string | number;
	/** When set, the form POSTs the results to this endpoint on submit. */
	submit?: SubmitConfig;
	/** Extra classes merged onto the form's root element */
	class?: string;
}

// ── Submission ──

export interface SubmitConfig {
	/** Endpoint that receives the results as a JSON POST */
	url: string;
	/** Extra request headers (e.g. auth) */
	headers?: Record<string, string>;
	/**
	 * Navigate here after a successful submission (e.g. a subscription or
	 * results page). A `redirectUrl` in the server's JSON response takes
	 * precedence. When neither is set, a built-in success screen replaces the
	 * form in place.
	 */
	successUrl?: string;
}

export interface SubmitAnswer {
	/** Stable question identifier: `question.uuid`, falling back to `question.id` */
	uuid: string;
	questionId: string;
	stepId: string;
	type: QuestionType;
	/** Translated question label at the time of submission */
	label: string;
	/** Raw answer value */
	value: unknown;
	/** Human-readable answer (option labels, formatted ranges/units) */
	displayValue: string;
}

export interface SubmitPayload {
	form: {
		version?: string | number;
		submittedAt: string;
	};
	answers: SubmitAnswer[];
	/**
	 * Present when `settings.honeypot` is enabled: the honeypot field name and
	 * its value (empty for humans). A server should reject when the key is
	 * absent or the value is non-empty.
	 */
	honeypot?: { field: string; value: string };
}

// ── Translation ──

/**
 * Translate a config string (a label, option, tooltip, intro, settings text
 * or one of the built-in defaults). Called with the key only; a function with
 * an extra optional parameter is still assignable.
 */
export type TranslateFn = (key: string) => string;

// ── State Adapter ──

export interface FormStateAdapter {
	getResponse(stepId: string, questionId: string): unknown;
	setResponse(stepId: string, questionId: string, value: unknown): void;
	getStepResponses(stepId: string): Record<string, unknown>;
}

/** A FormStateAdapter that also owns step navigation — what MultiStepForm needs. */
export interface FormStateController extends FormStateAdapter {
	currentStepIndex: number;
	nextStep(): void;
	prevStep(): void;
	goToStep(index: number): void;
	/**
	 * Apply persisted state. `MultiStepForm` calls it once from an effect
	 * after mount, so a controller that restores answers from storage must do
	 * it here rather than while it is constructed: the server has no storage
	 * and renders the first step, and the first client render has to match it
	 * for hydration to be clean. Must be idempotent. Optional so existing
	 * controllers keep compiling; `createFormState` always implements it.
	 */
	hydrate?(): void;
	/**
	 * Clear every answer, return to the first step and drop the persisted
	 * entry. `MultiStepForm` calls it after a successful submission so a reload
	 * cannot resubmit the same answers. Optional so existing controllers keep
	 * compiling; `createFormState` always implements it.
	 */
	reset?(): void;
}

// ── Callbacks ──

export interface FormCallbacks {
	onStepComplete?: (stepId: string, stepIndex: number) => void;
	/**
	 * Fired once per set of answers when the user submits, before the POST.
	 * May return a promise: the form stays busy (Submit disabled, `aria-busy`)
	 * until it settles. Without `config.submit` the callback is the transport:
	 * the success screen shows once it resolves (the resolved value is the
	 * `response` of the `success` snippet); a rejection shows
	 * `settings.submitErrorMessage`, fires `onSubmitError` and lets the user
	 * retry, which calls it again.
	 */
	onFormComplete?: (allResponses: Record<string, Record<string, unknown>>) => void | Promise<unknown>;
	onStepChange?: (fromIndex: number, toIndex: number) => void;
	/** Fired after the configured POST succeeds (2xx). `response` is the parsed JSON body, or null. Not fired for the callback transport. */
	onSubmitSuccess?: (payload: SubmitPayload, response: unknown) => void;
	/**
	 * Fired when the submission fails: a non-2xx POST (as a `SubmitError` with
	 * `status` and `data`), a network error (passed through as received), or a
	 * rejected `onFormComplete` promise (its rejection reason).
	 */
	onSubmitError?: (error: unknown) => void;
}

// ── Context Keys ──

export const FORM_STATE_KEY = Symbol('form-state');
export const TRANSLATE_KEY = Symbol('form-translate');
export const STEP_ID_KEY = Symbol('form-step-id');
/**
 * Per-instance id prefix of the enclosing `MultiStepForm` (its `$props.id()`),
 * a string. Every DOM id and radio `name` inside the form is
 * `<formId>-<question or group id>`, so two forms on one page do not collide.
 * Absent outside a form: components fall back to the raw id.
 */
export const FORM_ID_KEY = Symbol('form-id');
