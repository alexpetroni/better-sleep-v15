# BS-11 — Upstream sync: merge better-base FIX-9…FIX-18, adopt formComp 0.4.0

## Context

This repository was cloned from better-base `feat/vercel-neon` at `8ad14ac` (2026-08-19); the
bootstrap commit `0213355` is that tree plus `.initialData/` and the BS phase files. Since then
better-base ran a second remediation batch — 150 commits, FIX-9…FIX-18 against
`docs/AUDIT-2026-09-03.md` — and this repository ran BS-0…BS-10. Neither side has seen the
other. Upstream's batch closes launch blockers this repository still has (the percent-encoded
admin-guard bypass, partial refunds, refund-before-order, fiscal PDFs in the public media
bucket, no ordered deploy pipeline) and adds migrations 0020…0027, `ci.yml` / `backup.yml` /
`deploy/sites.json`, the e-Factura submission queue, per-product VAT, two-phase AWB, the
mail-queue fixes, media quarantine, and a docs split (short `docs/STATE.md`; history in
`docs/CHANGELOG.md`; `ARCHITECTURE.md`, `RUNBOOK.md`, `TESTING.md`, `MIGRATIONS.md`,
`RESTORE.md`).

This phase is a MERGE, not a feature phase: the outcome is one codebase carrying both sides'
behaviour — betterSleep's product layer intact on top of the hardened platform. It then
replaces the vendored formcomp with formComp 0.4.0.

Prepared on the host. The sibling repositories are NOT mounted in your container — do not try
to fetch anything; everything you need is inside this repository:

- tag `better-base-2026-09-05` → upstream tip `8d8146e` (feat/vercel-neon, 2026-09-05);
  tag `better-base-fork-point` → `8ad14ac`. Both trees are readable before the merge with
  `git show better-base-2026-09-05:<path>`. Read from there, before you start:
  `docs/AUDIT-2026-09-03.md`, `docs/STATE.md`, `docs/CHANGELOG.md` (§FIX-9…FIX-18),
  `CLAUDE.md`, `docs/MIGRATIONS.md`.
- a replace ref grafts `0213355` onto `8ad14ac`, so `git merge-base HEAD better-base-2026-09-05`
  is `8ad14ac` and a plain `git merge` is a proper three-way merge.
- `.initialData/formcomp-0.4.0/` — formComp 0.4.0 (its repository tip `ba1e47b`, 2026-09-04):
  `src/`, `tests/`, `static/`, configs, README, CHANGELOG. formComp took this repository's
  BS-1 copy upstream as its 0.3.0 on 2026-09-03, so 0.4.0 is a strict descendant of
  `packages/formcomp` — a replacement, not a merge. Its CHANGELOG section "Upgrading from
  0.3.x" is the adaptation list.

Measured on the host with `git merge-tree`: 55 conflicting files out of 90 touched on both
sides (49 content, 4 add/add, 2 modify/delete); local migrations 0020/0021 collide in number
with upstream's; upstream still references the `life` site in 13 files. Expect that shape.

## Ground rules for this phase

- Both sides' behaviour survives unless a rule below names a winner. Never resolve a conflict
  by dropping a test, a rule or a feature. When two implementations of the same fix meet, keep
  the one this plan names and carry over the other side's test cases that still assert
  something.
- No new features, no drive-by refactors, no fixes to upstream's deferred list (record it as
  inherited backlog). No prettier on `docs/*.md`. Installs use
  `pnpm install --store-dir .pnpm-store`. This project's compose stack listens on
  5434 / 9010 / 9011 (see `.env`); better-base's own stack holds 5433 / 9000 / 9001 — never
  touch it.
- Commit after every stage below (conventional commits); the merge itself is one merge
  commit. The gate runs once at the end of the phase; red between stages is expected.

## Stage A — the merge

1. Preconditions: clean tree; `git merge-base HEAD better-base-2026-09-05` prints `8ad14ac…`.
   If it does not, run `git replace --graft 0213355 8ad14ac` and check again. Never use
   `--allow-unrelated-histories`.
