# Running betterSleep on Vercel (Neon + Cloudflare R2)

Ordered operator checklist, condensed from `DEPLOYMENT.md` (§2, §5, §6, §12),
`LAUNCH-CHECKLIST.md`, `.github/workflows/ci.yml` and `deploy/sites.json`.
Where this file and `DEPLOYMENT.md` disagree, `DEPLOYMENT.md` wins.

Shape: Vercel functions (Node 22) → Neon Postgres (pooled endpoint) → R2 for
media, Cloudflare Image Transformations for resizing. Nothing always-on of our
own. The adapter switches itself: Vercel sets `VERCEL=1` and `vite.config.ts`
picks `adapter-vercel`.

**Domain.** `bettersleep.ro` is not hardcoded in runtime code. Every URL the app
builds comes from `PUBLIC_SITE_URL`. The `domain` field in
`apps/web/src/lib/config/sites/sleep.ts` is read only by `pnpm launch:check`,
which refuses a `PUBLIC_SITE_URL` host that differs from it. For another
domain: set `PUBLIC_SITE_URL`, and either change `domain` in `sleep.ts` or
accept that one preflight line. Also adjust `email.from` / `replyTo` in the
same file (Resend sends only from a verified domain) and regenerate
`static/og-default.png` (`scripts/og-default-image.sh`) if the baked-in text
matters.

## 1. Accounts and infrastructure

1. **Neon**: one project, database `better_sleep`. Copy BOTH connection
   strings: pooled (`…-pooler.…neon.tech/better_sleep?sslmode=require`) and
   unpooled (same without `-pooler`). Optionally a branch off `main` for
   Vercel previews.
2. **Cloudflare** (zone of the site domain):
   - R2 bucket `bettersleep-media`; bind a public custom domain on the same
     zone, e.g. `media.<domain>` (R2 → Settings → Public access → Custom domain).
   - R2 bucket `bettersleep-fiscal`; bind NO public domain to it, ever.
   - One R2 API token with Object Read & Write on both buckets. Note the
     access key, secret and the endpoint `https://<accountid>.r2.cloudflarestorage.com`.
   - Enable Image Transformations for the zone (Images → Transformations).
   - WAF custom rule: block `http.host eq "media.<domain>" and starts_with(http.request.uri.path, "/pending/")`.
   - Optional lifecycle rule deleting `pending/` objects older than one day.
3. **Resend**: verify the sending domain (SPF + DKIM). Create a webhook for
   `https://<site>/api/webhooks/resend` on `email.bounced` + `email.complained`;
   keep its `whsec_…` signing secret.
4. **Stripe**: live keys when the shop goes live. Webhook endpoint
   `https://<site>/api/stripe/webhook` with exactly four events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `charge.refunded`. Keep its secret.
5. **Optional**: Anthropic key (chat), Sameday contract (courier). Until then
   `CHAT_PROVIDER=mock` / `COURIER_PROVIDER=mock`.
6. **Vercel plan**: Pro. Hobby coalesces every cron to once a day, which
   breaks the 15-minute nurture drain and the hourly polls.

## 2. Prove Neon once from a checkout

The local test stack proves the WebSocket driver but not Neon's PgBouncer or
TLS path. Run once against the real project before the first deploy:

```bash
DIRECT_DATABASE_URL="postgres://…neon.tech/better_sleep?sslmode=require" pnpm db:migrate
DIRECT_DATABASE_URL="postgres://…neon.tech/better_sleep?sslmode=require" pnpm db:role-timeout
DB_DRIVER=neon DATABASE_URL="…-pooler…/better_sleep" TEST_DATABASE_URL="…-pooler…/better_test" pnpm test:unit
```

(`better_test` has to exist on Neon for the third command; it is dropped and
re-migrated by the suite.)

## 3. Create the Vercel project

