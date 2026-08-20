# Changelog

## 0.3.0 — 2026-08-20

### Added

- **Email-format validation**: a `text-input` question with `inputType: 'email'` now rejects non-empty values that don't match a conservative pattern (one `@`, non-empty local part, domain with a dot) with `reason: 'invalid'` — the same red-ring/scroll UX as out-of-range numbers. Empty + not required stays valid. `isValidEmail` is exported.
- **`consent` question type**: a single checkbox whose answer is a boolean; when `required`, only `true` validates (GDPR "this specific box must be ticked"). Rich consent text goes in the question's `label`, rendered next to the box by the new `ConsentCheckbox` component. `formatAnswer` renders `'Yes'` (a translate key) / `'—'`; `validateConfig` warns when a consent question carries `options`.
- **Opt-in honeypot** (`settings.honeypot: true`): renders a visually-hidden text input (off-screen, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"` — not `display:none`). A filled honeypot at submit time shows the normal success state without POSTing and without firing the submit callbacks. The payload always carries `honeypot: { field, value }` (field name `HONEYPOT_FIELD` = `'website'`) so a server can reject independently — including when the key is absent entirely.
- `lead-capture` example combining all three features, with browser tests.

## 0.2.1 — 2026-07-02

### Added

- **`customized` example** (Settings & styling): every `FormSettings` label and message, summary customization (`summaryLabel` / `editLabel`), submit error handling, and `class` / `optionClass` styling hooks at all config levels.
- **`kiosk` example** (linear flow): `showProgress: false` + `allowBackNavigation: false`.
- `conditional` example now also demonstrates the `greater-than` and `answered` operators and `inputType: 'email'`.
- README: i18n section with `translate` wiring, `success` snippet documented in the props table, feature-indexed examples table.
- Browser tests for the two new examples, including the `invalidMessage` path via an inverted range.

### Fixed

- Props table typed the `state` prop as `FormStateAdapter`; it is `FormStateController`.

## 0.2.0 — 2026-07-02

### Added

- **Result submission**: `FormConfig.submit` POSTs the results as JSON on submit, with a loading state, in-place error message + retry, and callbacks (`onSubmitSuccess` / `onSubmitError`).
- **Stable answer identity**: `Question.uuid` — each payload answer carries `{ uuid, questionId, stepId, type, label, value, displayValue }`, so backends key on `uuid` and stay compatible across quiz revisions. `validateConfig` warns on duplicate uuids.
- **Post-submit flow**: server `redirectUrl` → config `submit.successUrl` → built-in in-place success screen (server `title`/`message` override `settings.successTitle`/`successMessage`); or a fully custom `success` snippet on `MultiStepForm`.
- `FormConfig.version`: stamped into the payload and used to invalidate persisted in-progress answers.
- Exported `buildSubmitPayload` and `formatAnswer`.

## 0.1.0 — 2026-07-02

First coherent release of the config-driven multi-step form library.

### Added

- **Step skipping**: `StepConfig.condition` hides whole steps from navigation, the progress header, validation, and the submitted payload.
- **`FormConfig.settings`**: `showProgress`, `allowBackNavigation`, `showSummary`, `summaryLabel`, `editLabel`, `nextLabel`, `backLabel`, `submitLabel`, `requiredMessage`, `invalidMessage`.
- **Summary screen** (`settings.showSummary`): read-only recap of all visible answers with per-step edit links before submitting.
- **New question types**: `select` (native dropdown), `date-input`, and `range` (from–to interval, stored as `{ from, to }`).
- **Question extras**: `tooltip` (info icon next to the label), `inputType` (`text` / `email` / `url` for text inputs), group-level `intro`.
- **Condition operators**: `greater-than`, `less-than`, `answered`, `not-answered`.
- **Styling system**: `--form-*` CSS variables (shipped as `formcomp/theme.css`, including a `.dark` block) plus `class` / `optionClass` hooks at every config level.
- **Config sanity checks**: `validateConfig` runs in dev and warns about duplicate ids, missing options, mismatched likert batches, and broken condition references.
- `createFormState` options: `version` (discards persisted state from older config versions).
- Accessibility: visible keyboard-focus rings on scale/likert/card options, focus moves to the step heading on navigation, validation errors announced via `role="alert"`, native `<form>` semantics with Enter-to-advance.
- Tests: Vitest unit suite for the condition/validation engine, Playwright browser suite for skip/clear/validation/summary/submission flows. CI workflow.

### Changed

- Removed shadcn-svelte/bits-ui/lucide; components are pure Tailwind v4 on native elements with zero runtime dependencies beyond `clsx` + `tailwind-merge`.
- `onFormComplete` receives only visible answers (`collectResponses`); answers to hidden questions are cleared reactively.
- `allowBackNavigation: false` now disables the Back button as well as progress-header clicks.
- `onStepComplete` also fires for the final step.
- Validation distinguishes missing answers from invalid (out-of-range) ones, with separate messages.

### Removed

- `LayoutHint.gridWith` (was never implemented).
