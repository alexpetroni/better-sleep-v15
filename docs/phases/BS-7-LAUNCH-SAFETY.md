# BS-7 — Launch safety: no mock ever faces a customer

## Context

The adversarial review (`docs/REVIEW-2026-08-21.md` — read findings C-1, H-5, H-7, H-8,
H-9, H-10 in full before starting; they contain verified file:line traces) found that the
mock-by-default provider pattern becomes a silent production hazard: `launch:check` passes
while checkout redirects customers to a dead stripe.com URL, chat serves canned answers,
couriers issue fake AWBs, and three fictional demo products sit purchasable in the catalogue.

## Deliverables

1. **C-1 — keyless checkout guard.** (a) `launchCheckProblems`: in a live env
   (`EMAIL_DRYRUN === 'false'`), a missing `STRIPE_SECRET_KEY` or one not matching
   `sk_live_` is a problem; add `STRIPE_SECRET_KEY` to `env-matrix.ts`. (b) Runtime:
   when the gateway is the mock outside dev/test, the cart checkout action must
   `fail(400)` with Romanian copy ("magazinul nu acceptă încă plăți online") instead of
   redirecting; hide/disable the checkout button in the same condition.
2. **H-7 — launch-check covers all providers.** Same live-env branch flags
   `CHAT_PROVIDER !== 'anthropic'` and `COURIER_PROVIDER !== 'sameday'`; block the AWB
   action at runtime when the courier is the mock outside dev.
3. **H-8 — mock Stripe ids must never persist.** Skip persisting ids when the gateway is
   the mock, AND make `syncProductToStripe` treat `resource_missing` on update as
   "create fresh". Cover both with unit tests.
4. **H-9 — demo content out of production.** Seed demo products/articles/quizzes only in
   dev/e2e (env-gated) or as `draft`/inactive; drop `status` from every seed
   conflict-update set so operator state survives re-seeds; launch-check asserts no
   `seed-*` ids are active/published. Fix L-11's timestamp tie while in the file.
5. **H-5 — security headers.** A `handleHeaders` in the `hooks.server.ts` sequence:
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
   `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`, HSTS when `PUBLIC_SITE_URL`
   is https, and a report-only `default-src 'self'` CSP. Test asserting the headers on a
   public and an admin response.
6. **H-10 — VAT flag (decision stays human).** Do NOT silently change the rate. Add a
   hint on the `invoice.vatRateBp` setting (RO food supplements are commonly at the
   reduced rate — confirm with the accountant), a LAUNCH-CHECKLIST line, and per-product
   `vatRateBp` support only if it falls out naturally; otherwise document the limitation.

## Definition of Done

- New tests for each of 1–5 that fail against the pre-phase behavior (state this in each
  test header); root gate + e2e green.
- `launch:check --dev` output demonstrates the new rules (shown in the commit message).
- Fresh-DB seed: `/magazin` shows only the 33 real SKUs.
- `docs/STATE.md` BS-7 section; LAUNCH-CHECKLIST updated (VAT + provider lines).
