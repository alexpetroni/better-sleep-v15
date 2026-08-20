# BS-0 — Repo shape: single brand, single locale

## Context

This repo is a clone of better-base's `feat/vercel-neon` tip. better-base served two sites
(`SITE_ID=sleep` | `life`) from one codebase. This repository serves ONE brand — betterSleep —
in ONE locale (`ro`). This phase removes the second site and the second locale so every later
phase works against a single-brand, single-locale codebase.

## Deliverables

1. **Remove the `life` site.**
   - Delete `apps/web/src/lib/config/sites/life.ts` and the `life` entry in the `SITES` map in
     `apps/web/src/lib/config/index.ts`.
   - Delete `content/life/`.
   - Update `apps/web/src/lib/config/config.spec.ts` and every test that boots or asserts
     `SITE_ID=life` (grep for `SITE_ID=life`, `'life'`, `life.ts` across `apps/web` and
     `playwright.config.ts`).
   - **Rework the e2e harness**: `playwright.config.ts` currently builds once and runs TWO
     preview servers (sleep :4173, life :4174). Reduce to the single sleep site; keep the
     port and test conventions otherwise unchanged.
2. **Romanian only.**
   - `apps/web/project.inlang/settings.json` → `"locales": ["ro"]`.
   - Delete `apps/web/messages/en.json`.
   - `apps/web/src/lib/config/sites/sleep.ts` → `locales: ['ro']`.
   - Remove the now-pointless hreflang alternate for `en` in
     `apps/web/src/routes/(public)/+layout.svelte` (keep canonical/x-default correct for a
     single-locale site).
   - Run `pnpm paraglide:compile` (also part of `pnpm check`) and fix fallout.
3. **Identity.**
   - Root `package.json` name → `better-sleep`.
   - `config/sites/sleep.ts`: keep `id: 'sleep'`, `name: 'Better Sleep'`,
     `domain: 'bettersleep.ro'`; extend `nav` with a quiz entry
     (`{ label: 'Testul de somn', href: '/quiz/arhetip-somn' }` — the slug BS-2 will seed).
4. **Docs hygiene.** Add a short root `README.md`: what this repo is (betterSleep, cloned from
   better-base), the key commands (compose up, migrate, seed, dev, gate), and a pointer to
   `docs/STATE.md`. Do not delete better-base's historical docs.

## Explicitly out of scope

Landing page, quiz, forms, content — later phases. Do not touch `packages/formcomp` here.

## Definition of Done

- `pnpm lint && pnpm check && pnpm test:unit` green from the repo root.
- `docker compose up -d --wait` then `pnpm db:migrate && pnpm storage:init && pnpm db:seed`
  clean on a fresh database (drop/recreate or fresh volume first).
- `pnpm test:e2e` green against the single site.
- `grep -rn "SITE_ID=life" apps/ playwright.config.ts` and
  `grep -rn "sites/life" apps/` return nothing; `messages/en.json` is gone.
- `docs/STATE.md` updated with a "BS-0" section describing the single-site shape.
