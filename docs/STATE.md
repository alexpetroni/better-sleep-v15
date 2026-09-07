# STATE — betterSleep after BS-11 (2026-09-07, branch `main`)

Short by design (upstream FIX-16 shape): where the project is and what comes
next. The dated history — better-base's FIX-* phases and betterSleep's BS-*
phases — is `docs/CHANGELOG.md`; the map is `docs/ARCHITECTURE.md`
(§ "betterSleep surfaces" for the product layer); commands and quirks
`docs/RUNBOOK.md`; tests `docs/TESTING.md`; the migration contract
`docs/MIGRATIONS.md`; the constitution `PROMPT.md`.

## Where we are

- **One codebase carrying both lines.** BS-11 merged better-base
  `feat/vercel-neon` @ `8d8146e` (FIX-9…FIX-18, 149 commits since the fork
  point `8ad14ac`) into betterSleep (BS-0…BS-10) as one merge commit
  (`cd0b58f`, second parent `8d8146e`), then made it compile, kept both test
  suites, regenerated the two local columns as migration **0028**, removed the
  `life` site again, vendored **formComp 0.4.0** and re-cut the docs. Upstream's
  launch blockers this repo still had are closed here now: the percent-encoded
  admin-guard bypass (FIX-9), partial / pending refunds (FIX-10), fiscal PDFs
  in a private bucket + the e-Factura queue (FIX-12), the mail-queue fixes
  (FIX-13), media quarantine (FIX-15), the ordered `ci.yml` deploy (FIX-16),
  `pnpm gate` with the audit (FIX-18). betterSleep's product layer — landing,
  archetype quiz, `/tipuri`, the 40 articles + 33 products, launch-safety
  guards, SEO, GDPR export — is intact on top.
- Feature-complete for launch; what remains is human work (below).
- Two deployment targets from one build: adapter-node and Vercel + Neon
  (`DEPLOY_TARGET=vercel DB_DRIVER=neon`), both green.
- Single site, single locale: `SITE_ID=sleep`, `messages/ro.json` only.

## Next (human launch items)

1. **Wire the pipeline and watch the first Actions run** (upstream FIX-16/18):
   repo secrets with EXACTLY the names `deploy/sites.json` declares —
   `DIRECT_DATABASE_URL_SLEEP` (the UNPOOLED Neon URL), `VERCEL_PROJECT_ID_SLEEP`,
   plus the shared `VERCEL_TOKEN` / `VERCEL_ORG_ID`; the `production`
   environment; branch protection requiring `gate`. Then push and follow
   gate → migrate → deploy → `/api/health` showing the new commit
   (`DEPLOYMENT.md` §12 "Ordered deploy"). Until that run is green the
   pipeline is asserted by `migrate-workflow.spec.ts`, not proven. Node: the
   runners read `.node-version` (22); 24 also works locally.
2. **Vercel project settings** (§12): automatic production deploys OFF, Build
   Command `pnpm db:status && pnpm build`, Node 22,
   `ENABLE_EXPERIMENTAL_COREPACK=1`, previews on a Neon branch; the real-Neon
   check and `pnpm db:role-timeout` before the first deploy.
3. **Env the platform now requires**: `S3_INVOICE_BUCKET` (the PRIVATE
   fiscal bucket, e.g. `bettersleep-fiscal`, R2 with NO public domain;
   `launch:check` refuses a cloudflare deploy without it and probes that the
   media domain does not serve `/invoices/`), `RESEND_WEBHOOK_SECRET`
   (Svix secret of the Resend bounce/complaint webhook → `/api/webhooks/resend`;
   the route answers 503 without it), `ERROR_REPORT_URL` (warning only),
   `ADDRESS_HEADER` (+ `XFF_DEPTH`) on a live NODE deploy (H-4, not needed on
   Vercel).
4. **`pnpm launch:check` semantics**: a production env (`EMAIL_DRYRUN` not
   `false`, or mock chat / courier) fails unless `--allow-mock-providers`
   acknowledges a deliberate rehearsal — the flag is for staging, never for
   the launch run; `--dev` acknowledges dev defaults and skips the database
   checks; `--no-probe` keeps the run env-only (CI).