Vercel → New Project → import the repo.

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `pnpm db:status && pnpm build` |
| Output Directory | auto (`.vercel/output`) |
| Node.js version | 22.x |
| Git → Production Branch | `main` |
| Git → automatic production deploys | **OFF** (previews stay ON) |

Why: the install must run at the repo root so `packages/formcomp` is built by
its `prepare` script (its `dist/` is gitignored). `pnpm db:status` refuses to
build while a migration is pending on the target database. Production is
promoted by GitHub Actions after the migration, never by Vercel's Git hook.

`apps/web/vercel.json` ships the four cron schedules; nothing to configure.

## 4. Vercel environment variables (Production)

| Variable | Value |
| --- | --- |
| `SITE_ID` | `sleep` |
| `PUBLIC_SITE_URL` | `https://<domain>` (https required) |
| `DB_DRIVER` | `neon` |
| `DATABASE_URL` | pooled Neon URL |
| `DIRECT_DATABASE_URL` | unpooled Neon URL (used by `db:status` in the build) |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | `15000` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `TOKEN_SECRET` | `openssl rand -base64 32`, MUST differ from the one above |
| `S3_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | from the R2 token |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `bettersleep-media` |
| `S3_INVOICE_BUCKET` | `bettersleep-fiscal` |
| `IMAGE_PROVIDER` | `cloudflare` |
| `MEDIA_PUBLIC_BASE_URL` | `https://media.<domain>` |
| `CF_IMAGE_BASE_URL` | leave unset (defaults to `PUBLIC_SITE_URL`) unless the bucket is on another zone |
| `EMAIL_DRYRUN` | `true` until the Resend domain is verified, then `false` |
| `RESEND_API_KEY` | required once `EMAIL_DRYRUN=false` |
| `RESEND_WEBHOOK_SECRET` | the Resend webhook `whsec_…` (route answers 503 without it) |
| `STRIPE_SECRET_KEY` | `sk_live_…` for launch (`sk_test_…` for a rehearsal) |
| `STRIPE_WEBHOOK_SECRET` | from the Stripe endpoint |
| `CHAT_PROVIDER` | `anthropic` + `ANTHROPIC_API_KEY`, or `mock` |
| `COURIER_PROVIDER` | `sameday` + `SAMEDAY_USERNAME` / `SAMEDAY_PASSWORD` / `SAMEDAY_PICKUP_POINT`, or `mock` |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (honours `packageManager: pnpm@11.10.0`) |
| `ERROR_REPORT_URL` | optional error sink; a log drain is the alternative |
| `NODE_ENV` | **leave unset** (setting it breaks the formcomp build) |
| `ADDRESS_HEADER` / `XFF_DEPTH` | **leave unset** on Vercel |

Preview environment: point `DATABASE_URL` / `DIRECT_DATABASE_URL` at a Neon
branch, `EMAIL_DRYRUN=true`, mocks, a test Stripe key.

Boot validates the matrix and refuses to start with one message listing every
missing variable.

## 5. Wire GitHub Actions (gate → migrate → deploy)

1. Repo → Settings → Secrets and variables → Actions:
   - `VERCEL_TOKEN` (account token), `VERCEL_ORG_ID` (team id)
   - `DIRECT_DATABASE_URL_SLEEP` (the UNPOOLED Neon URL)
   - `VERCEL_PROJECT_ID_SLEEP` (Vercel project → Settings → General)
   The per-site names come from `deploy/sites.json`; they must match exactly.
2. Repo → Settings → Environments: create `production` (optionally require a
   reviewer, then every migrate/deploy waits for a click).
3. Branch protection on `main`: require the `ci / gate` check, linear history.

The `migrate` job fails closed without its secret and never seeds. The
`deploy` job runs `vercel pull` → `vercel build --prod` → `vercel deploy
--prebuilt --prod` after the migration.

## 6. First-deploy one-offs (from a checkout, prod env exported)

