# Changelog

## 0.4.0 — 2026-09-04

Remediation of the 2026-09-03 review (`docs/REVIEW-2026-09-03.md`). Every finding the review scheduled is closed in this release; `docs/phases/BACKLOG.md` lists what was deferred.

### Upgrading from 0.3.x

Existing configs keep rendering, validating and submitting. The behaviour changes to know about:

- **Numbers are no longer clamped.** `number-input` and `range` store what the user typed; an out-of-range value now fails validation with `settings.invalidMessage` instead of being silently rewritten to `min`/`max`.
- **`onFormComplete` may be async and is awaited.** The form stays busy (Submit disabled, `aria-busy`) until the returned promise settles, and a rejection aborts the submission. Without `config.submit` the callback is now the transport: the success screen shows when it resolves. Before, Submit went dead after one click.
- **Persisted state is applied after mount, so SSR renders step 1.** `createFormState()` no longer reads storage in its constructor; the server always renders the first step and the persisted step swaps in right after hydration (`hydrate()`). A consumer that reads answers synchronously right after `createFormState()` sees the empty state until `hydrate()` runs. Render the form client-only to avoid the visible swap.
- **Storage is cleared after a successful submission.** Every success path (2xx POST, redirect, honeypot drop, callback transport) calls `reset()` on the controller: answers cleared, first step, storage entry removed. A reload after success lands on an empty form.
- **`renderMode: 'inline'` is deprecated.** It is an alias of `'individual'`; use `layout.columns` for side-by-side fields.
- **`TranslateFn` no longer takes `params`.** It is `(key: string) => string`; the second argument was never passed. A function with an optional second parameter is still assignable.
- **DOM ids are per form instance.** Every id and radio `name` inside a form is prefixed with the form's `$props.id()`. Anything that hard-coded `#<question id>` or `#formcomp-group-<group id>` must select by role and label, or read the prefix from the `FORM_ID_KEY` context.
- **`onSubmitError` receives a `SubmitError`** (with `status` and `data`) for a non-2xx POST instead of a bare `Error`; it still extends `Error` and has the same message.
- **`createFormState` defaults `version` to `config.version`.** A config that carries a `version` now discards persisted answers saved under another version even when the option is not forwarded; in-progress answers persisted by 0.3.x without a version stamp are discarded once for such configs.

### Added

- `hydrate()` on the built-in state controller: reads the persisted entry with the existing rules (version match, index clamp, corrupt JSON ignored), applies responses and index without scheduling a save, and is idempotent — the first call in a browser does the work; later calls, and every call on the server or with `persist: false`, are no-ops. `FormStateController` gains the optional `hydrate?(): void`; external controllers without it keep compiling and are simply not hydrated.
- `reset()` on the built-in state controller: responses back to one empty bucket per step, index 0, any pending debounced save cancelled, and the storage entry removed synchronously (`removeItem`) so nothing re-persists it. `FormStateController` gains the optional `reset?(): void`; external controllers without it are simply not cleared after success.
- `SubmitError` (exported): `class SubmitError extends Error { status: number; data: unknown }`, the error `onSubmitError` receives for a non-2xx POST.
- `settings.progressLabel`: accessible name of the progress `<nav>`, default `'Progress'`, passed through `translate`.
- `isValidUrl(value)` (exported): a non-empty `inputType: 'url'` value must be an absolute `http:`/`https:` URL.
- `FORM_ID_KEY` context key (exported): the enclosing form's id prefix, a string; absent outside a `MultiStepForm`.
- `InlineRenderMode` type (`'inline'`, deprecated) so the deprecation is visible in `types.ts` and editors.
- Input component props: every input accepts `required?: boolean` and `describedBy?: string`; `LikertGroup` adds `warningIds?: string[]` (ids of the rows to mark, so a batch flags failing rows only); `QuestionRenderer` accepts `describedBy`; `FieldLabel` accepts `required`; `ProgressBar` accepts `label`. All optional; the defaults preserve the previous markup.
- `validateConfig` warns about a whole family of config mistakes the runtime cannot recover from: a step `condition` that resolves to the step itself; `equals` / `not-equals` with a non-number value on a `scale` or `number-input`, a non-boolean value on a `consent`, any value on a `range`, or a value outside the target's option values; `includes` / `not-includes` on a non-`multi-select` target or with a value outside its options; `greater-than` / `less-than` on a non-numeric target or with a non-number value; empty `steps`, a step without groups, a group without questions; a non-`likert` question in a `likert-batch` group. Checks are skipped for unknown targets and valueless operators, which existing warnings already cover.
- Demo: the `all-inputs` example has a standalone `likert` question; the example page's `onFormComplete` returns a promise that settles after ~300 ms, rejects the first call when the URL carries `?fail=once`, and its `onSubmitError` logs `Submit failed <status> <data>`; the dev route `/dev/two-forms` (not linked from the gallery) renders two `MultiStepForm` instances of the minimal example with non-persisting controllers.
- Test harness: the Vitest config compiles `*.svelte.ts` rune modules through the Svelte plugin, and a test opts into jsdom per file, so `createFormState` is unit-tested (`tests/unit/form-state.test.ts`: buckets, navigation bounds, debounced persistence, `hydrate()`, version invalidation, index clamping, corrupt storage, `reset()`; `tests/unit/form-state-server.test.ts`: no `window`, construction and `hydrate()` are no-ops).
- Tests: `tests/unit/progress-label.test.ts` (server-rendered `MultiStepForm` / `ProgressBar`), `tests/unit/translate-fn.test.ts` (type-level parameter check, one argument per call, legacy two-argument function assignable), `isValidUrl` / url `questionStatus` / `SubmitError` / config-check unit cases, and a unit test asserting every shipped example validates without warnings. Browser: `tests/demo-pages.spec.ts` (favicon, home page, `sleep-assessment` route), `tests/likert.spec.ts` (radiogroups, names at desktop and mobile viewports, arrow keys, submission, the required-row alert, the standalone likert), `tests/validation-aria.spec.ts` (email fix-up, required marker, per-question ring, ARIA state on inputs, radiogroups and likert rows), `tests/submission-lifecycle.spec.ts` (persisted entry gone after a 2xx POST, a redirect, the callback transport and the honeypot drop; busy → success without an endpoint; `?fail=once` error, answers intact, retry; `onSubmitError` sees `status: 500` and the parsed body), `tests/ssr-hydration.spec.ts` (reload mid-form: the raw server response renders step 1, the hydrated DOM shows the persisted step, the server heading is replaced rather than patched, answers intact, no errors), `tests/tooltip.spec.ts`, `tests/two-forms.spec.ts` and `tests/callbacks.spec.ts`. The browser test "out-of-range number blocks progression" tested the empty-required path (the input clamped, so an out-of-range value could not be typed); it is now a real out-of-range test that also asserts the ARIA state.
- README: "Project structure" lists every file under `src/lib/`, `src/examples/`, `src/routes/`, `static/` and `tests/`; new sections on required/invalid state, tooltips, DOM ids, `hydrate()` and SSR, the submission lifecycle and the config sanity checks.