5. **Accounts, keys, texts** (`LAUNCH-CHECKLIST.md`): Stripe live keys +
   webhook, Resend domain + `EMAIL_DRYRUN=false`, Sameday contract,
   Anthropic key (or a conscious mock launch), the 15 placeholder site
   settings replaced in `/admin/settings` (company, IBAN, invoice series, the
   VAT standard-rate schedule saved consciously — the auto-migrated one is a
   launch problem), **per-product VAT rates confirmed with the accountant**
   (H-10, now `products.vat_rate_bp`), legal texts, and the demo rows
   (`seed-*` ids, draft by default) retired or published on purpose (H-9).
6. Seven green nightly backups + one verified restore (`docs/RESTORE.md`).
7. Backlog: the inherited list below and the P2 items each FIX entry deferred.

## BS-11 — upstream sync: merge FIX-9…FIX-18, formComp 0.4.0 (2026-09-07)

Plan: `docs/phases/BS-11-UPSTREAM-SYNC.md`. Commits: the merge `cd0b58f`,
then `fix(merge)` (compile), `feat(db)` (0028), `test(merge)` (both suites),
`feat(formcomp)` (0.4.0), `test(e2e)`, and the `docs` commits. Reviewer:
`git show --remerge-diff cd0b58f` shows only the hand resolutions.

### Merge shape

55 conflicted files (49 content, 4 add/add, 2 modify/delete) out of 367
touched; `git merge-base` was `8ad14ac` through the replace ref grafting
`0213355`. Resolution rules are the phase plan's A1…A7; every conflicted file
is in the table below (side taken, what was re-applied or dropped, why).

### Resolution table

