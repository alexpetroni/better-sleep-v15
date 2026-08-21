# BS-9 — Correctness & data integrity

## Context

Review findings H-1 and M-3…M-8 (`docs/REVIEW-2026-08-21.md` — read each in full). The
headline is H-1: Postgres `jsonb` re-orders object keys, so the archetype tie-break in
production contradicts the documented declaration-order contract — verified against the
live dev DB. The unit tests pass only because they never round-trip through jsonb.

## Deliverables

1. **H-1 — explicit ordering.** Make dimension/tie-break order explicit and
   jsonb-proof: an ordered array (`dimensions: [{ key, label }]`) or an explicit
   `order: string[]` in `ScoringConfig`, with backward-compatible reading of the stored
   object shape. Update seeds, validate.ts, comments, and STATE.md. Add a
   THROUGH-THE-DB test (store, reload, score) asserting tie-break and dimension order —
   this is the test class whose absence hid the bug. Existing `quiz_results` profiles
   are snapshots; no data migration.
2. **M-3 — stock clamp.** `loadCartDetails` + product `add` action mark/clamp lines
   where `qty > product.stock`, with a message; webhook clamp stays as race backstop.
   Test qty-over-stock pre-payment.
3. **M-4 — async payments cannot strand orders.** Pin `payment_method_types: ['card']`
   in session creation AND handle `checkout.session.async_payment_succeeded` (→ paid +
   invoice) / `async_payment_failed` (→ failed + restock) through the existing ledger.
   Webhook fixtures for both.
4. **M-5 — night map checked against DB.** Landing load filters `NIGHT_MAP_SKUS` to
   `status='active'` products by one query; segments degrade gracefully; assert the 11
   SKUs active in `sleep-content.spec.ts`.
5. **M-6 — product SEO layer.** Product JSON-LD (`Product`/`Offer`: name, price via
   `centsToDecimal`, `priceCurrency: 'RON'`, availability); per-product meta description
   derived from `descriptionMd` (excluding the Sursă-preț line); static branded fallback
   og:image wired through `Seo.svelte`; track article covers in STATE.md launch items.
6. **M-7 — stable import key.** Carry `topics.json` `id` (articles) / a stable key
   (products) into bundles as an import key and upsert on it, with slug-only fallback
   for legacy rows; or implement `content:prune`. Test: slug rename on an already-seeded
   DB does not leave two published rows.
7. **M-8 — idempotent `updated_at`.** Skip the update (or the timestamp bump) when
   mapped fields are unchanged; spec asserting `updated_at` stability across re-import.

## Definition of Done

- The through-the-DB scoring test exists and fails against the pre-phase code.
- All listed tests green; root gate + e2e green; `docs/STATE.md` BS-9 section.