### Changed

- Number and range inputs no longer clamp to `min`/`max`; out-of-range values fail validation with `invalidMessage`. `NumberInput` and `RangeInput` store the parsed number as typed (`undefined` for empty or not a number); `min`, `max` and `step` remain on the elements as hints for the native spinner. Before, typing 999 for a 1–365 field silently became 365 and the invalid path was reachable from the UI only through an inverted range.
- `onFormComplete` is awaited before the POST and may return a promise (`FormCallbacks.onFormComplete` returns `void | Promise<unknown>`); a rejection aborts the submission. Synchronous callbacks behave as before.
- `onSubmitError` receives a `SubmitError` for a non-2xx response instead of a bare `Error` (same `Request failed (<status>)` message, now with `status` and `data`); network failures are still passed through as received.
- Persisted state is applied after mount, not at construction. `createFormState()` no longer reads storage in its constructor; the entry is applied by `hydrate()`, which `MultiStepForm` calls once from an effect after mount. Under SSR the server always renders the first step; persisted answers are restored right after hydration, so the first step paints and the persisted step then swaps in — render the form client-only (`{#if browser}` / `export const ssr = false`) to avoid the visible swap (README, State management). In-session persistence (the debounced save, `version`, the index clamp) is unchanged.
- DOM ids are per form instance. `MultiStepForm` creates `$props.id()` (stable across SSR and hydration) and provides it through `FORM_ID_KEY`; every id inside the form — inputs and their option ids, likert statement cells, group wrappers and their alerts — and every radio `name` is now `<formId>-<question or group id>` (the alert, for instance, is `formcomp-group-<formId>-<group id>-alert`). Two forms on one page, or a host element with the same id as a question, no longer break the label → input association, share a radio group or ring the wrong group. Standalone components (no form context) keep the raw `name`. The warning scroll looks the group up with `rootEl.querySelector` and `CSS.escape` instead of a global `getElementById`.
- `TranslateFn` is `(key: string) => string`. The `params` argument the type advertised was never passed by any call site; a function with an optional second parameter is still assignable. `useTranslate` is unchanged.
- `RadioListGroup`'s `role="radiogroup"` moved from the inner options container to its `<fieldset>`; the fieldsets of `RadioCardGroup` and `ScaleInput` are `role="radiogroup"` too (named by their legend), so required/invalid state has a valid home.
- `validateConfig` message prefixes for group- and question-level conditions now name the step too (`Condition on question "q" in step "s" …`). A non-`likert` question inside a `likert-batch` group is reported by its own warning instead of as a "must share the same options" mismatch; option sets are compared among the likert rows only.
- `createFormState` defaults the persistence `version` to `config.version`; pass the option only to override it. A config that carries a `version` now invalidates in-progress answers persisted under another version even when the caller does not forward it (the examples route did not).
- `package.json` metadata: `description`, `license` (BSD-3-Clause), `repository`, `homepage`, `bugs`, `keywords`, `engines.node >= 20`, `sideEffects` limited to CSS, a `./package.json` export, and `CHANGELOG.md` is shipped with the package.
- Demo: the favicon moved from `src/lib/assets/` to `static/` and no longer ships in the package (`dist/assets/` is gone); the home page renders the `sleep-assessment` example instead of an inline copy of its config.

