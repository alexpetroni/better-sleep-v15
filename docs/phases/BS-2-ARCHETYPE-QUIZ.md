# BS-2 — The archetype quiz

## Context

The landing copy deck's whole positioning bet is: "Nu toate insomniile sunt la fel. A ta are o
cauză. Găsește-o în 3 minute." The product behind that line is a 12-question Romanian quiz that
identifies the visitor's sleep archetype. The base repo's seeded `evaluare-somn` quiz is
band-scored and unrelated — leave it untouched.

Source material (vendored, reference-only — the `.ts` files import `$lib/types` from a
different project and are NOT compiled here):
- `.initialData/archetypes.ts` + `.initialData/archetype-types.ts` — the 9 archetypes:
  ST Străjerul, MN Managerul, RU Ruminatorul, VU Vulcanul, SA Salvatorul, PE Perfecționistul,
  AN Antena, FU Fugarul, EP Epuizatul (the deck says "eight" because EP is a stage, not a type)
- `.initialData/archetype-copy/` — long-form Romanian result copy per archetype (`.ts` + `md/`)
- The deck's four public patterns (block 3): ADORMITUL IMPOSIBIL, TREZIREA DE LA 3, SOMNUL CARE
  NU ODIHNEȘTE, RITMUL DAT PESTE CAP. Author and commit (in the quiz module, exported) an
  explicit mapping from these four patterns to archetype ids — the landing page (BS-5) and the
  archetype pages (BS-4) will consume it.

## Deliverables

1. **Archetype scoring mode** in `apps/web/src/lib/modules/quiz/scoring.ts` — ADDITIVE:
   ```ts
   resultMode?: 'band' | 'archetype';   // default 'band'; existing quizzes unchanged
   archetypes?: Record<string, { label: string; essence: string; advice: string }>;
   ```
   In `archetype` mode every dimension key must be an archetype key; the computed profile gains
   `winner` and `runnerUp` (dimension with highest/second score). Tie-break is deterministic and
   documented in a code comment: higher score wins; equal scores → earlier declaration order in
   `dimensions`. New `QuizProfile` fields are optional so the band path compiles unchanged.
   Extend `validate.ts` so an `archetype`-mode config with a dimension that has no matching
   `archetypes` entry (or vice versa) is refused loudly.
2. **The quiz content** — `apps/web/src/lib/modules/quiz/seed-archetype-quiz.ts`, exporting a
   formcomp `FormConfig` (12 questions, 3 steps, Romanian, per-question `uuid`s) and its
   `ScoringConfig` in archetype mode. Slug: `arhetip-somn`. Tone and vocabulary follow the copy
   deck (name the visitor's lived nightly experience; no clinical-instrument copy). Wire it into
   `pnpm db:seed` alongside the existing demo quiz.
3. **Result rendering** — the existing result route
   (`(public)/quiz/[slug]/rezultat/…` / `result_template_key` mechanism — read
   `modules/quiz/README.md` and STATE.md first) renders an archetype result: winner name,
   essence, what-it-means copy (adapted from `.initialData/archetype-copy/`), and the runner-up
   as a secondary mention. **The result is shown WITHOUT requiring an email** — this is a
   deliberate product decision from the deck, not an oversight.

## Definition of Done

- Unit tests: archetype-mode scoring (winner, runnerUp, documented tie-break), validation
  refusals, and a test proving EVERY archetype in the seeded config is reachable by at least
  one answer set (construct the answer sets programmatically from the scoring map).
- Band-mode tests untouched and green.
- `pnpm db:seed` seeds the quiz idempotently; e2e: walk all 12 questions to a rendered
  archetype result page.
- Root gate green; `docs/STATE.md` updated (BS-2 section).
