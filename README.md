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

## Running on Vercel (Neon + Cloudflare R2)

The condensed, ordered path. Every step is covered in depth in
[`DEPLOYMENT.md`](DEPLOYMENT.md) — §2 (environment matrix), §5 (R2), §6 (images),
§7 (Stripe), §8 (email), §9 (cron), and §12 (the Vercel/Neon specifics). The
adapter switches itself: Vercel sets `VERCEL=1`, `vite.config.ts` picks
`adapter-vercel`; nothing forks in the code.

### 1. Accounts you need first

- **Neon** — one project, database `better_sleep`. Note BOTH connection strings:
  the **pooled** URL (`…-pooler.…neon.tech`) and the **unpooled** one.
- **Cloudflare** — the site's DNS zone, an **R2 bucket** (e.g. `bettersleep-media`)
  with S3 credentials, the bucket bound to a **public custom domain** on that zone
  (e.g. `media.bettersleep.ro`), and **Image Transformations enabled** on the zone
  (two dashboard steps — DEPLOYMENT.md §5–§6).
- **Resend** — the sending domain verified.
- **Stripe** — live keys when the shop goes live (test keys are refused by the
  live-env preflight).
- Optional: **Anthropic** key for the chat assistant; **Sameday** contract for
  real AWBs. Until then keep `CHAT_PROVIDER` / `COURIER_PROVIDER` at `mock` —
  but note `pnpm launch:check` refuses mocks in a live env
  (`EMAIL_DRYRUN=false`), by design.

### 2. Create the Vercel project

Vercel → New Project → import this repo:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Node version | **22.x** |

The install MUST run at the repo root: `packages/formcomp`'s `dist/` is
gitignored and is built by its `prepare` script — an install scoped to
`apps/web` produces a build that cannot resolve `formcomp`.
`apps/web/vercel.json` ships the cron schedule automatically.

### 3. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
| --- | --- |
| `SITE_ID` | `sleep` |
| `PUBLIC_SITE_URL` | `https://bettersleep.ro` (https required) |
| `DB_DRIVER` | `neon` |
| `DATABASE_URL` | the **pooled** Neon URL (`…-pooler…?sslmode=require`) |
| `DIRECT_DATABASE_URL` | the **unpooled** Neon URL (migrations only) |
| `CRON_SECRET` | `openssl rand -hex 32` — guards the cron routes |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `TOKEN_SECRET` | `openssl rand -base64 32` — MUST differ from `BETTER_AUTH_SECRET` (boot refuses otherwise) |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_REGION` | from R2 |
| `S3_BUCKET` | `bettersleep-media` |
| `IMAGE_PROVIDER` | `cloudflare` |
| `MEDIA_PUBLIC_BASE_URL` | `https://media.bettersleep.ro` (the R2 custom domain) |
| `EMAIL_DRYRUN` | `false` + `RESEND_API_KEY` set (this pair is the "live env" signal) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | live key + the webhook signing secret from step 6 |
| `CHAT_PROVIDER` | `anthropic` + `ANTHROPIC_API_KEY` (or `mock` pre-launch) |
| `COURIER_PROVIDER` | `sameday` + `SAMEDAY_USERNAME`/`SAMEDAY_PASSWORD`/`SAMEDAY_PICKUP_POINT` (or `mock` pre-launch) |
| `ADDRESS_HEADER` / `XFF_DEPTH` | **leave unset on Vercel** — the platform resolves client IPs; setting them makes rate limits spoofable |

Boot validates the whole matrix and refuses to start with a message listing
every missing variable — a bad deploy fails at startup, not as 500s.

### 4. CI migrations (one-time wiring)

Migrations run from GitHub Actions, not from the Vercel build:
GitHub repo → Settings → Secrets → Actions → new secret
**`DIRECT_DATABASE_URL`** = the **unpooled** Neon URL. From then on
`.github/workflows/migrate.yml` applies pending migrations on every push to
`main`, before Vercel promotes that same push. No-op when current.

### 5. First-deploy one-offs (from a local checkout)

```sh
DIRECT_DATABASE_URL="postgres://…neon.tech/better_sleep?sslmode=require" pnpm db:migrate
DATABASE_URL="…-pooler…" S3_ENDPOINT=… S3_BUCKET=… pnpm db:seed   # needs R2 creds too
DATABASE_URL="…-pooler…" pnpm content:init                        # 40 articles + 33 products, idempotent
DATABASE_URL="…-pooler…" pnpm media:blurhash
DATABASE_URL="…-pooler…" pnpm user:create -- --email you@x.ro --role admin --password '…'
```

All idempotent — safe to re-run. Later deploys need none of this.

### 6. Stripe webhook

Stripe dashboard → Webhooks → add endpoint
`https://bettersleep.ro/api/stripe/webhook` (event: `checkout.session.completed`
and the async-payment pair — see DEPLOYMENT.md §7), then put its signing secret
in `STRIPE_WEBHOOK_SECRET`.

### 7. Admin settings

Log in at `/admin/settings` and replace every `PLACEHOLDER — …` value: company
identification (CUI, Reg. Com., IBAN), ANPC/SOL links, invoice series, shipping
prices, and the **VAT rate** — confirm the supplements rate with your accountant
first (see `docs/REVIEW-2026-08-21.md` H-10). `launch:check` fails while any
placeholder remains.

### 8. Preflight, deploy, verify

```sh
# with the production env exported (exported values win over .env):
pnpm launch:check              # numbered report; must exit 0

git push origin main           # migrate workflow runs, then Vercel builds & promotes

# verify the deploy:
curl -s https://bettersleep.ro/api/health          # {"db":"ok","storage":"ok"}
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://bettersleep.ro/api/cron/nurture-send
```

`launch:check` probes the live image pipeline (R2 custom domain + real webp out
of `/cdn-cgi/image`) and reads the target database's settings — the failure
modes that otherwise look healthy. Crons (`chat-prune` daily, `shipment-sync`
hourly, `nurture-send` every 15 min) are scheduled by `apps/web/vercel.json`
and answer 503 without the Bearer secret. Full post-deploy walk: DEPLOYMENT.md §11.
