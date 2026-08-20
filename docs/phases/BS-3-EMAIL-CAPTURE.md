# BS-3 — Email capture on the quiz result (protocol offer)

## Context

The deck (block 5): don't gate the quiz result behind email; capture on the follow-up —
"îți trimitem protocolul complet". The quiz result page from BS-2 therefore gets a capture form
BELOW the ungated result. This is the site's only new capture point; the footer newsletter
already exists.

Everything server-side already exists — REUSE, do not reinvent:
- `modules/crm/server.ts` → `requestNewsletterSignup` (double opt-in, token, confirm email)
- `$lib/server/rate-limit` → `consumePublicEmailBudget` (per-IP + global budget)
- the quiz result route's existing `?/email` action (enrolls mailable subscribers; read it and
  its tests before changing anything)
- `modules/nurture` — sequences are DATA in `config/sites/sleep.ts`

## Deliverables

1. **The form** — a small formcomp form on the result page: one email question
   (`text-input`/`inputType: 'email'`), one `consent` question (newsletter consent wording
   consistent with the existing footer copy), honeypot enabled — all three from BS-1. Submission
   posts to the result route's action (progressive enhancement is not required for this form,
   but the plain-form fallback of the existing footer signup must remain untouched).
2. **Server hardening** — the action re-checks EVERYTHING server-side, mirroring the newsletter
   action's "never trust the browser" pattern: consent value, honeypot field empty, rate limit
   via `consumePublicEmailBudget`, email validity. Reject with the same `fail(...)` shapes the
   existing action uses.
3. **Nurture sequence** — add to `config/sites/sleep.ts` `nurture:` a sequence triggered by
   `quiz-completed` for slug `arhetip-somn`, consent `newsletter`: step 0 (same day) "protocolul
   tău" email pointing back to the result URL; step +3 days a follow-up. Romanian copy, deck
   tone. Seeded by the existing `seedNurtureSequences` (upsert-by-key semantics — do not touch
   the operator `active` flag).

## Definition of Done

- Integration tests (Postgres): missing/false consent → 400; honeypot filled → rejected without
  a subscriber row; rate limit trips after the budget; valid submit → exactly ONE subscriber +
  ONE enrollment; resubmitting the same email is a no-op (unique enrollment is the rule).
- E2E: quiz → ungated result → submit email+consent → confirm email present in the
  `EMAIL_DRYRUN` log output.
- Root gate green; `docs/STATE.md` updated (BS-3 section).