2. `git merge --no-ff better-base-2026-09-05`, resolve per the rules below, commit as
   `merge: better-base feat/vercel-neon @ 8d8146e (FIX-9…FIX-18) into betterSleep`.
   Every file in the merge's conflict output gets a row in the STATE.md resolution table
   (Stage F). No conflict marker may survive anywhere.

Resolution rules — "ours" = betterSleep (HEAD), "theirs" = upstream.

**A1. Docs.**
- `docs/STATE.md`: theirs (the short shape). Move the local sections `## BS-10` … `## BS-0`
  verbatim into `docs/CHANGELOG.md` in date order (newest first: below FIX-9, above "Image
  delivery is a provider seam (2026-08-19)"). The local pre-fork history below BS-0 is already
  in upstream's CHANGELOG — drop the duplicate.
- `README.md` (add/add): ours (the betterSleep guide) plus upstream's additions that apply
  (`pnpm gate`, the new doc pointers, `.node-version`). `content/README.md`: union.
- `DEPLOYMENT.md`, `LAUNCH-CHECKLIST.md`: theirs structurally (§12 ordered deploy, fiscal
  bucket, e-Factura cron, RESTORE, secrets by name — upstream's `migrate-workflow.spec.ts`
  asserts the checklist against `ci.yml` / `deploy/sites.json`; keep it true). Re-apply ours:
  the single-site framing with multi-site as an appendix (M-12), the proxy address-header
  line (H-4), the VAT line (H-10), betterSleep names and bucket names.
- `docs/next/runner.env`: theirs.

**A2. CI, manifests, lockfile.**
- `.github/workflows/ci.yml` (add/add): theirs. Keep from ours only what theirs lacks — check
  whether upstream's gate already runs `pnpm test:neon` through the wsproxy and port that job
  if not. Remove every `life` leg. `deploy/sites.json` is already sleep-only.
- `package.json` (root): union of scripts (theirs: `gate`, `db:check`,
  `db:migrate:concurrent`, `db:role-timeout`, `seed:base`, `seed:demo`, `efactura:requeue`;
  ours: `subscriber:export`); theirs for `engines` / `packageManager`.
  `apps/web/package.json` auto-merged — verify both script sets are present
  (`articles:from-initialdata`, `products:from-initialdata` and upstream's) and that the
  dependency versions are upstream's patched ones.
- `pnpm-lock.yaml`: `git checkout --theirs -- pnpm-lock.yaml`; after every manifest is
  resolved, `pnpm install --store-dir .pnpm-store` (not frozen) regenerates it. Never edit it.
- `packages/formcomp/package.json`: theirs for now; Stage E replaces it.

**A3. Drizzle.** `meta/_journal.json`, `meta/0020_snapshot.json`, `meta/0021_snapshot.json`:
theirs. `git rm` ours `0020_clammy_tana_nile.sql` and `0021_previous_blindfold.sql`. Stage C
brings their columns back as 0028. The schema `.ts` files keep BOTH sides' columns.

**A4. Messages.** `apps/web/messages/ro.json`: union of keys; where both sides added the same
key, ours (Romanian product copy). `apps/web/messages/en.json` stays deleted. Upstream's new
`apps/web/src/lib/messages.spec.ts` asserts ro/en parity: rewrite it for the single-catalog
policy (`ro.json` is the only catalog; `project.inlang/settings.json` lists exactly `ro`) —
do not delete it.

**A5. Theirs wins, re-apply the local delta.** The local delta is small and named here;
`git log 0213355..HEAD -- <file>` shows the commits behind it.
- `apps/web/src/hooks.server.ts`: theirs — `handleSecurityHeaders` first, `handleCsrf`, the
  admin guard keyed on `event.route.id`, request ids. Upstream's
  `$lib/server/security-headers.ts` (+ `kit.csp`) is a superset of the local `handleHeaders`
  (H-5): delete `handleHeaders`, fold the local `e2e/headers.e2e.ts` assertions into
  upstream's `security.e2e.ts` / `hooks.server.spec.ts` where they add something. Keep any
  local hook upstream lacks (the BS-8 client-address resolution via `ADDRESS_HEADER`,
  wherever it lives).
- `apps/web/src/lib/server/launch-check.ts` + spec, `apps/web/scripts/launch-check.ts`:
  theirs (empty Stripe key, mock providers behind `--allow-mock-providers`, production
  `EMAIL_DRYRUN`, auto-migrated VAT schedule, fiscal-bucket probe, neon-on-node…). Re-apply
  the two local rules upstream lacks: `ADDRESS_HEADER` required on a live node deploy (H-4)
  and no `seed-*` id active/published (H-9). Drop the local copies of rules upstream now owns
  (Stripe key, chat/courier mocks) together with their duplicate spec cases.
- `apps/web/src/lib/modules/shop/*` (`webhook.ts`, `checkout.ts`, `stripe-gateway.ts`,
  `service.ts`, `gateway.ts`, `schema.ts`, `server.ts`, `index.ts`, specs): theirs (partial
  and pending refunds, four webhook events, card-only sessions, quantity capped at stock,
  race-safe stock edits, two-phase AWB, fiscal-incomplete). Re-apply ours where upstream has
  no equivalent: H-8 mock Stripe ids never persist + `resource_missing` heals to
  create-fresh; the BS-7 runtime guard (mock gateway ⇒ the checkout action fails 400 in a
  live env, mock courier ⇒ no AWB); L-7 zero-priced products not purchasable; L-6 shipping
  row on the success page and in the order email; M-5 night-map chips checked against the
  live catalogue. Where ours duplicates theirs (M-3 quantity clamp vs FIX-10's cap, M-4
  async-payment events vs FIX-10's four events) keep theirs and port only the local test
  cases that assert something more.
- `apps/web/src/lib/modules/crm/*`: theirs (withdrawal clears the double opt-in + consent
  evidence, POST unsubscribe/confirm, RFC 8058 headers, hook-level CSRF). Local H-2 is
  subsumed. Re-apply M-10 subject-access export (`scripts/subscriber-export.ts` auto-merged —
  make it compile against the new signatures) and M-11 consent-copy version/hash per grant,
  integrated into upstream's `ConsentEvidence` shape — one evidence structure, not two.
- `apps/web/src/lib/modules/email/*`: theirs (Resend `Idempotency-Key`, error
  classification, pacing, Svix bounce webhook, stale-claim reclaim, dry-run→live). Local
  L-3 is subsumed. Keep the local betterSleep copy in `templates.ts`.
- `apps/web/src/lib/modules/nurture/*`: theirs (stale grace window, ordered sends, steps
  hash, operator retry, reseed reopen). Re-apply ours: `result_id` originating result on
  enrollments (M-1: schema + drain), the `{{resultUrl}}` step-CTA token resolved per
  subscriber at send time, first-claim-wins on result claims.
- `apps/web/src/lib/server/retention.ts` + spec: theirs (batched prunes, isolated sweep
  steps); re-apply the quiz-submit throttle sweep (H-6 / M-2) and the claim guards (M-1).
- `apps/web/src/lib/db/seed.ts`, `apps/web/scripts/seed.ts`, `seed.spec.ts`: theirs
  (`seed:base` / `seed:demo`, create-only demo seed). Map ours onto it: the real catalogue
  (33 products via `products:from-initialdata`, the 40 articles, the archetype quiz) is BASE;
  the fictional demo products / articles / `evaluare-somn` are DEMO and land draft or
  inactive (H-9); operator `status` survives re-seeds — keep whichever side's assertion is
  stronger.
- `apps/web/src/lib/modules/content/import.ts`, `bundle.ts`, specs: theirs (skip existing
  unless `--overwrite`, atomic import, deterministic export, strict `parseBundle`); re-apply
  M-7 / M-8 stable `import_key` + idempotent `updated_at`, reconciled into ONE mechanism
  (`import_key` is the identity, `--overwrite` the policy).
- `apps/web/src/lib/modules/settings/registry.ts`: theirs (VAT schedule, IBAN); keep the
  H-10 accountant hint only where the per-product VAT model still leaves the question open.
- Routes — `(public)/cos/+page.server.ts` + `.svelte`, `(public)/magazin/[slug]/+page.server.ts`,
  `(public)/blog/+page.server.ts`, `(public)/+layout.svelte`, `admin/(shell)/products/[id]/*`,
  `admin/(shell)/orders/[id]/+page.server.ts`, `admin/(shell)/settings/*`, `sitemap.xml/*`:
  theirs; re-apply the local features (landing composition in the public layout, product
  JSON-LD + meta descriptions + og fallback M-6, L-8 blog page>max, L-9 price-source link,
  `/tipuri` sitemap entries — quizzes in the sitemap exist on both sides: keep upstream's,
  port the local spec cases). `apps/web/src/lib/server/env-matrix.ts`: union.
- e2e — `frontend.e2e.ts`: theirs, then remove any remaining multi-locale assumption;
  `shop.e2e.ts`: union (upstream's CSP-violation guards + the local cart/stock cases);
  `global-setup.ts` (auto-merged): the truncate list must carry upstream's new tables
  (`invoice_submissions`, `pending_refunds`, `admin_audit`, …) and ours.

**A6. Ours wins, port the upstream delta.**
- `apps/web/src/lib/modules/quiz/*` (`scoring.ts`, `service.ts`, `funnel.ts`, `server.ts`,
  specs): ours (weights scoring kind, ordered dimensions H-1, throttle, claim guards). Port
  upstream `9af3f28` as additions: `validateConfig` on save for live quizzes, question-type
  check, answer coercion by type, bounded numerics, visible-questions-only max score. Port
  `fc9ead3`'s pillar-gate on quiz-result pages and `02b4960`'s capture-path lines.
- `(public)/quiz/[slug]/rezultat/[resultId]/+page.server.ts`: ours; port the same two.
- `apps/web/src/lib/config/sites/sleep.ts`, `config/types.ts`: ours; take upstream's type
  change only if the compiler needs it (a single-locale site emits no alternates anyway).
- `apps/web/e2e/quiz.e2e.ts`, `apps/web/src/lib/db/driver-parity.spec.ts`: ours plus
  upstream's few lines.

**A7. Delete/modify.** `apps/web/src/lib/config/sites/life.ts` and
`apps/web/messages/en.json` stay deleted (`git rm`). Stage D finishes the job.

## Stage B — toolchain

`pnpm install --store-dir .pnpm-store`; `pnpm --filter formcomp package`. `pnpm check` must
compile before you go on (tests may still be red). Commit the regenerated lockfile.

## Stage C — migrations

After the merge `apps/web/drizzle/` holds upstream 0000…0027 untouched. Bring the two local
column sets back as **0028**: `pnpm --filter web db:generate` against the merged schema
(`nurture/schema.ts` `result_id` + FK; `blog/schema.ts` and `shop/schema.ts` `import_key` +
unique indexes). The generated SQL must contain exactly those statements — compare with
`git show 4d782c7:apps/web/drizzle/0020_clammy_tana_nile.sql` and
`git show 4d782c7:apps/web/drizzle/0021_previous_blindfold.sql`; anything else means a schema
file was mis-resolved: fix the schema, regenerate. Rename it `0028_bettersleep_columns.sql`
and set the journal `tag` to match (upstream names later migrations descriptively). The
unique indexes are on small tables — plain `CREATE` is fine, `concurrent-indexes.ts` is not
needed; say so in STATE.

The dev database on this project's compose volume carries the OLD 0020/0021 under other names
and cannot be migrated forward: recreate it (this project's volume only). There is no
production database. Verify: fresh DB → `pnpm db:migrate && pnpm db:check` clean →
`pnpm storage:init` → seed → a second `pnpm db:migrate` is a no-op and `pnpm db:status` is
clean. Record the recreate step in RUNBOOK.

## Stage D — single site, single locale (again)

Upstream re-introduces `life` in: `.github/workflows/ci.yml`, `apps/web/e2e/env.ts`,
`apps/web/e2e/funnel-life.e2e.ts` (delete), `apps/web/e2e/smoke.e2e.ts`,
`apps/web/playwright.config.ts`, `apps/web/src/lib/config/config.spec.ts`,
`config/personas/personas.spec.ts`, `db/seed.spec.ts`, `modules/blog/blog.spec.ts`,
`modules/content/content.spec.ts`, `modules/shop/shop.spec.ts`, `scripts/dev-run.sh`, plus
`CLAUDE.md` / `docs/*.md` prose ("both sites must boot") and `content/life/` if it reappears.
Same treatment as BS-0: a spec that iterated over both sites runs for `sleep` only without
losing its assertion; the e2e harness stays one preview server. `deploy/sites.json` stays
sleep-only.

## Stage E — formComp 0.4.0

1. Replace `packages/formcomp/{src,tests,static,README.md,CHANGELOG.md,LICENSE,
   svelte.config.js,vite.config.ts,vitest.config.ts,playwright.config.ts,tsconfig.json,.npmrc}`
   with the copies in `.initialData/formcomp-0.4.0/` (delete `src/lib/assets` — the favicon
   moved to `static/`). `package.json`: 0.4.0's fields (version, description, license,
   exports incl. `./package.json`, `sideEffects`, `files`, `engines`, scripts,
   peerDependencies) with the workspace's devDependency versions from upstream's
   `packages/formcomp/package.json` (vite 8, TS 6, vite-plugin-svelte 7, `@types/node` 22) —
   one toolchain in the workspace. If 0.4.0's suites cannot run on it, keep 0.4.0's own pins
   and record why in STATE.
2. `pnpm install --store-dir .pnpm-store`, `pnpm --filter formcomp package`;
   `pnpm --filter formcomp test:unit` and `pnpm --filter formcomp test:e2e` green.
3. App adaptations (CHANGELOG "Upgrading from 0.3.x"):
   - DOM ids and radio `name`s are prefixed with the form instance id. `e2e/funnel.ts` and
     `e2e/quiz.e2e.ts` select `input[name="${questionId}"]` — switch to a suffix match
     (`input[name$="-${questionId}"]`) or to role/label selectors. The submit payload still
     carries `questionId` / `uuid`, so the server path is unchanged — the existing submit spec
     proves it.
   - Persisted state is applied after mount. `QuizForm.svelte` persists via `storageKey`, so
     render `<MultiStepForm>` client-only (`{#if browser}` with a same-height placeholder) —
     a resumed quiz must not paint step 1 and then swap. The intro copy stays SSR. If a perf or
     a11y e2e objects, take the smallest change that keeps it green and record the choice.
   - Storage resets after a successful submission (this is what L-5 wanted);
     `x-quiz-attempt` stays per mount. Re-check the quiz e2e expectations around
     reload-after-submit.
   - `validateConfig` is stricter: add a unit test asserting both seeded quizzes
     (`seed-quiz.ts`, `seed-archetype-quiz.ts`) validate with zero warnings, and make the
     save-time gate ported in A6 call the same function — one rule for seeds and the editor.
   - Verify by grep, and state in STATE, that these are unused here: `renderMode: 'inline'`,
     `TranslateFn` params, number clamping (no `number-input` / `range` in the seeds),
     `onFormComplete` as transport, `SubmitError`. `CaptureForm.svelte`'s imports
     (`TextInput`, `ConsentCheckbox`, `questionStatus`, `HONEYPOT_FIELD`) still exist.

## Stage F — docs and constitution follow-through

- `CLAUDE.md` (arrives from upstream): adapt to betterSleep — single site / single locale,
  the 5434 / 9010 / 9011 ports, formcomp vendored from formComp releases (0.4.0 now); the
  boundary rules stay.
- `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/TESTING.md`: add the betterSleep surfaces
  (landing components, `/tipuri`, archetype quiz + weights scoring, the `*-from-initialdata`
  scripts, the BS e2e specs) and the dev-db recreate note.
- `docs/STATE.md` — "after BS-11", upstream's short shape, containing: where we are; Next
  (the human launch items, now including upstream's: `S3_INVOICE_BUCKET`,
  `RESEND_WEBHOOK_SECRET`, the `ci.yml` secrets named in `deploy/sites.json`,
  `--allow-mock-providers` semantics, `.node-version`); a **resolution table** — one row per
  conflicted file: side taken, what was re-applied or dropped, why; a **duplicated-fixes
  table** naming the surviving implementation (H-2 / FIX-13, C-1 + H-7 / FIX-14 + 16 + 18,
  H-5 / FIX-9, M-3 / FIX-10, M-4 / FIX-10, L-3 / FIX-13, M-13 / FIX-15); the **inherited
  backlog** (upstream's deferred items #7…#20); a verification block with real command output.
- `.env.example` auto-merged: verify the new keys are present. `.env` (gitignored, dev only):
  add `S3_INVOICE_BUCKET=bettersleep-fiscal` so `storage:init` and `launch:check --dev` work
  in the container.

## Explicitly out of scope

New features; upstream's deferred findings; anything under `.initialData/`; `PROMPT.md` and
the phase files (read-only); better-base's own stack; fetching from anywhere.

## For the reviewer

The range `base..HEAD` is dominated by upstream's 150 commits, which are in scope by
definition — the phase IS the merge. Review the merge commit with
`git show --remerge-diff <merge-sha>` (that shows only the hand resolutions), the follow-up
commits normally, and dependency changes against
`git diff better-base-fork-point better-base-2026-09-05 -- package.json apps/web/package.json`
before calling any of them out of scope. Then attack the Definition of Done.

## Definition of Done

1. `git log --merges -1` is a merge commit whose second parent is `better-base-2026-09-05`
   (`8d8146e`); `git merge-base HEAD better-base-2026-09-05` prints it.
   `git grep -nE '^(<<<<<<< |>>>>>>> )'` is empty.
2. Gate green from the root: `pnpm lint && pnpm check && pnpm test:unit`; `pnpm gate` (adds
   `pnpm audit --prod --audit-level=high`) exits 0 with only the advisories
   `pnpm-workspace.yaml` already accepts. The web unit suite passes at least 1275 tests
   (upstream at FIX-18) and at least 955 (local at BS-10) — both sides' suites are present,
   not one of them.
3. No spec file from either side deleted or `.skip`ped except the ones STATE names with the
   reason (`funnel-life`, the `life` / `en` cases, `headers.e2e.ts` if fully folded into
   `security.e2e.ts`). No existing assertion weakened.
4. `packages/formcomp/package.json` is 0.4.0;
   `diff -r .initialData/formcomp-0.4.0/src packages/formcomp/src` is empty; the formcomp
   unit and browser suites are green.
5. Drizzle: `git diff better-base-2026-09-05 -- apps/web/drizzle` shows only the added
   `0028_bettersleep_columns.sql`, its snapshot and its journal entry; the SQL is exactly the
   former 0020 + 0021 statements; fresh `pnpm db:migrate && pnpm db:check` clean; after
   seeding, a second migrate is a no-op.
6. Single site: `grep -rn "SITE_ID=life\|sites/life\|better_life\|funnel-life" apps/ scripts/
   .github/ deploy/ docker-compose.yml CLAUDE.md docs/*.md` is empty (`docs/CHANGELOG.md`
   excepted as history); `apps/web/messages/en.json` absent; `project.inlang` lists `ro`
   only.
7. Both builds green: `pnpm build` (adapter-node) and
   `DEPLOY_TARGET=vercel DB_DRIVER=neon pnpm build`.
8. `pnpm test:e2e` green against the single site — upstream's new specs (`security`,
   `settings`, `admin`, `media`, `analytics-consent`) and the local ones (`landing`, `quiz`,
   `perf`, `a11y`) alike.
9. `pnpm launch:check --dev` clean in the container env (output in STATE).
10. Both sides' behaviour, spot-checkable: the quiz tied-answers e2e (H-1) green;
    `GET /%61dmin/subscribers/export.csv` → 303 / 401 (FIX-9 spec); the partial-refund spec
    (FIX-10) green; mock-gateway checkout in a live env → 400 (BS-7 spec); unsubscribe clears
    `confirmed_at` (one surviving spec); `import_key` re-import idempotent (M-7) and
    `--overwrite` honoured (FIX-15) in one mechanism.
11. `docs/STATE.md` BS-11 section as in Stage F; `docs/CHANGELOG.md` carries BS-0…BS-10;
    `CLAUDE.md`, ARCHITECTURE, RUNBOOK, TESTING, DEPLOYMENT and LAUNCH-CHECKLIST updated as
    above.