| File | Side | Re-applied / dropped — why |
| --- | --- | --- |
| `docs/STATE.md` | theirs | Short shape. BS-10…BS-0 moved verbatim to `docs/CHANGELOG.md` (below FIX-9, above "Image delivery is a provider seam"); the local pre-fork history was already there — dropped. This file is the BS-11 rewrite. |
| `README.md` (add/add) | ours | + upstream's `pnpm gate`, Node 22 / `.node-version` prerequisite, `pnpm --store-dir .pnpm-store install`, `db:check`, `seed:base`/`seed:demo`, the "Where to read next" table and the layout line. |
| `DEPLOYMENT.md` | theirs (structure) | Auto-merged §5 fiscal bucket, §12 ordered deploy, RESTORE, secrets by name. Hunks: the single-site env table kept (M-12) + upstream's `S3_INVOICE_BUCKET` row; §8 dry-run→live paragraph theirs (L-3 subsumed by FIX-13). Re-applied: "Adding a second site (§10)" instead of better-life, locale policy rewritten for the single catalog; H-4 §3 lines and betterSleep bucket names were already ours in the auto-merged text. |
| `LAUNCH-CHECKLIST.md` | theirs | Fiscal-bucket box, chat box with `--allow-mock-providers` (the BS-7 chat bullet is subsumed). Re-applied H-10 as a PER-PRODUCT VAT decision (FIX-12). Secrets named as `ci.yml` / `deploy/sites.json` read them — `migrate-workflow.spec.ts` green. |
| `docs/next/runner.env` | theirs | Auto-merged identical. |
| `.github/workflows/ci.yml` (add/add) | theirs | + the local `neon` job (BS-10 L-15: `pnpm test:neon` through the compose wsproxy — upstream's gate never exercised the neon driver), on upstream's pinned actions and `.node-version`. Removed every second-site leg: the second database's creation ×2, its migrate step, "both preview servers". |
| `package.json` | theirs | `engines`, `packageManager`, scripts `gate`/`db:check`/`db:migrate:concurrent`/`db:role-timeout`/`seed:base`/`seed:demo`/`efactura:requeue`; + ours `name: better-sleep`, `subscriber:export`. |
| `pnpm-lock.yaml` | theirs | Then regenerated by `pnpm install --store-dir .pnpm-store` — unchanged by the merge, changed by the formComp 0.4.0 manifest. Never edited. |
| `packages/formcomp/package.json` | theirs → 0.4.0 | Theirs at the merge; Stage E replaced it (see below). |
| `apps/web/package.json` | auto | Both script sets present (`articles:from-initialdata`, `products:from-initialdata`, `subscriber:export` + upstream's); dependencies are upstream's patched versions + ours `@fontsource-variable/plus-jakarta-sans` (BS-5). |
| `drizzle/meta/_journal.json`, `0020_snapshot.json`, `0021_snapshot.json` | theirs | Ours `0020_clammy_tana_nile.sql` / `0021_previous_blindfold.sql` removed; their statements are `0028_bettersleep_columns.sql` (Stage C). Schema `.ts` files keep both sides' columns. |
| `apps/web/messages/ro.json` | union | Hunk: theirs `admin_settings_invoice_vat_standard_rates`; ours `admin_settings_invoice_vat_rate` + `_hint` dropped (the setting is gone with FIX-12). H-10 hint re-added as `admin_product_vat_rate_hint` under the product VAT select — where the question is still open. |
| `apps/web/messages/en.json` (mod/del) | deleted | Single catalog. Upstream's `src/lib/messages.spec.ts` rewritten for the policy: `ro.json` is the only catalog, `project.inlang` lists exactly `ro`, no blank values. |
| `apps/web/src/hooks.server.ts` | theirs | `handleRequestId` → `handleSecurityHeaders` → `handleCsrf` → paraglide → settings → route-id admin guard. Deleted `handleHeaders` + `$lib/server/headers.ts` (+ `headers.spec.ts`, `e2e/headers.e2e.ts`): folded into `security-headers.spec.ts` (the nosniff/referrer/frame family, no report-only header) and `security.e2e.ts` (`/admin/login` carries the family; no HSTS on http). The BS-8 client-address resolution is adapter-node's own `ADDRESS_HEADER` (env-matrix, auto-merged). |
| `lib/server/launch-check.ts` (+ spec) | theirs | + H-4 (`ADDRESS_HEADER` / `XFF_DEPTH` on a live node deploy, conditional — holds under `--dev`); H-9 stays in `scripts/launch-check.ts` (`seededDemoLaunchProblems`, auto-merged). Dropped the local C-1/H-7 copies (Stripe key presence/shape, chat/courier mocks) and their 6 table cases + the "--dev still enforces the live-provider rules" case (upstream owns them: FIX-16 empty key, FIX-14 mocks, FIX-18 dry-run, all production-only + `--allow-mock-providers`); its H-4 half stays as its own case. Upstream's `makeLive()` fixture now carries `ADDRESS_HEADER`; the local `liveEnv()` fixture stays. |
| `scripts/launch-check.ts` | theirs | Fiscal privacy probe; + ours "database checks" (settings + H-9) comment. |
| `modules/shop/webhook.ts` | theirs (9 hunks) | FIX-10: four session events, partial/pending refunds, `fiscalIncomplete`. M-4 subsumed. |
| `modules/shop/checkout.ts` | theirs | `maxQty` cap, `available` includes qty ≤ stock; + L-7 `isPurchasable` (zero-priced never purchasable). M-3's clamp dropped (FIX-10 refuses instead) with its two `shop.spec` cases (`stock.spec.ts` covers the cap). |
| `modules/shop/stripe-gateway.ts` (+ spec) | theirs | `paymentMethodTypes` from `shop.allowAllPaymentMethods`; M-4's hard pin subsumed. Spec: ours H-8 `resource_missing` cases kept (no upstream equivalent) + theirs payment-method block; the local pin case dropped (duplicate). |
| `modules/shop/shop.spec.ts` | theirs | FIX-12 VAT-snapshot case; `completedSessionEvent` fixture = union (`paymentStatus` + phone / customerName / paymentMethodTypes). The BS-9 M-4 describe kept for what `async-payments.spec.ts` does not assert (trail, email count across redeliveries), on FIX-10's outcome kinds (`payment-already-settled`, `empty-cart`, fulfillment cancelled). |
| `modules/crm/consent.ts`, `index.ts`, `service.ts` | theirs | `ConsentEvidence` (ip, userAgent, consentTextVersion), `withdrawAllConsents`, `revokeConsentsByEmail`; H-2 subsumed. M-11 integrated into the SAME evidence: `consent-copy.ts` now yields `consentTextVersion = <message key>@<version>:sha256:<16-hex label hash>` (`consentTextRef`, `currentConsentTextVersions()`), passed by the newsletter action and the quiz `?/email` action; `ConsentCopyRefs` / `ConsentRecord.copy` are gone. M-10 `scripts/subscriber-export.ts` compiles unchanged. |
| `modules/crm/crm.spec.ts` | theirs | H-2 `isMailable` assertions folded into upstream's withdrawal case (one surviving spec); M-11 case rewritten on the evidence shape; `newsletter-action.spec` asserts the `key@version:sha256:…` shape (stronger). |
| `modules/email/service.ts`, `email.spec.ts` | theirs | Stale-claim reclaim, dryrun→live in the UPDATE guard, `Idempotency-Key`; L-3 subsumed. Ported the dry-mode in-flight assertion. `templates.ts` (betterSleep copy) auto-merged. |
| `modules/nurture/drain.ts`, `nurture.spec.ts` | both | Theirs pacing / stale cancel / ordered claims + ours `resolveResultUrl` (`{{resultUrl}}` from the enrollment's originating `result_id`, M-1). |
| `lib/server/retention.ts`, `retention.spec.ts` | theirs | Isolated steps, `pendingRefundRows`, `failures`; + ours `quizResultRows` sweep (H-6/M-2) as a step + injectable pruner, in the summary line. |
| `db/seed.ts`, `scripts/seed.ts`, `seed.spec.ts` | theirs | Create-only + `base` / `demo` halves, mapped: archetype quiz and the `content/sleep` bundles are BASE; demo articles / quiz / products are DEMO and land draft / inactive (H-9; `opts.status` for the e2e setup). Operator status survives trivially (create-only is stronger than "status only on INSERT"); `seededDemoLaunchProblems` kept; upstream's no-duplicate assertion counts by slug (the archetype quiz coexists). |
| `modules/content/import.ts`, `bundle.ts` | theirs | Transaction per item, skip unless `overwrite`, strict `parseBundle`; reconciled with M-7/M-8 into ONE mechanism: `findExistingArticle/Product` (import_key → slug fallback) is the identity for BOTH the skip gate and the update, `rowUnchanged` skips the UPDATE under `--overwrite`; `bundle.ts` validates `importKey` AND `vatRateBp`. `sleep-content.spec` asserts skip-by-default, rename-in-place under overwrite, updated_at stable. |
| `modules/settings/registry.ts` | theirs | `invoice.vatStandardRates` schedule, IBAN validate/normalize; `invoice.vatRateBp` gone. H-10 hint moved to the product editor (see ro.json). |
| `routes/(public)/cos/+page.server.ts`, `+page.svelte` | theirs | `maxQty` + `cart_line_max_qty`; + `mockCheckoutBlocked` (BS-7 runtime guard) kept; `stockLimited` dropped. |
| `routes/(public)/magazin/[slug]/+page.server.ts` | theirs | `clampLineToStock`; + ours `imgUrl` / `productJsonLd` / `productMetaDescription` (M-6) and `isPurchasable` (L-7). L-9 price-source line lives in the bundles (auto-merged). |
| `routes/(public)/blog/+page.server.ts` | theirs | `pastLastPage`; the L-8 spec (`blog-page.spec.ts`) passes against it. |
| `routes/(public)/+layout.svelte` | theirs | `hreflangAlternates` → nothing for one locale (replaces BS-0's ro + x-default pair; `frontend.e2e.ts` theirs: zero alternates). Landing composition untouched (auto-merged). |
| `routes/(public)/quiz/[slug]/rezultat/[resultId]/+page.server.ts` | ours | Protocol capture (`newsletter: true`, `profileEmails: false`), L-13 winner page; ported the FIX-15 PILLAR gate and the FIX-13 evidence (ip, user agent, `currentConsentTextVersions()`). The PUBLISHED half of upstream's gate is deliberately not applied: L-4 keeps delivered result links alive after an unpublish; upstream's `quiz-routes.spec` asserts only the pillar case. |
| `routes/admin/(shell)/products/[id]/+page.server.ts`, `+page.svelte` | theirs | Stock re-base + `vatRateBp` select; + `centsToDecimal` (L-14, the one place bani meet a decimal string), the H-10 hint, and the `sync` null guard (H-8: keyless envs skip the Stripe mirror). |
| `routes/admin/(shell)/settings/+page.server.ts` | theirs | `requireAdmin`, audit; + `centsToDecimal` (L-14); the svelte `fieldHints` map is empty now. |
| `routes/sitemap.xml/+server.ts` | ours | `/tipuri` entries (ARCHETYPE_PAGES); quizzes in the sitemap exist on both sides — upstream's `listPublishedQuizzesForSitemap` survives, the M-13 copy deleted, the local spec cases pass. |
| `apps/web/e2e/frontend.e2e.ts` | theirs | Zero hreflang alternates. |
| `apps/web/e2e/shop.e2e.ts` | union | CSP-violation guard + the local catalogue (36 cards) / stock cases. `global-setup.ts` (auto): truncate list carries `invoice_submissions`, `pending_refunds` + ours; `admin_audit` is append-only and not truncated upstream either. |
| `modules/quiz/scoring.ts`, `scoring.spec.ts` | ours | Weights kind, ordered dimensions (H-1); + `DEFAULT_NUMERIC_BOUND`, `visibleQuestions` gate (hidden questions score nothing and add no max), typed coercion (9af3f28). `flattenStepResponses` (onFormComplete transport) dropped — unused since BS-2. |
| `modules/quiz/service.ts`, `funnel.ts`, `quiz.spec.ts` | ours | + upstream's `validateForPublish` on save of a published quiz, the question-type table, media-ref check, `ConsentEvidence` passthrough. |
| `config/sites/sleep.ts` | ours | + upstream's `locales` comment; `config/types.ts` auto-merged (no type change needed). |
| `config/sites/<second site>.ts` (mod/del) | deleted | Single site (BS-0); upstream had modified it. |
| `e2e/quiz.e2e.ts`, `db/driver-parity.spec.ts` | auto | Ours + upstream's lines. |

### Duplicated fixes — the surviving implementation

| Local | Upstream | Survivor |
| --- | --- | --- |
| H-2 unsubscribe clears `confirmed_at` | FIX-13 `withdrawAllConsents` | FIX-13 (+ the H-2 `isMailable` assertions in its spec) |
| C-1 + H-7 `launch:check` refuses mock Stripe / chat / courier | FIX-14 mocks, FIX-16 empty key, FIX-18 `EMAIL_DRYRUN` | FIX-14/16/18 (production-only, `--allow-mock-providers`); the local rules and cases dropped; H-4 kept as a conditional rule |
| H-5 `handleHeaders` (report-only CSP) | FIX-9 `security-headers.ts` + `kit.csp` (enforced) | FIX-9; the report-only header is gone on purpose |
| M-3 quantity clamp | FIX-10 cap + refusal | FIX-10 |
| M-4 async-payment events | FIX-10 four events | FIX-10 (the BS-9 cases kept on its kinds) |
| L-3 dry-run rows superseded live | FIX-13 | FIX-13 |
| M-13 quizzes in the sitemap | FIX-15 | FIX-15's function, the local spec cases |
| M-11 consent-copy hash | FIX-13 `consentTextVersion` | ONE field: FIX-13's `key@version` + M-11's hash |
| M-7/M-8 import identity / updated_at | FIX-15 skip-unless-overwrite | ONE mechanism: import_key identity, `--overwrite` policy |
| L-4 result links survive unpublishing | FIX-15 result-page gate | L-4 + the pillar half of FIX-15 |
| H-10 site-wide VAT hint | FIX-12 per-product rates | Per-product hint + checklist |

Kept with no upstream equivalent: H-8 (mock ids never persist, `resource_missing` heals), BS-7 runtime guards, L-6, L-7, M-5, M-6, M-10, L-14, the quiz throttle (H-6/M-2) and its sweep, M-1 `result_id`.

### Stage C — migration 0028

`0028_bettersleep_columns.sql` = exactly the former local 0020 + 0021
statements (`nurture_enrollments.result_id` + FK, `articles.import_key`,
`products.import_key`, two unique indexes) generated against the merged
schema on top of upstream 0020…0027; journal tag set to match. Plain
`CREATE UNIQUE INDEX`: `articles` / `products` are small — the concurrent
path (`concurrent-indexes.ts`) is not needed. The dev database on this
project's compose volume carried the old 0020/0021 under other names and was
recreated (RUNBOOK "Recreating the dev database"); no production database
exists.

### Stage D — single site, single locale

Upstream re-introduced `life` in `ci.yml`, `CLAUDE.md`, the docs and the
blog visibility spec; each runs for `sleep` only without losing its assertion
(`blog.spec` uses an explicit nutritie-active pillar list instead of the
removed site). The second site's funnel spec never came back (deleted at BS-0,
untouched upstream); no second-site content directory exists. `deploy/sites.json` is sleep-only.
`docs/CHANGELOG.md` keeps its history as written.

### Stage E — formComp 0.4.0

`packages/formcomp` `src`, `tests`, `static`, configs, README, CHANGELOG,
LICENSE are the copies from `.initialData/formcomp-0.4.0/` (`src/lib/assets`
gone, favicon in `static/`); `diff -r` on `src` is empty. `package.json`:
0.4.0's fields (version, description, license, exports incl.
`./package.json`, `sideEffects`, `files`, `engines`, scripts,
peerDependencies) with the workspace's devDependency pins from upstream (vite
8, TS 6, vite-plugin-svelte 7, `@types/node` 22, kit 2.63) plus 0.4.0's
`jsdom` (its form-state unit tests) — 0.4.0's suites run on the workspace
toolchain, no own pins needed. Two ADDITIVE subpath exports stay:
`./conditions` (upstream FIX-15, `evaluateCondition` for `scoring.ts`) and
`./config-check` (`validateConfig` for `validate.ts`, which runs inside
`node scripts/seed.ts` where the main barrel's Svelte components cannot load).

App adaptations: `e2e/funnel.ts` and `e2e/quiz.e2e.ts` select
`input[name$="-<questionId>"]` (radio names are prefixed with the form
instance id; the submit payload still carries `questionId`, the submit spec
is unchanged); `QuizForm.svelte` renders `<MultiStepForm>` client-only
(`{#if browser}`) behind a `min-h-[28rem]` `aria-busy` placeholder so a
resumed quiz never paints step 1 and then swaps (the intro copy stays SSR;
perf and a11y e2e green as-is); storage resets after a successful submission
(L-5's wish) with `x-quiz-attempt` still per mount — no quiz e2e expected a
persisted form after submit. `validateForPublish` now includes
`validateConfig`, so the seeds, the save/publish gate and the editor share
one rule; `seed-quizzes.spec.ts` asserts both seeded quizzes validate with
zero warnings. Verified by grep, unused here: `renderMode: 'inline'`,
`TranslateFn` params, number clamping (no `number-input` / `range` in either
seed), `onFormComplete` as transport, `SubmitError` / `onSubmitError`.
`CaptureForm.svelte`'s imports (`TextInput`, `ConsentCheckbox`,
`questionStatus`, `HONEYPOT_FIELD`) still exist in 0.4.0's barrel.

### Spec files removed or narrowed (DoD 3)

Removed: `apps/web/src/lib/server/headers.spec.ts` and `apps/web/e2e/headers.e2e.ts`
(fully folded into `security-headers.spec.ts` / `security.e2e.ts`), the
formcomp 0.3.0 `tests/` (replaced by 0.4.0's). Dropped cases: the six
launch-check table cases and one `it` for the local C-1/H-7 rules (upstream
owns them), the two M-3 clamp cases and the M-4 card-pin case (FIX-10),
upstream's `flattenStepResponses` case (function removed). Nothing is
`.skip`ped beyond the pre-existing `skipIf(!PROXY)` driver-parity suite and
the pre-existing perf `raster images…` skip under `IMAGE_PROVIDER=direct`.

### Inherited backlog (upstream's deferred list, verbatim numbering)

From the 2026-09-05 whole-project review, not in FIX-18's scope:

- **#7** A settings-table read failure 500s every public page (no fallback in the request-scoped loader).
- **#9** Content import can publish an unrenderable quiz (the CLI path bypasses the admin render check). *Narrowed here: `validateForPublish` now includes formcomp's `validateConfig`, but the CLI import still does not call it.*
- **#10** `checkout.session.expired` is unhandled — stuck `pending` orders hold stock; no expiry sweep.
- **#12** Neon pool of one connection versus Vercel Fluid Compute.
- **#13** Nightly backup trusts the runner's ambient `pg_dump`; retention can erase every good dump.
- **#14** e-Factura drain has no submit-then-persist idempotency contract (latent while the submitter is the no-op).
- **#15** `invoices.issued_at` has no index although the export comment claims one — goes through `concurrent-indexes.ts`.
- **#16** CI gate does not run everything it claims, and a red e2e is invisible (`continue-on-error`, no summary).
- **#17** E2E coverage gaps the audit listed remain open.
- **#18** Untriaged low findings from the phase reviews that are real defects (bundle).
- **#19** CSP lacks `default-src`; consent cookie unversioned and never `Secure`.
- **#20** STATE/CHANGELOG end state — addressed by upstream's FIX-18 section and this one.

Plus the per-phase "deferred on purpose" items in the FIX-11…FIX-15 CHANGELOG
entries (manual "mark as submitted", AWB labels in the media bucket, ANAF
validator not called from the build, `attention` enrollment status,
`steps_hash` backfill, a launch-check rule for `RESEND_WEBHOOK_SECRET`,
bounces on `email_log`, a `pending/` probe, sweeping abandoned `pending/`
objects, TOTP for admins). Accepted advisories (`pnpm-workspace.yaml`
`auditConfig.ignoreGhsas`): GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq
(image-size ≤ 2.0.2, no published fix; mitigated by `disableTypes` in
`media/service.ts`) — plus, below the gate's level, GHSA-67mh-4wv8-2f99
(esbuild via drizzle-kit, moderate) and GHSA-pxg6-pf52-xh8x (cookie via kit, low).
Noticed, not changed: SvelteKit 2.70 deprecates `kit.csrf.checkOrigin`
(build-time warning only).

## Verification (BS-11)

Real command output from this run (container, compose stack on 5434 / 9010 /
9011, `EMAIL_DRYRUN=true`, mocks everywhere):

- `git log --merges -1`: `cd0b58f` — parents `a6368cf` (betterSleep) and
  `8d8146e` (better-base-2026-09-05); `git merge-base HEAD better-base-2026-09-05`
  → `8d8146e`; `git grep -nE '^(<<<<<<< |>>>>>>> )'` → empty.
- `pnpm gate` (= `pnpm lint && pnpm check && pnpm test:unit && pnpm audit
  --prod --audit-level=high`): exit 0. lint clean (prettier + eslint);
  svelte-check: formcomp 481 files, web 3809 files, 0 errors 0 warnings;
  test:unit — web 148 files, Tests 1457 passed | 4 skipped (1461); formcomp 9 files, Tests 146 passed (146)
  (upstream at FIX-18: 1275; local at BS-10: 955 — both suites are present).
  `pnpm audit --prod --audit-level=high`: exit 0, "4 vulnerabilities found — Severity: 1 low | 1 moderate | 2 high (2 ignored)" — the two
  ignored highs are the accepted image-size advisories, the moderate/low pair
  is below the level (see "Inherited backlog").
- `packages/formcomp`: version 0.4.0; `diff -r .initialData/formcomp-0.4.0/src
  packages/formcomp/src` → empty; `pnpm --filter formcomp test:unit` 9 files /
  146 tests passed; `pnpm --filter formcomp test:e2e` 46 passed (27.5 s).
- Drizzle: `git diff --stat better-base-2026-09-05 -- apps/web/drizzle` →
  only `0028_bettersleep_columns.sql` (+6), `meta/0028_snapshot.json`,
  `meta/_journal.json` (+7). The SQL is the six former 0020/0021 statements.
  Fresh `better_sleep` (dropped + created on this project's volume) →
  `pnpm db:migrate` "migrations applied successfully", `site_settings_updated_by_idx`
  created (concurrent) → `pnpm db:check` "Everything's fine" → `pnpm storage:init`
  (media bucket + private `bettersleep-fiscal`) → `pnpm db:seed`: 1 pillar,
  3 pages, 15 placeholder settings, 4 nurture sequences, archetype quiz
  ensured, "Initial content from common, sleep: 73 imported, 0 failed",
  3 demo articles / 1 demo quiz / 3 demo products created (draft) → second
  `pnpm db:migrate` no-op ("present site_settings_updated_by_idx") →
  `pnpm db:status` "up to date (29 migrations applied)".
- Single site: `grep -rn "SITE_ID=life\|sites/life\|better_life\|funnel-life"
  apps/ scripts/ .github/ deploy/ docker-compose.yml CLAUDE.md docs/*.md`
  (CHANGELOG excepted) → empty; `apps/web/messages/` holds `ro.json` only;
  `project.inlang` → `"locales": ["ro"]`.
- Builds: adapter-node ("Using @sveltejs/adapter-node … done", inside
  `pnpm test:e2e`) and `DEPLOY_TARGET=vercel DB_DRIVER=neon pnpm build`
  ("Using @sveltejs/adapter-vercel … done", exit 0). Both print SvelteKit's
  `kit.csrf.checkOrigin` deprecation warning only.
- `pnpm test:e2e` (adapter-node build + the single preview server on 4173,
  chromium installed via `playwright install chromium`): 57 passed, 1 skipped
  (the pre-existing perf `raster images…` skip under `IMAGE_PROVIDER=direct`),
  0 failed, 30.1 s — upstream's `security` / `settings` / `admin` / `media` /
  `analytics-consent` and the local `landing` / `quiz` / `perf` / `a11y`
  alike. The first run had exactly one failure — upstream's blurhash case
  read the demo card's lazy cover below the fold of the 36-product grid —
  fixed by scrolling it into view (the BS-6 fix ported to `security.e2e.ts`),
  spec re-run 4/4, then the full suite again green.
- `pnpm launch:check --dev`: "launch:check — target node, SITE_ID sleep,
  --dev: OK (image probe skipped: IMAGE_PROVIDER=direct has no transforms to
  probe; fiscal privacy probe skipped: --dev; database checks skipped: --dev)".
- Both sides' behaviour, spot-checked in the green runs: the tied-answers
  quiz e2e (`quiz.e2e.ts:222`, H-1/L-16) ✓; `GET /%61dmin/…` → 303 / 401
  (`hooks.server.spec.ts`, `security.e2e.ts:27`) ✓; partial refunds
  (`refunds.spec.ts`) ✓; mock-gateway checkout → 400 in a live env
  (`live-guard.spec.ts`) ✓; unsubscribe clears `confirmed_at` (`crm.spec.ts`,
  one surviving case with the H-2 assertions) ✓; `import_key` re-import
  idempotent and `--overwrite` honoured in one mechanism
  (`sleep-content.spec.ts`, `content.spec.ts`, `init.spec.ts`) ✓.
- Not done: nothing from the phase plan. Not run: `pnpm test:neon` (no wsproxy
  in this container; the ported CI `neon` job runs it).

