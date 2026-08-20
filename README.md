# betterSleep

Romanian-market sleep site — landing page, archetype quiz, blog, shop, chat —
at **bettersleep.ro**. Single brand, single locale (`ro`).

Cloned from the **better-base** platform (its `feat/vercel-neon` tip); this
repo shapes, extends and populates that platform rather than rebuilding it.
The architecture log lives in [`docs/STATE.md`](docs/STATE.md) — read the
section for a module before touching it. The betterSleep phase plans are
`docs/phases/BS-*.md`; other files under `docs/phases/`, `docs/next/` and
`docs/fixes/` are better-base's historical build records.

## Key commands (from the repo root)

```sh
docker compose up -d --wait   # Postgres 16 + MinIO + imgproxy
pnpm install                  # also builds packages/formcomp (prepare)
pnpm db:migrate               # Drizzle migrations (additive, committed)
pnpm storage:init             # create the media bucket (idempotent)
pnpm db:seed                  # pillars + demo content + content/ bundles
pnpm dev                      # dev server (apps/web)

pnpm lint && pnpm check && pnpm test:unit   # the phase gate
pnpm test:e2e                 # builds, then playwright against :4173
```

Environment lives in the root `.env` (see `.env.example`); `SITE_ID=sleep` is
the only site. See `docs/STATE.md` → "Key commands" and "Env & environment
quirks" for the full list.
