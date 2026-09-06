# betterSleep — mission & engineering constitution

You are building **betterSleep** (bettersleep.ro): a Romanian-market sleep site — landing page,
archetype quiz, blog, shop, chat — on top of the existing, working better-base platform this
repository was cloned from. You are NOT rebuilding the platform; you are shaping, extending and
populating it. The platform's record lives in `docs/`: `docs/STATE.md` (where we are) and —
once BS-11 has merged upstream — `docs/CHANGELOG.md` (the dated history, BS-0…BS-10 included),
`docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/TESTING.md`. **Read the section for a module
before touching that module**, and read the module's own `README.md` where one exists.

Work at HIGH effort: think before editing, prefer reading existing code over guessing, and
never trade correctness for speed.

## What "done" means for the product

- The landing page implements the copy deck at `.initialData/somnium-landing-copy-deck.md`
  (10 of its 12 blocks — Authority and Testimonials are deliberately omitted; the deck itself
  forbids shipping them as placeholders). The deck's brand name "Somnium" is a working title:
  **the brand is betterSleep** — render brand mentions accordingly.
- A 12-question Romanian archetype quiz is the site's central conversion device; its result is
  shown WITHOUT requiring an email.
- Email capture happens on the quiz result (protocol offer) through the existing double-opt-in
  CRM path, plus the existing footer newsletter.
- 40 Romanian articles and 33 real products are seeded via the content-bundle mechanism.
- Romanian only: `locales: ['ro']`.

## Binding stack & architecture rules (inherited from better-base — do not revisit)

- SvelteKit 2 + **Svelte 5 runes only** (no legacy `$:`/`export let` APIs), Tailwind CSS v4 via
  `@tailwindcss/vite`, TypeScript strict. Postgres 16 + Drizzle; migrations are additive and
  committed; `pnpm db:migrate` must run cleanly on a fresh database at any commit.
- **Modules as folders** under `apps/web/src/lib/modules/` — each owns its Drizzle schema,
  server services, and components. Cross-module imports go ONLY through the module's `index.ts`
  barrel. Routes stay thin and call module services.
- **Nothing brand-specific hardcoded** in a route or component — brand derives from
  `apps/web/src/lib/config/sites/sleep.ts`. All user-facing copy goes through Paraglide
  (`apps/web/messages/ro.json`, `import { m } from '$lib/paraglide/messages'`).
- `packages/formcomp` is an internal dependency vendored from formComp releases: you may extend
  it additively and fix bugs, but do not rewrite it. Replacing it wholesale with a newer vendored
  release under `.initialData/formcomp-<version>/` is allowed only when a phase plan says so
  (BS-11: 0.4.0).
- Admin is part of the app at `/admin`. No external CMS.
- No `any` escapes, no `@ts-ignore` without a one-line justification comment.
- Money is integer bani (cents); `apps/web/src/lib/util/money.ts` is the only place amounts meet strings.

## Content sources — vendored, never live

Everything you need is inside this repository under `.initialData/`:

- `somnium-landing-copy-deck.md` — the landing spec (copy is used verbatim, brand → betterSleep)
- `articles/` — 40 Romanian article bodies (markdown, NO frontmatter; line 1 is the `# H1`)
- `topics.json` — 40 entries; **`slug` is authoritative, but `title`/`excerpt` are ENGLISH** —
  never use them as Romanian content
- `archetypes.ts`, `archetype-types.ts`, `archetype-copy/` — the 9 sleep archetypes and their
  long-form result copy (reference material from an earlier project; not compiled here)
- `zenyth-products.json` — 33 real products with real prices (integer lei)

**Never fetch content from live third-party websites.** The vendored data is the only source;
the build must be reproducible offline.

## Mock & external-service rules

Never call paid or external services from tests:

- **Email**: all sends go through `modules/email` honoring `EMAIL_DRYRUN=true`. Tests run dry.
- **LLM**: chat uses the `ChatProvider` interface; tests and dev default to `MockChatProvider`.
  NEVER use this runner's own credentials for the app.
- **Stripe**: automated tests mock the Stripe client; leave `stripe_product_id`/`stripe_price_id`
  null in seeds until live keys exist.
- **Storage**: local MinIO container, or pure functions.

## Environment you run in

You are inside a Docker container with the repo mounted and access to the HOST docker daemon
(docker-out-of-docker):

- Containers you start with `docker compose up` are SIBLINGS; reach their published ports at
  **`host.docker.internal:PORT`**, never `127.0.0.1`.
- Load env through `loadRootEnv()` (`apps/web/scripts/env.ts`) — it rewrites hosts per
  environment. Never hardcode a host.
- The app's dev server / vitest run inside your container and reach Postgres at
  `host.docker.internal:5432` via `DATABASE_URL` from `.env`.

## Quality bar & test policy

- `pnpm lint && pnpm check && pnpm test:unit` must pass from the repo root at the end of every
  phase — this exact command also runs as an independent gate you do not control.
- Unit tests (vitest) for every service function with logic. Integration tests that need
  Postgres use the compose database with a dedicated `*_test` database.
- E2E (playwright) happy-path where the phase plan says so, against a built preview server.
- Every deliverable is proven by a test that fails against the old behavior where feasible.

## Working rules

- Execute ONLY the phase you are given (the runner appends it). The binding phase plans for
  THIS project are `docs/phases/BS-*.md`; other files under `docs/phases/`, `docs/next/` and
  `docs/fixes/` are the base platform's historical build records — context, not instructions.
- Commit in small conventional-commit steps (`feat(landing): …`, `test(quiz): …`). Do not push;
  the runner pushes.
- Never fake a green result. If a DoD item is genuinely unreachable, STOP and write
  `BLOCKER.md` at the repo root explaining what is blocked, why, what you tried, and what
  decision is needed — then exit nonzero.
- Update `docs/STATE.md` at the end of each phase: what exists now, key commands, anything the
  next phase must know.
