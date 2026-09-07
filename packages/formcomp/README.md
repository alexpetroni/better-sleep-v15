# formComp

Config-driven multi-step form component library for Svelte 5. Define your entire form as a JSON config object and let the library handle rendering, validation, conditional logic, and navigation.

Built with SvelteKit, TypeScript, and Tailwind CSS v4.

## Installation

```sh
npm install github:alexpetroni/general-form-comp
```

**Prerequisite:** Your Svelte project must have [Tailwind CSS v4](https://tailwindcss.com/docs/installation/using-vite) configured, since the components use Tailwind utility classes.

Then in your app CSS, tell Tailwind to scan the library (v4 skips `node_modules` by default) and import the theme tokens:

```css
@import 'tailwindcss';
@import 'formcomp/theme.css';
@source '../node_modules/formcomp/dist';
```

(Adjust the `@source` path so it is relative to your CSS file.)

## Usage

```svelte
<script lang="ts">
  import { MultiStepForm } from 'formcomp';
  import type { FormConfig, FormCallbacks } from 'formcomp';

  const config: FormConfig = {
    steps: [
      {
        id: 'step-1',
        label: 'Basic Info',
        groups: [
          {
            id: 'name-group',
            label: 'Your Name',
            questions: [
              {
                id: 'full_name',
                type: 'text-input',
                label: 'Full name',
                required: true,
                placeholder: 'Jane Doe'
              }
            ]
          }
        ]
      }
    ]
  };

  const callbacks: FormCallbacks = {
    onFormComplete(responses) {
      console.log(responses);
    }
  };
</script>

<MultiStepForm {config} {callbacks} />
```

### Development

To run the demo/dev sandbox locally:

```sh
git clone git@github.com:alexpetroni/general-form-comp.git
cd general-form-comp
npm install
npm run dev
```

Visit `http://localhost:5173` to see the demo form, and `http://localhost:5173/examples` for the full example gallery. `http://localhost:5173/dev/two-forms` renders two `MultiStepForm` instances of the minimal example on one page with non-persisting controllers — the test bed for per-instance DOM ids (see [DOM ids](#dom-ids-and-several-forms-on-a-page)); it is not linked from the gallery.

Unit tests (condition evaluator, validator incl. the email/url rules, config checks incl. the shipped examples, submission payload and `SubmitError`, state controller incl. `hydrate()` / `reset()`, progress label, `TranslateFn`) run with Vitest; browser tests (step skipping, conditional show/hide, answer clearing, validation and ARIA state, likert, tooltips, summary, submission payload and lifecycle, SSR hydration, two forms on one page, callbacks) run with Playwright against a production preview build:

```sh
npm run test:unit
npx playwright install chromium   # once
npm run test:e2e
```

Both run in CI on every push (`.github/workflows/ci.yml`).

### Examples

Ready-to-run `FormConfig` objects live in the `./src/examples/` directory. Each one is paired with a route under `/examples/<slug>`:

| Slug | File | What it shows |
|------|------|---------------|
| `minimal` | `src/examples/minimal.ts` | Smallest useful form, plus result submission: `submit` config, question `uuid`s, success screen, error handling. |
| `conditional` | `src/examples/conditional.ts` | `and`/`or` conditions, cross-step visibility, step-level skipping, `greater-than` and `answered` operators. |
| `likert` | `src/examples/likert.ts` | A `likert-batch` group with a shared option set; every row is a radiogroup named by its statement. |
| `all-inputs` | `src/examples/all-inputs.ts` | Every built-in input type (including a standalone `likert`), `tooltip`, `inputType: 'email'`, group `intro`, and the summary screen. |
| `customized` | `src/examples/customized.ts` | All `settings` labels/messages, summary customization, and `class`/`optionClass` styling hooks. |
| `kiosk` | `src/examples/kiosk.ts` | Linear one-way flow: `showProgress: false`, `allowBackNavigation: false`. |
| `lead-capture` | `src/examples/lead-capture.ts` | Email-format validation, a required `consent` checkbox, and the anti-spam honeypot. |
| `sleep-assessment` | `src/examples/sleep-assessment.ts` | Larger three-step form combining everything. |

Drop a new `.ts` file into `./src/examples/`, add it to `src/examples/index.ts`, and it will show up in the `/examples` gallery automatically.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FormConfig` | The form configuration object (required). Captured once at mount — to swap configs at runtime, re-create the component with `{#key}`. |
| `translate` | `TranslateFn` | Optional `(key: string) => string` for i18n. When provided, all `label` fields are treated as translation keys. When omitted, labels render as-is. |
| `state` | `FormStateController` | Optional external state controller (`FormStateAdapter` + step navigation). If omitted, an internal one is created with sessionStorage persistence. |
| `callbacks` | `FormCallbacks` | Optional lifecycle callbacks. |
| `success` | `Snippet<[SubmitPayload, unknown]>` | Optional custom success screen rendered after a successful submission — a 2xx POST or, without `config.submit`, a resolved `onFormComplete` (see "Submitting results"). |

### i18n

Pass a `translate` function and *every* string in the config — question and option labels, tooltips, intros, settings labels and messages — is treated as a translation key:

```svelte
<script>
  import { t } from './my-i18n.js'; // svelte-i18n, paraglide, or your own

  const config = {
    settings: { nextLabel: 'form.next', submitLabel: 'form.submit' },
    steps: [{ id: 's1', label: 'step.basics', groups: [/* label: 'q.name', … */] }]
  };
</script>

<MultiStepForm {config} translate={(key) => t(key)} />
```

Without `translate`, all strings render as-is — plain-English configs need no setup. The built-in defaults ('Next', 'Back', 'Submit', 'Progress', validation and success messages) are also passed through `translate`, so provide keys via `settings` or translations for the default English strings.

`TranslateFn` is `(key: string) => string`: the form always calls it with the key alone. A function that also takes an optional second parameter (a `params` object, as some i18n libraries provide) is still assignable — it just never receives one.

### Callbacks

```ts
interface FormCallbacks {
  onStepComplete?: (stepId: string, stepIndex: number) => void;
  onFormComplete?: (allResponses: Record<string, Record<string, unknown>>) => void | Promise<unknown>;
  onStepChange?: (fromIndex: number, toIndex: number) => void;
  onSubmitSuccess?: (payload: SubmitPayload, response: unknown) => void; // after a 2xx POST (not for the callback transport)
  onSubmitError?: (error: unknown) => void;                              // SubmitError (non-2xx), network error, or the rejection of onFormComplete
}
```

`onFormComplete` fires once per set of answers when the user submits and may return a promise: the form stays busy (Submit disabled, `aria-busy`) until it settles, and only then POSTs. Without `config.submit` the callback *is* the transport — see [Without a submit endpoint](#without-a-submit-endpoint). A rejected promise aborts the submission: the form shows `settings.submitErrorMessage`, fires `onSubmitError` with the rejection reason, keeps every answer and re-enables Submit; the retry calls `onFormComplete` again.

### State management

The built-in state manager persists responses to sessionStorage by default:

```ts
import { createFormState } from 'formcomp';

const state = createFormState(config, {
  persist: 'localStorage',  // 'sessionStorage' (default) | 'localStorage' | false
  storageKey: 'my-form',    // default: 'formcomp-state'
  debounceMs: 500,          // default: 300
  version: 3                // default: config.version — persisted state saved
                            // under another version is discarded
});

state.hydrate(); // apply the persisted entry — MultiStepForm does this once after mount
state.reset();   // every answer cleared, back to the first step, storage entry removed
```

Construction never touches storage: a new controller always starts with empty answers on the first step, on the server and in the browser alike. `hydrate()` reads the persisted entry — the `version` must match, the step index is clamped to the config, corrupt JSON is ignored — and applies it without scheduling a save. It is idempotent: the first call in a browser does the work; later calls, and every call on the server or with `persist: false`, are no-ops, so answers given in the meantime are never overwritten. `MultiStepForm` calls it once after mount.

Besides the `FormStateController` members, the built-in controller exposes the read-only `currentStepId`, `stepCount` and `allResponses` (the live responses object, keyed by step id then question id).

**SSR:** the server always renders the first step; persisted answers are restored right after hydration, so the first step paints and the persisted step then swaps in. To avoid the visible swap, render the form client-only (`{#if browser}` or `export const ssr = false` on the page).

`reset()` puts the controller back to its initial state: one empty bucket per step, index 0, any pending debounced save cancelled, and the storage entry removed synchronously so nothing re-persists it. `MultiStepForm` calls it after a successful submission (see [After success](#after-success)); call it yourself for a "Start over" button.

You can also provide your own state by implementing the `FormStateAdapter` interface (what the inputs need) — `MultiStepForm` itself takes a `FormStateController`, which adds step navigation:

```ts
interface FormStateAdapter {
  getResponse(stepId: string, questionId: string): unknown;
  setResponse(stepId: string, questionId: string, value: unknown): void;
  getStepResponses(stepId: string): Record<string, unknown>;
}

interface FormStateController extends FormStateAdapter {
  currentStepIndex: number;
  nextStep(): void;
  prevStep(): void;
  goToStep(index: number): void;
  hydrate?(): void; // optional — called once after mount; a controller without it is simply not hydrated
  reset?(): void;   // optional — a controller without it is simply not cleared after success
}
```

A custom controller that restores state from storage — or from anywhere else the server cannot see — should do so in `hydrate()`, not while it is constructed, so that its first client render matches the server render.

---

## Styling & theming

The components have **no dependency on any design system** — they are styled with Tailwind utilities driven by a small set of `--form-*` CSS variables, scoped to the `.formcomp` class that `MultiStepForm` renders on its root element.

### Theme variables

Override any of them in your own CSS to retheme the whole form:

```css
.formcomp {
	--form-accent: oklch(0.55 0.2 150);   /* selected states, buttons, progress */
	--form-accent-foreground: white;       /* text on accent surfaces */
	--form-bg: white;                      /* input & card backgrounds */
	--form-fg: #1a1a2e;                    /* base text color */
	--form-muted: #6b7280;                 /* descriptions, secondary text */
	--form-border: #e5e7eb;                /* borders & separators */
	--form-error: #dc2626;                 /* validation warning ring */
	--form-radius: 0.625rem;               /* corner radius */
}
```

When using input components standalone (outside `MultiStepForm`), wrap them in an element with `class="formcomp"` so the variables apply.

`theme.css` also ships a `.dark .formcomp` block with dark values for the same tokens; it applies when a `.dark` ancestor wraps the form (the class-based Tailwind dark-mode convention) and is overridden the same way.

### Per-config class hooks

Every level of the config accepts extra Tailwind classes, merged onto the defaults with `tailwind-merge` (so your classes win on conflict):

```ts
const config: FormConfig = {
	class: 'max-w-2xl',                     // form root
	steps: [{
		id: 'basics',
		label: 'Basics',
		class: 'space-y-12',                  // step container
		groups: [{
			id: 'main',
			label: 'Main',
			class: 'rounded-xl border p-6',     // group wrapper
			questions: [{
				id: 'concern',
				type: 'single-select',
				label: 'Pick one',
				class: 'md:col-span-2',           // question root
				optionClass: 'border-dashed',     // each option (select-type questions)
				options: [/* ... */]
			}]
		}]
	}]
};
```

Because the config lives in *your* project source, your Tailwind build scans it and generates whatever classes you use — no extra setup.

## Config format

A form config is a tree: **FormConfig > StepConfig[] > QuestionGroup[] > Question[]**.

### FormConfig

The root object.

```ts
interface FormConfig {
  steps: StepConfig[];
  settings?: FormSettings;
  version?: string | number;  // config version: stamped into the payload, invalidates persisted answers
  submit?: SubmitConfig;      // POST the results to an endpoint (see "Submitting results")
  class?: string;   // extra Tailwind classes on the form root
}
```

### FormSettings

Form-wide behavior switches, all optional:

```ts
interface FormSettings {
  showProgress?: boolean;        // show the step header (default true)
  progressLabel?: string;        // accessible name of the step header's <nav>, default 'Progress'
  allowBackNavigation?: boolean; // when false, hides the Back button AND disables header clicks (default true)
  showSummary?: boolean;         // read-only recap with edit links before submit (default false)
  summaryLabel?: string;         // summary heading, default 'Review your answers'
  editLabel?: string;            // summary edit-button label, default 'Edit'
  nextLabel?: string;            // default 'Next'
  backLabel?: string;            // default 'Back'
  submitLabel?: string;          // default 'Submit'
  requiredMessage?: string;      // message when a required answer is missing, default 'Please complete the required fields in this section.'
  invalidMessage?: string;       // message when an answer is out of range / invalid, default 'Please correct the highlighted answers in this section.'
  successTitle?: string;         // built-in success screen heading, default 'Thank you!'
  successMessage?: string;       // built-in success screen body, default 'Your answers have been submitted.'
  submitErrorMessage?: string;   // shown when the POST fails or onFormComplete rejects (server messages win)
  honeypot?: boolean;            // render a hidden anti-spam field (see "Anti-spam honeypot")
}
```

All labels are passed through the `translate` function when one is provided.

### StepConfig

Each step is one page/screen in the multi-step flow.

```ts
interface StepConfig {
  id: string;       // unique step identifier
  label: string;    // displayed in the progress bar
  intro?: string;   // optional paragraph shown below the step title
  groups: QuestionGroup[];
  condition?: Condition;  // skip the entire step unless met (reference other steps via stepId)
  class?: string;   // extra Tailwind classes on the step container
}
```

A step with an unmet `condition` is **skipped entirely**: it disappears from the progress header, Next/Back jump over it, and its questions are excluded from validation and from the submitted responses.

### QuestionGroup

Groups organize questions under a heading. They are the unit of validation feedback (the first incomplete group gets highlighted).

```ts
interface QuestionGroup {
  id: string;        // unique within the step
  label: string;     // group heading
  intro?: string;    // optional paragraph below the heading
  questions: Question[];
  condition?: Condition;   // hide the entire group unless condition is met
  renderMode?: 'individual' | 'likert-batch' | InlineRenderMode; // InlineRenderMode = 'inline', deprecated
  layout?: LayoutHint;
  class?: string;          // extra Tailwind classes on the group wrapper
}
```

**`renderMode`** controls how the questions inside the group are rendered:

| Mode | Behavior |
|------|----------|
| `'individual'` | (default) Each question renders in its own space with individual warning states. A `likert` question here renders as a one-row scale with its own header. |
| `'likert-batch'` | All questions are passed to a single `LikertGroup` component as a batch table. All questions must share the same `options` array. |
| `'inline'` | **Deprecated** — an alias of `'individual'`; the two always rendered the same markup, and the type `InlineRenderMode` carries the `@deprecated` tag. Use `layout.columns` for side-by-side fields. |

### Question

The individual form field.

```ts
interface Question {
  id: string;         // unique within the step, used as the response key
  uuid?: string;      // stable id for the submission payload — assign once, never change,
                      // then labels/ids/steps can evolve without breaking your backend
  type: QuestionType;
  label: string;      // field label (or i18n key when translate fn is provided)
  required?: boolean;  // if true, validation blocks progression when empty; the label
                       // shows a red * and the controls get aria-required
  options?: QuestionOption[];
  condition?: Condition;
  // Display
  displayVariant?: 'list' | 'card';  // for single-select only
  layout?: LayoutHint;
  // Number/scale
  min?: number;
  max?: number;
  step?: number;       // number-input / range: native step; time-input: rounding interval in seconds (e.g. 900 = 15 min)
  minLabel?: string;   // label under the low end of a scale
  maxLabel?: string;   // label under the high end of a scale
  unit?: string;       // suffix shown inside number inputs (e.g. "kg", "min")
  // Text
  placeholder?: string;
  rows?: number;       // for textarea
  inputType?: 'text' | 'email' | 'url';  // for text-input
  tooltip?: string;    // help text behind an info button after the label (keyboard-reachable, toggles a description)
  // Styling
  class?: string;       // extra Tailwind classes on the question root
  optionClass?: string; // extra Tailwind classes on each option (select-type questions)
}
```

### QuestionType

| Type | Component | Value type | Notes |
|------|-----------|------------|-------|
| `'single-select'` | `RadioListGroup` or `RadioCardGroup` | `string` | Use `displayVariant: 'card'` for card layout. Requires `options`. |
| `'multi-select'` | `CheckboxGroup` | `string[]` | Requires `options`. Supports `exclusive` options. |
| `'select'` | `SelectInput` | `string` | Native dropdown, good for long option lists. Requires `options`; `placeholder` is the empty first option. |
| `'likert'` | `LikertGroup` | `string` | A statement rated on a shared scale. Designed for groups with `renderMode: 'likert-batch'` (one table, one header); it also renders standalone in a default group as a one-row scale with its own header. Each row is a `radiogroup` named by its statement and every radio is named by its option label at every viewport. Requires `options`. |
| `'scale'` | `ScaleInput` | `number` | Numbered circular buttons. Uses `min`/`max` (default 1-10), `minLabel`/`maxLabel`. |
| `'time-input'` | `TimeInput` | `string` | HTML time input. `step` is in seconds (900 = 15-minute rounding). |
| `'date-input'` | `DateInput` | `string` | HTML date input, ISO `YYYY-MM-DD`. |
| `'number-input'` | `NumberInput` | `number` | Supports `min`, `max`, `step`, `unit`, `placeholder`. The value is stored as typed: an out-of-range number is not clamped, it fails validation with `settings.invalidMessage`. |
| `'range'` | `RangeInput` | `{ from, to }` | A from–to interval as two number fields. `min`/`max` bound both ends (validated, not clamped); `minLabel`/`maxLabel` label the fields (default From/To); supports `step`, `unit`. Half-filled, inverted or out-of-range ranges fail validation. |
| `'text-input'` | `TextInput` | `string` | Plain text field. Supports `placeholder` and `inputType: 'email' \| 'url'`. With `inputType: 'email'`, non-empty values must match a conservative email pattern (one `@`, non-empty local part, domain with a dot); with `inputType: 'url'`, they must be an absolute `http:`/`https:` URL. Otherwise validation fails as *invalid*. |
| `'textarea'` | `TextArea` | `string` | Multi-line. Supports `rows` (default 4), `placeholder`. |
| `'consent'` | `ConsentCheckbox` | `boolean` | A single checkbox with the question's `label` rendered next to it (put the full consent text there). When `required`, only `true` validates — GDPR's "this specific box must be ticked". `displayValue` is `'Yes'` (passed through `translate`) or `'—'`. |

### QuestionOption

Used by `single-select`, `multi-select`, and `likert` question types.

```ts
interface QuestionOption {
  value: string;        // stored as the response value
  label: string;        // display text (or i18n key)
  description?: string; // secondary text shown below the label
  exclusive?: boolean;  // multi-select only: selecting this deselects all others
}
```

### LayoutHint

Controls grid layout within a group or for a specific question.

```ts
interface LayoutHint {
  columns?: 1 | 2 | 3;   // render in a CSS grid with this many columns
}
```

Applied on a **group**, this places all the group's questions into a multi-column grid (no `renderMode` needed — the former `renderMode: 'inline'` is a deprecated alias of the default):

```ts
{
  id: 'body-metrics',
  label: 'Body Metrics',
  layout: { columns: 2 },
  questions: [
    { id: 'height', type: 'number-input', label: 'Height', unit: 'cm' },
    { id: 'weight', type: 'number-input', label: 'Weight', unit: 'kg' }
  ]
}
```

### Condition

Conditions control visibility of groups and questions. A hidden question is also excluded from validation.

#### Simple condition

Show this item when a specific question has (or doesn't have) a specific value:

```ts
interface SimpleCondition {
  questionId: string;
  operator: ConditionOperator;
  value?: unknown;   // not used by 'answered' / 'not-answered'
  stepId?: string;   // look up the response in a different step (for cross-step conditions)
}
```

| Operator | Behavior |
|----------|----------|
| `'equals'` | `response === value` (strict — a `scale` answer is a `number`, so compare with a number) |
| `'not-equals'` | `response !== value` |
| `'includes'` | `Array.isArray(response) && response.includes(value)` |
| `'not-includes'` | `!Array.isArray(response) \|\| !response.includes(value)` |
| `'greater-than'` | both response and value are numbers, and `response > value` |
| `'less-than'` | both response and value are numbers, and `response < value` |
| `'answered'` | response is present and non-empty |
| `'not-answered'` | response is missing or empty |

#### Compound condition

Combine multiple conditions with AND/OR:

```ts
interface CompoundCondition {
  operator: 'and' | 'or';
  conditions: Condition[];   // can nest SimpleCondition or CompoundCondition
}
```

#### Examples

Show a question only when another answer is not "no":

```ts
{
  id: 'restless_relief',
  type: 'single-select',
  label: 'Does moving help?',
  condition: {
    questionId: 'restless_legs',
    operator: 'not-equals',
    value: 'no'
  },
  options: [...]
}
```

Show a group only when a question on a different step equals "female":

```ts
{
  id: 'hormonal',
  label: 'Hormonal Factors',
  condition: {
    questionId: 'biological_sex',
    operator: 'equals',
    value: 'female',
    stepId: 'physical'
  },
  questions: [...]
}
```

Compound condition (show when user selected "coffee" AND frequency is "daily"):

```ts
{
  condition: {
    operator: 'and',
    conditions: [
      { questionId: 'beverages', operator: 'includes', value: 'coffee' },
      { questionId: 'coffee_frequency', operator: 'equals', value: 'daily' }
    ]
  }
}
```

---

## Full example

A three-step form demonstrating all question types, conditional logic, layout, and Likert batches:

```ts
const config: FormConfig = {
  steps: [
    {
      id: 'basics',
      label: 'Basics',
      intro: 'Some introductory text.',
      groups: [
        {
          id: 'schedule',
          label: 'Daily Schedule',
          layout: { columns: 2 },
          questions: [
            { id: 'wake', type: 'time-input', label: 'Wake time', required: true, step: 900 },
            { id: 'sleep', type: 'time-input', label: 'Sleep time', required: true, step: 900 }
          ]
        },
        {
          id: 'main-issue',
          label: 'Primary Concern',
          questions: [
            {
              id: 'concern',
              type: 'single-select',
              label: 'What brings you here?',
              displayVariant: 'card',
              required: true,
              options: [
                { value: 'a', label: 'Option A', description: 'Description for A' },
                { value: 'b', label: 'Option B', description: 'Description for B' },
                { value: 'other', label: 'Other', description: 'Something else' }
              ]
            }
          ]
        },
        {
          id: 'other-details',
          label: 'Details',
          condition: { questionId: 'concern', operator: 'equals', value: 'other' },
          questions: [
            { id: 'details', type: 'textarea', label: 'Please describe', required: true, rows: 3 }
          ]
        }
      ]
    },
    {
      id: 'ratings',
      label: 'Severity',
      groups: [
        {
          id: 'severity-scale',
          label: 'How severe is the issue?',
          questions: [
            {
              id: 'severity',
              type: 'scale',
              label: 'Overall severity',
              required: true,
              min: 1,
              max: 10,
              minLabel: 'Not at all',
              maxLabel: 'Extremely'
            }
          ]
        },
        {
          id: 'frequency-ratings',
          label: 'Rate frequency over the past 2 weeks',
          renderMode: 'likert-batch',
          questions: [
            {
              id: 'freq_1', type: 'likert', label: 'Symptom A', required: true,
              options: [
                { value: '0', label: 'Never' },
                { value: '1', label: 'Rarely' },
                { value: '2', label: 'Sometimes' },
                { value: '3', label: 'Often' }
              ]
            },
            {
              id: 'freq_2', type: 'likert', label: 'Symptom B', required: true,
              options: [
                { value: '0', label: 'Never' },
                { value: '1', label: 'Rarely' },
                { value: '2', label: 'Sometimes' },
                { value: '3', label: 'Often' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'profile',
      label: 'Profile',
      groups: [
        {
          id: 'demographics',
          label: 'About You',
          layout: { columns: 2 },
          questions: [
            { id: 'age', type: 'number-input', label: 'Age', required: true, min: 13, max: 120 },
            { id: 'height', type: 'number-input', label: 'Height', required: true, unit: 'cm' }
          ]
        },
        {
          id: 'habits',
          label: 'Daily Habits',
          questions: [
            {
              id: 'activities',
              type: 'multi-select',
              label: 'Select all that apply',
              required: true,
              options: [
                { value: 'exercise', label: 'Exercise' },
                { value: 'meditation', label: 'Meditation' },
                { value: 'reading', label: 'Reading' },
                { value: 'none', label: 'None of the above', exclusive: true }
              ]
            }
          ]
        }
      ]
    }
  ]
};
```

## Email and URL validation

A `text-input` question with `inputType: 'email'` gets a real format check on top of the browser attribute (the form itself is `novalidate`): a non-empty value must have exactly one `@`, a non-empty local part, and a domain containing a dot. Anything else fails validation as *invalid* (red ring + `settings.invalidMessage`). An empty value on a non-required question stays valid. No exotic RFC 5322 corners are attempted; `isValidEmail(value)` is exported if you need the same rule elsewhere.

With `inputType: 'url'` a non-empty value must parse as an absolute URL (`new URL(value.trim())`) whose scheme is `http:` or `https:`. `example.com` (no scheme), `ftp://…`, `javascript:…` and `mailto:…` are rejected as *invalid*; empty and not required stays valid. `isValidUrl(value)` is exported.

```ts
{
  id: 'email',
  type: 'text-input',
  inputType: 'email',
  label: 'Email address',
  required: true,
  placeholder: 'jane@example.com'
}
```

## Consent checkbox

The `consent` question type renders a single checkbox with the question's `label` next to it — put the full consent sentence in the label (it goes through `translate` like every other label). The answer value is a boolean, and when `required`, only `true` validates: an unticked box blocks submission with the *required* message, which is what GDPR's "this specific box must be ticked" needs (a `multi-select` + `required` cannot express that). In summaries and payloads the `displayValue` is `'Yes'` (a translate key — localize it to e.g. `'Da'`) or `'—'` when unticked.

```ts
{
  id: 'gdpr_consent',
  type: 'consent',
  label: 'I agree to receive the newsletter and I accept the privacy policy.',
  required: true
}
```

## Anti-spam honeypot

Set `settings.honeypot: true` and the form renders an extra text input named `website` (`HONEYPOT_FIELD` export) that humans never see: positioned off-screen, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"` — deliberately **not** `display:none`, which naive bots skip.

```ts
const config: FormConfig = {
  settings: { honeypot: true },
  submit: { url: '/api/subscribe' },
  steps: [/* … */]
};
```

Two layers of defense:

1. **Client**: if the honeypot is filled at submit time, the form shows the normal success state (or navigates to `submit.successUrl`) **without** calling `submit.url` and without firing `onSubmitSuccess`/`onSubmitError` — a silent drop the bot can't distinguish from success (the state is cleared like after any success).
2. **Server**: the payload always carries `honeypot: { field: 'website', value: '' }` when the feature is on, so an endpoint can independently reject any submission where the key is missing (request didn't come from the form) or the value is non-empty (bot that bypassed the client).

## Submitting results

Set `config.submit` and the form POSTs the results as JSON when the user submits (after the summary screen, when enabled):

```ts
const config: FormConfig = {
  version: 3,
  submit: {
    url: 'https://api.example.com/quiz-results',
    headers: { authorization: 'Bearer …' },  // optional
    successUrl: '/subscribe'                  // optional: navigate here on success
  },
  steps: [/* … */]
};
```

### Payload

Each answer carries the question's **stable `uuid`** (falling back to `id`), the raw value, and a human-readable `displayValue`. Key your backend on `uuid` and the quiz can be reworded, reordered, and restructured without breaking old data:

```json
{
  "form": { "version": 3, "submittedAt": "2026-07-02T10:00:00.000Z" },
  "answers": [
    {
      "uuid": "3f1c2d84-…",
      "questionId": "traveling",
      "stepId": "travel",
      "type": "single-select",
      "label": "Are you planning to travel this year?",
      "value": "yes",
      "displayValue": "Yes"
    }
  ]
}
```

Only currently visible answers are included (same rules as `onFormComplete`). `buildSubmitPayload(config, getResponse, translate?, honeypotValue?)` is exported if you want to build the payload yourself; the fourth argument fills `payload.honeypot` when `settings.honeypot` is on.

### After a successful POST

In order of precedence:

1. **`redirectUrl` in the server's JSON response** — the browser navigates there. Use this when the follow-up depends on the submission (e.g. a personalized results page).
2. **`submit.successUrl` from the config** — same navigation, statically configured. Ideal for a subscription/results page that needs its own layout.
3. **Built-in success screen** — replaces the form in place, inside the same themed container, so it works in any host page. Text comes from `title`/`message` in the server response, else `settings.successTitle`/`successMessage`.

For a fully custom in-place result view, pass a `success` snippet:

```svelte
<MultiStepForm {config}>
  {#snippet success(payload, response)}
    <ScoreCard score={response.score} />
  {/snippet}
</MultiStepForm>
```

### After success

After a successful submission of any kind — a 2xx POST, a redirect, the honeypot drop, or the callback transport below — the form calls `reset()` on its state controller: every answer is cleared and the persisted storage entry is removed, so a reload (or Back after a redirect) lands on an empty first step instead of a filled last step with Submit one click from a duplicate. The built-in success screen and the `success` snippet render from the payload and response captured *before* the reset. On a redirect the reset happens before the navigation. A failed submission resets nothing.

### Without a submit endpoint

Leave `config.submit` unset and `onFormComplete` is the transport. Return a promise from it (an API call, a store write…) and the form stays busy — Submit disabled, `aria-busy` — until it settles:

```ts
const callbacks: FormCallbacks = {
  async onFormComplete(allResponses) {
    const res = await fetch('/api/answers', { method: 'POST', body: JSON.stringify(allResponses) });
    if (!res.ok) throw new Error('save failed');
    return res.json(); // becomes `response` in the success snippet
  }
};
```

- **Resolved**: the built-in success screen (or the `success` snippet) appears with `settings.successTitle` / `successMessage`; `response` is the resolved value, or `null`. The state is then reset. `onSubmitSuccess` is **not** fired — it reports the POST.
- **Rejected**: the form shows `settings.submitErrorMessage`, fires `onSubmitError(reason)`, keeps every answer and re-enables Submit; the retry calls `onFormComplete` again.

A synchronous `onFormComplete` (no return value) resolves at once, so the success screen shows right away.

### Errors

A failed POST (network error or non-2xx) shows a `role="alert"` message — the server's `message` field when present, else `settings.submitErrorMessage` — and re-enables Submit for a retry. Answers are never lost. The Submit button is disabled while a request is in flight.

Two callbacks report the outcome: `onSubmitSuccess(payload, response)` and `onSubmitError(error)`. A non-2xx response reaches `onSubmitError` as a `SubmitError` carrying the HTTP `status` and the parsed JSON body as `data` (`null` when the body was not JSON); a network failure is passed through as received:

```ts
import { SubmitError } from 'formcomp';

const callbacks: FormCallbacks = {
  onSubmitError(error) {
    if (error instanceof SubmitError) console.warn(error.status, error.data);
    else console.warn('network', error);
  }
};
```

`onFormComplete` still fires when the user submits, before the POST, and is awaited first: a rejected promise aborts the POST (see above).

## Response format

When `onFormComplete` fires, responses are keyed by step ID, then question ID:

```ts
{
  "basics": {
    "wake": "07:00",
    "sleep": "23:00",
    "concern": "other",
    "details": "I have trouble with..."
  },
  "ratings": {
    "severity": 7,
    "freq_1": "2",
    "freq_2": "1"
  },
  "profile": {
    "age": 34,
    "height": 175,
    "activities": ["exercise", "reading"]
  }
}
```

## Validation

Validation runs automatically when the user clicks "Next". The validator:

1. Walks all groups and questions in the current step's config.
2. Skips any group or question hidden by a `condition`.
3. For each visible question with `required: true`, checks that a response exists and is non-empty.
4. For answered `number-input` / `scale` questions, checks the value is within `min`/`max`. Number inputs store what the user typed and never clamp it, so an out-of-range value is reported instead of being silently rewritten to the bound. For `range` questions, both ends must be filled, within bounds, and not inverted. For `text-input` questions with `inputType: 'email'`, a non-empty value must be a plausible email address; with `inputType: 'url'`, an absolute `http(s)` URL (see "Email and URL validation"). A required `consent` question must be `true`.
5. If invalid, highlights the first failing group (red ring, smooth scroll) and shows an error message via `role="alert"` — `settings.requiredMessage` for missing answers, `settings.invalidMessage` for invalid ones. Inside that group only the questions that actually fail get the red field ring. The ring follows the live answer, so a corrected field drops it at once; the group ring and message stay until the next attempt.

No hand-coded validation arrays are needed. The config is the single source of truth.

### Required and invalid state

Every required question shows a red asterisk after its label. The marker is `aria-hidden` and, next to a `<label>`, rendered as a following sibling rather than inside it, so accessible names stay exactly the label text (`getByLabel('Name', { exact: true })` keeps resolving). Likert rows show the marker in their statement cell; the row is named by that cell through `aria-labelledby`, which ignores the hidden marker. Assistive technology gets the state through ARIA:

- `aria-required="true"` on the controls of a required question: the input, select or textarea; each checkbox of a `multi-select` and the `consent` box; for radio-based inputs (`single-select`, `scale`, `likert`) on the `radiogroup` — the fieldset, or the likert row — because the `radio` role supports neither `aria-required` nor `aria-invalid`.
- `aria-invalid="true"` on the same elements while the question is in warning.
- `aria-describedby` on those elements pointing at the group's `<p role="alert">` (id `formcomp-group-<formId>-<group id>-alert`, see [DOM ids](#dom-ids-and-several-forms-on-a-page)), so the message is announced together with the field.

For standalone use the input components take the same as props: `required` and `describedBy` next to `warning`; `LikertGroup` also takes `warningIds` (ids of the rows to mark) so a batch flags failing rows only.

### Tooltips

`question.tooltip` renders an info button after the label (after the required marker), named by the tooltip text and with `title` for hover. It is in the tab order: Enter or Space toggles a description paragraph below the label (`aria-expanded`, `aria-controls`), Escape closes it. Next to a `<label>` the button sits outside the label, so the control's accessible name stays the label text and activating the button never focuses or toggles the control; inside a `<legend>` it follows the marker. Standalone inputs take the same `tooltip` prop (rendered by `FieldLabel`).

### DOM ids and several forms on a page

`MultiStepForm` creates a per-instance id with `$props.id()` (stable across SSR and hydration) and provides it through the `FORM_ID_KEY` context. Every id inside the form, and every radio `name`, is prefixed with it: inputs are `<formId>-<question id>`, option ids `<formId>-<question id>-<option value>`, likert statement cells `formcomp-likert-<formId>-<question id>-statement`, group wrappers `formcomp-group-<formId>-<group id>` and their alerts `formcomp-group-<formId>-<group id>-alert`. Two forms on one page, or a host element with the same id as a question, do not collide — the dev route `/dev/two-forms` renders two instances of the minimal example. Do not hard-code these ids in tests or CSS: select by role and label, or read the prefix with `getContext(FORM_ID_KEY)`. Input components used standalone (no form context) keep their raw `name` as the id.

### Hidden answers

When a question becomes hidden by a condition, its stored answer is cleared, so stale values can't keep dependent conditions alive. On submit, `onFormComplete` receives only the responses of currently visible steps, groups, and questions (via `collectResponses`) — the payload always matches what the user saw.

### Config sanity checks

In dev mode, `MultiStepForm` runs `validateConfig(config)` once and logs each warning with a `[formcomp]` prefix. You can also call `validateConfig` yourself: it returns a `string[]`, so `expect(validateConfig(config)).toEqual([])` in a unit test keeps your configs honest (the shipped examples are tested this way). It warns about:

- **Structure**: no steps, a step without groups, a group without questions; duplicate step, group and question ids; duplicate `uuid`s.
- **Options**: a `single-select`, `multi-select`, `select` or `likert` question without `options`; a `consent` question with `options`; a `likert-batch` group containing a non-`likert` question, or likert rows whose option sets differ.
- **Condition references**: an unknown `stepId` or `questionId`; a comparison operator without a `value`; a step `condition` that resolves to the step itself (a simple condition with no `stepId`, or with the step's own id — a step condition must reference another step).
- **Comparisons that can never match**, checked against the target question's type: `equals` / `not-equals` with a non-number value on a `scale` or `number-input`, with a non-boolean value on a `consent`, with any value on a `range` (object identity), or with a value outside the target's option values; `includes` / `not-includes` on anything but a `multi-select`, or with a value outside its option values; `greater-than` / `less-than` on a non-numeric target, or with a non-number value.

Comparison checks are skipped when the target question is unknown (that warning already covers it). Each message names the step, group or question the condition sits on and the target question involved.

## Project structure

```
src/lib/
  index.ts                          # barrel export
  types.ts                          # full type system + context keys
  i18n.ts                           # useTranslate(): translate fn from context, identity fallback
  format.ts                         # formatAnswer(): human-readable answer values
  submission.ts                     # buildSubmitPayload(), HONEYPOT_FIELD, SubmitError
  styles.ts                         # shared Tailwind class strings for the inputs
  utils.ts                          # cn() — clsx + tailwind-merge; scopedId() and the group id helpers
  theme.css                         # --form-* tokens (shipped as formcomp/theme.css)
  state/
    form-state.svelte.ts            # reactive state with persistence, hydrate() after mount, version check, clamping, reset()
  conditions/
    evaluator.ts                    # condition evaluation engine
  validation/
    validator.ts                    # config-driven validation, isValidEmail, isValidUrl
    config-check.ts                 # validateConfig(): dev-time config sanity checks
  components/
    core/
      MultiStepForm.svelte          # top-level orchestrator
      FormStep.svelte               # renders one step from config
      GroupRenderer.svelte          # renders a group (renderMode, conditions, layout, per-instance ids)
      QuestionRenderer.svelte       # maps question type to input component
      SummaryStep.svelte            # read-only recap of all answers with edit links
    inputs/
      FieldLabel.svelte             # label / legend with required marker and keyboard-operable tooltip button, shared by inputs
      RadioListGroup.svelte         # single-select vertical list
      RadioCardGroup.svelte         # single-select card grid
      CheckboxGroup.svelte          # multi-select with exclusive option logic
      SelectInput.svelte            # single-select native dropdown
      LikertGroup.svelte            # likert-scale batch table
      ScaleInput.svelte             # numbered 1-N circular buttons
      TimeInput.svelte              # time picker with step rounding
      DateInput.svelte              # native date picker (ISO date value)
      NumberInput.svelte            # number with min/max/unit
      RangeInput.svelte             # from–to interval ({ from, to })
      TextInput.svelte              # text/email/url
      TextArea.svelte               # multi-line text
      ConsentCheckbox.svelte        # single boolean consent checkbox
    layout/
      ProgressBar.svelte            # horizontal step indicator with arrows
      NavigationButtons.svelte      # back/next buttons
      StepContainer.svelte          # step title + intro wrapper
      QuestionGroupWrapper.svelte   # group heading + warning ring
src/examples/
  index.ts                          # example registry: slug, title, description, config
  minimal.ts                        # smallest useful form + submission
  conditional.ts                    # conditions, cross-step visibility, step skipping
  likert.ts                         # likert-batch group
  all-inputs.ts                     # every input type, tooltips, summary screen
  customized.ts                     # settings labels/messages, class hooks
  kiosk.ts                          # linear flow: no progress header, no back
  lead-capture.ts                   # email validation, consent, honeypot
  sleep-assessment.ts               # larger three-step form (also the home page demo)
src/routes/
  +layout.svelte                    # app CSS + favicon
  +page.svelte                      # demo page: renders the sleep-assessment example
  examples/
    +page.svelte                    # example gallery
    [slug]/
      +page.svelte                  # renders one example by slug (async onFormComplete; ?fail=once rejects the first call)
  dev/
    two-forms/
      +page.svelte                  # two MultiStepForm instances on one page (per-instance id test bed; not linked from the gallery)
static/
  favicon.svg                       # demo favicon (not part of the package)
  robots.txt
tests/
  unit/                             # Vitest (node; DOM tests opt into jsdom per file)
    evaluator.test.ts               # condition evaluator
    validator.test.ts               # validation incl. isValidUrl, step visibility, collectResponses
    config-check.test.ts            # validateConfig
    submission.test.ts              # buildSubmitPayload, formatAnswer, SubmitError
    email-consent-honeypot.test.ts  # 0.3.0 features
    form-state.test.ts              # createFormState: pure construction, hydrate(), persistence, version, clamping, reset
    form-state-server.test.ts       # createFormState without a window (node): hydrate() is a no-op
    progress-label.test.ts          # settings.progressLabel through translate (SSR render)
    translate-fn.test.ts            # TranslateFn is (key) => string: type-level check, one argument per call, legacy two-arg fn fits
  multi-step-form.spec.ts           # Playwright: skip/clear/validation/summary/submission flows
  lead-capture.spec.ts              # Playwright: email, consent, honeypot
  demo-pages.spec.ts                # Playwright: favicon, home page, sleep-assessment route
  likert.spec.ts                    # Playwright: likert radiogroups and names, standalone likert
  validation-aria.spec.ts           # Playwright: email fix-up, required marker, per-question ring, ARIA state
  submission-lifecycle.spec.ts      # Playwright: state cleared after success, callback transport, SubmitError
  ssr-hydration.spec.ts             # Playwright: reload mid-form — server renders step 1, persisted step swapped in after mount
  tooltip.spec.ts                   # Playwright: tooltip button — focusable, Enter/Escape toggle the description, input untouched
  two-forms.spec.ts                 # Playwright: two forms on one page — per-instance ids, labels, validation
  callbacks.spec.ts                 # Playwright: onStepChange only on a real index change, onStepComplete once
```

## Exports

Everything is available from `'formcomp'`:

```ts
import { MultiStepForm, createFormState, evaluateCondition, validateStep, collectResponses, validateConfig } from 'formcomp';
import type { FormConfig, Question, Condition } from 'formcomp';
```

- **Core components**: `MultiStepForm`, `FormStep`, `QuestionRenderer`, `GroupRenderer`, `SummaryStep`
- **Input components**: `RadioListGroup`, `RadioCardGroup`, `CheckboxGroup`, `SelectInput`, `LikertGroup`, `ScaleInput`, `TimeInput`, `DateInput`, `NumberInput`, `RangeInput`, `TextInput`, `TextArea`, `ConsentCheckbox`, `FieldLabel`
- **Layout components**: `ProgressBar`, `NavigationButtons`, `StepContainer`, `QuestionGroupWrapper`
- **State**: `createFormState`
- **Utilities**: `evaluateCondition`, `isAnswered`, `validateStep`, `questionStatus`, `isStepVisible`, `collectResponses`, `validateConfig`, `isValidEmail`, `isValidUrl`, `buildSubmitPayload`, `formatAnswer`, `useTranslate`
- **Constants**: `HONEYPOT_FIELD`
- **Errors**: `SubmitError` (`status`, `data`)
- **Types**: `FormConfig`, `FormSettings`, `SubmitConfig`, `SubmitAnswer`, `SubmitPayload`, `StepConfig`, `QuestionGroup`, `Question`, `QuestionOption`, `RangeValue`, `Condition`, `SimpleCondition`, `CompoundCondition`, `ConditionOperator`, `QuestionType`, `DisplayVariant`, `LayoutHint`, `InlineRenderMode` (deprecated), `TranslateFn`, `FormStateAdapter`, `FormStateController`, `FormStateOptions`, `FormCallbacks`
- **Context keys**: `FORM_STATE_KEY`, `TRANSLATE_KEY`, `STEP_ID_KEY`, `FORM_ID_KEY` (the enclosing form's id prefix, a string)