```bash
DIRECT_DATABASE_URL="…unpooled…" pnpm db:migrate          # no-op if step 2 ran
DIRECT_DATABASE_URL="…unpooled…" pnpm db:role-timeout     # statement_timeout on the role
DATABASE_URL="…pooled…" S3_ENDPOINT=… S3_ACCESS_KEY=… S3_SECRET_KEY=… S3_REGION=auto \
  S3_BUCKET=bettersleep-media S3_INVOICE_BUCKET=bettersleep-fiscal pnpm seed:base
DATABASE_URL="…pooled…" IMAGE_PROVIDER=cloudflare MEDIA_PUBLIC_BASE_URL=… pnpm media:blurhash
DATABASE_URL="…pooled…" pnpm user:create -- --email you@<domain> --role admin   # prompts for the password
```

`seed:base` = pillars, legal pages, placeholder settings, nurture sequences,
the 40 articles + 33 products. Safe to re-run; never reverts admin edits.
Do NOT run `pnpm seed:demo` or `pnpm db:seed` against production.

## 7. Admin settings

Log in at `/admin/login`, open `/admin/settings` and replace every
`PLACEHOLDER — …` value: company identification, ANPC SAL/SOL links, invoice
series and first number, IBAN, VAT standard-rate schedule (save it
consciously), shipping prices. Set per-product VAT rates in
`/admin/products/<id>` after confirming with the accountant.
`launch:check` fails while any placeholder stands.

## 8. Preflight

```bash
# production env exported (exported values win over .env):
pnpm launch:check --target=vercel                        # launch run; must exit 0
pnpm launch:check --target=vercel --allow-mock-providers # staging rehearsal on mocks / dry-run
```

It probes R2 through the custom domain, checks that `/cdn-cgi/image` really
returns webp, checks that the media domain does not serve `/invoices/`, and
reads the database settings.

## 9. Deploy and verify

```bash
git push origin main     # Actions: gate → migrate (prints db:status) → deploy (prints the URL)

curl -s https://<site>/api/health           # {"status":"ok","site":"sleep","commit":"<sha>",…}
curl -s https://<site>/api/health/ready     # {"status":"ok","checks":{"db":"ok","storage":"ok"},…}
curl -I https://media.<domain>/pending/x.png   # must NOT be 200

for r in chat-prune shipment-sync nurture-send efactura-submit; do
  curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<site>/api/cron/$r"; echo
done                                        # 200 JSON each; 401 without the bearer
```

Then the `DEPLOYMENT.md` §11 walk: upload an image in `/admin/media`
(thumbnail proves R2 + transforms), complete the quiz, a test purchase, a chat
message streaming token by token, `curl -sI` for the security headers.

## 10. Ongoing

- Uptime monitor on `/api/health/ready`; a Vercel log drain or `ERROR_REPORT_URL`.
- Nightly backups via `.github/workflows/backup.yml` (needs its own secrets);
  one verified restore per `docs/RESTORE.md`.
- Later deploys: push to `main`. Nothing from §6 is needed again.

## Known stale spots in `README.md` "Running on Vercel"

The README's condensed section predates FIX-16/18. Trust this file and
`DEPLOYMENT.md` §12 where they differ:

- Build Command is `pnpm db:status && pnpm build`, not `pnpm build`.
- The GitHub secret is `DIRECT_DATABASE_URL_SLEEP` (plus `VERCEL_TOKEN`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_SLEEP`); there is no `migrate.yml`, the
  jobs live in `ci.yml`.
- Use `pnpm seed:base` on production, not `pnpm db:seed` (which adds demo rows).
- `user:create --password '…'` is refused on a terminal; it prompts, or use
  `--password-stdin`.
- `S3_INVOICE_BUCKET`, `RESEND_WEBHOOK_SECRET`, `DB_POOL_CONNECTION_TIMEOUT_MS`
  and `ENABLE_EXPERIMENTAL_COREPACK` are missing from its env table.