### Deprecated

- `renderMode: 'inline'` on a group. It is an alias of `'individual'` — the two always rendered identical markup, and `GroupRenderer` now has a single branch for both. Use `layout.columns` for side-by-side fields. The type `InlineRenderMode` (`'inline'`) carries the `@deprecated` tag; `'inline'` keeps working, and the shipped examples no longer use it.

### Fixed

- Without `config.submit`, Submit no longer goes dead after one click. `onFormComplete` is the transport: it is awaited inside the busy state (Submit disabled, `aria-busy`), then the built-in success screen (or the `success` snippet) shows with `settings.successTitle` / `successMessage` and `response` = the resolved value or `null`, and the state is reset. `onSubmitSuccess` is not fired in this case (it reports the POST). A rejected promise shows `settings.submitErrorMessage`, fires `onSubmitError` with the reason, keeps the answers and re-enables Submit; the retry calls `onFormComplete` again.
- Persisted answers no longer survive a successful submission. After a 2xx POST, a redirect, the honeypot drop or the callback transport, `MultiStepForm` calls `reset()` on its state controller, so a reload lands on an empty first step instead of the last step with every answer filled and Submit one click from a duplicate POST. The success screen and the `success` snippet render from the payload captured before the reset; on a redirect the reset happens before the navigation. A failed submission resets nothing.
- Reloading mid-form no longer hydrates the wrong step under SSR. `createFormState` read storage in its constructor, i.e. during component init: the server (no storage) rendered the first step while the client constructed the state with the persisted index and hydrated a different step over it — Svelte patched the server DOM in place without a warning, and clicks before hydration landed on the wrong step. Construction is now pure and `MultiStepForm` applies the persisted entry from an `$effect` after mount, so the first client render equals the server render. The snap-back for a persisted index that points at a step the current answers hide runs right after hydration, still without firing `onStepChange`.
- The field tooltip is reachable by keyboard and touch. The info icon next to a label is a `<button>` named by the tooltip text (`aria-label`, plus `title` for hover) that toggles a visible description below the label, wired with `aria-expanded` and `aria-controls`; Escape closes it. Next to a `<label>` the button follows the required marker *outside* the label, so the label text stays the control's accessible name and activating the button never focuses or toggles the control; inside a `<legend>` it follows the marker. Before, the icon was a `title`-only span that keyboard and touch users never saw.
- Required and invalid state is exposed to assistive technology. The controls of a required question carry `aria-required="true"`; while a question is in warning its controls carry `aria-invalid="true"` and `aria-describedby` pointing at the group's `role="alert"` message, which now has a stable id (`formcomp-group-<formId>-<group id>-alert`). Radio-based inputs (`single-select`, `scale`, `likert`) carry the state on their `radiogroup` — the fieldset, or the likert row — because ARIA 1.2 has neither attribute on the `radio` role; checkboxes carry it individually. Required questions show a red asterisk after the label; it is `aria-hidden` and, next to a `<label>`, a following sibling rather than a child, so accessible names are unchanged. Likert rows show the marker in their statement cell.
- Only the questions that actually fail get the red field ring (and `aria-invalid`) in the warning group; before, every question in the group was ringed. `GroupRenderer` evaluates `questionStatus` per visible question and `LikertGroup` takes `warningIds` so a batch marks failing rows only. This holds for every render mode: `inline` groups, whose questions never received the warning at all, now get the same per-question state as `individual` ones. The ring follows the live answer; the group ring and message stay until the next attempt.
- A `likert` question outside a `likert-batch` group now renders (a one-row scale with its own header) and can be answered. `QuestionRenderer` had no `'likert'` branch, so such a question rendered nothing and, when `required`, blocked the step forever with the error pointing at an empty group.
- Likert accessibility: every radio's accessible name is its option label at every viewport (on desktop the label text is visually hidden with `sr-only` instead of `display:none`; the bullet is `aria-hidden`), each statement row is a `radiogroup` named by its statement (`aria-labelledby`), and the desktop scale header is `aria-hidden`. Before, desktop radios were all named "•" and the statement was never announced.
- `inputType: 'url'` is validated: a non-empty value must be an absolute `http:`/`https:` URL, otherwise the question is *invalid* like a malformed email.
- The progress header's `<nav aria-label>` goes through `translate` (`settings.progressLabel`) instead of a hardcoded English string.
- `onStepChange` no longer fires when navigation was a no-op. `goTo` compares the controller's index before and after `goToStep`: an out-of-range index the controller ignores, or Edit on the summary for the step the index already sits on, fires nothing. `onStepComplete` is called once per validated step from a single place; it was written twice, once in each branch of `handleNext`.

## 0.3.0 — 2026-08-20

Upstreamed from the consumer project's vendored copy on 2026-09-03.

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
