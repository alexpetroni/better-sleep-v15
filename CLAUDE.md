# Working in betterSleep

Read `PROMPT.md` first — it is the engineering constitution (mission, stack, module
layout, site-config rule, mock rules, test policy) and binds every change.
Then `docs/STATE.md` (where we are), `docs/ARCHITECTURE.md` (boundaries) and
`docs/RUNBOOK.md` (commands and environment quirks). The dated history —
better-base's FIX-* phases and betterSleep's BS-* phases — is
`docs/CHANGELOG.md`.

This repository is the **betterSleep** product on the better-base platform:
one site (`SITE_ID=sleep`, `bettersleep.ro`), one locale (`ro`), synced with
upstream `feat/vercel-neon` up to FIX-18 (BS-11, 2026-09-07).

## Boundary rules that reviewers check

- Cross-module imports go through the barrel only: `$lib/modules/<name>` or
  `$lib/modules/<name>/server`. ESLint enforces it; do not add exceptions.
- Nothing brand-, company- or country-specific in code: site config
  (`src/lib/config/sites/sleep.ts` — the only site) or `site_settings` data.
  All user-facing copy goes through Paraglide (`messages/ro.json`, the only
  catalog; `project.inlang` lists exactly `ro`).
- Money is integer bani; fiscal records are append-only; external side
  effects are idempotent; providers sit behind an interface with a mock.
- Migrations are additive, in a new numbered file, never edited once
  committed; large-table indexes go through `concurrent-indexes.ts`
  (`docs/MIGRATIONS.md`).
- Secrets never reach client code or a command line (`--password-stdin`).
- `packages/formcomp` is vendored from formComp releases (0.4.0 since
  BS-11): extend it additively and fix bugs, never rewrite it; a wholesale
  replacement happens only when a phase plan says so.
- Content comes from the vendored `.initialData/` (bundles under
  `content/sleep/`), never from a live third-party site.

## How to work

- Test-first for fixes: the failing test commits before the fix.
- Gate before you finish: `pnpm lint && pnpm check && pnpm test:unit`
  (`pnpm gate` adds `pnpm audit --prod --audit-level=high`).
- `SITE_ID=sleep` must boot; both adapters (`pnpm build`,
  `DEPLOY_TARGET=vercel DB_DRIVER=neon pnpm build`) must build.
- Never run prettier on `docs/*.md`. Installs need
  `pnpm install --store-dir .pnpm-store`. Compose services are siblings:
  `host.docker.internal:PORT` from an agent container — this project's stack
  publishes 5434 (Postgres) and 9010 / 9011 (MinIO); better-base's own stack
  holds 5433 / 9000 / 9001, never touch it.
- Record what you closed or deferred in `docs/STATE.md`; move the previous
  phase's section to `docs/CHANGELOG.md`.
