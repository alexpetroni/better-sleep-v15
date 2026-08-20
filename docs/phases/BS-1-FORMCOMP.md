# BS-1 — Extend formcomp: email validation, consent checkbox, honeypot

## Context

`packages/formcomp` (v0.2.1, vendored workspace package) powers the quiz and will power the
email-capture form on the quiz result. Three gaps block lead capture:

1. **No email-format validation.** `src/lib/validation/validator.ts` has no `text-input`
   branch, and `MultiStepForm.svelte` renders `<form novalidate>`, so the browser's native
   check is disabled too. An email field currently validates as "non-empty" and nothing more.
2. **No consent-checkbox primitive.** GDPR capture needs "this specific box must be ticked";
   `multi-select` + `required` cannot express that.
3. **No anti-spam.** The POST is a plain unauthenticated client fetch.

These are ADDITIVE extensions. Do not rewrite the library; do not break any existing config.

## Deliverables

1. **Email validation** — in `validation/validator.ts`: when a question is
   `type: 'text-input'` with `inputType: 'email'`, a non-empty value must match a conservative
   email pattern (one `@`, non-empty local part, domain with a dot; no exotic RFC corners) →
   otherwise invalid with `reason: 'invalid'`. Mirror the rule in `questionStatus()` so the
   red-ring/scroll UX works. Empty + not required stays valid.
2. **`consent` question type** — new `QuestionType: 'consent'`:
   - single checkbox; answer value is boolean; validates ONLY when `true` if `required`.
   - label supports the question's normal `label` (rendered next to the checkbox) —
     rich consent text goes in the label string.
   - new `src/lib/components/inputs/ConsentCheckbox.svelte`, exported from the barrel
     (`src/lib/index.ts`), wired into `QuestionRenderer`, handled in `format.ts`
     (displayValue "Da"/"—" style via the translate fn) and in `validation/config-check.ts`.
3. **Honeypot** — opt-in via `settings.honeypot: true` on `FormConfig`:
   - renders a visually-hidden text input (`aria-hidden`, `tabindex="-1"`,
     `autocomplete="off"`, positioned off-screen — NOT `display:none`, bots skip that).
   - if filled at submit time: the client shows the normal success state WITHOUT calling
     `config.submit.url` and without firing `onSubmitSuccess`'s server data (silent drop);
     the honeypot field name/value is included in `buildSubmitPayload` output so a server
     endpoint can independently reject.
4. **Version + docs** — bump `packages/formcomp/package.json` to `0.3.0`; add a CHANGELOG
   entry; document all three features in the README (config shape + one example each).

## Definition of Done

- New vitest cases in `packages/formcomp/tests/unit/` covering: valid/invalid/empty email ×
  required/optional; consent required-true semantics; honeypot payload passthrough. Each new
  test fails against v0.2.1 behavior (state this in the test file header comment).
- All existing formcomp unit tests and the playwright suite green
  (`pnpm --filter formcomp test:unit`, `pnpm --filter formcomp test:e2e`).
- The existing seeded quiz (`evaluare-somn`) still renders and submits unchanged (covered by
  the app's existing quiz tests).
- Root gate green: `pnpm lint && pnpm check && pnpm test:unit`.
- `docs/STATE.md` updated (BS-1 section).
