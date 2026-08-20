# BS-6 — Products: the real Zenyth catalogue + night-map SKUs

## Context

`.initialData/zenyth-products.json` holds 33 real products with real prices (integer lei) from
Zenyth's stres-somn category, captured at planning time. They seed the shop for testing with
real data. Do NOT fetch anything from zenyth.ro — the JSON is the source. Do not copy Zenyth's
full product-page texts or images: name + price + a freshly written Romanian description only.

## Deliverables

1. **Conversion script** — `apps/web/scripts/products-from-initialdata.ts` (committed):
   reads the JSON, writes 33 v2 product bundles to `content/sleep/1010-<slug>.json` …
   (numbered after the article bundles so import order stays articles-then-products):
   - `slug` ← last URL segment; `name` ← as captured
   - `price_cents` ← `priceLei * 100` (bani, integer); `currency: 'RON'`
   - `description_md` ← fresh Romanian 2–4 sentence description written from name+blurb
     (committed data file keyed by slug, same pattern as BS-4's article-meta); include a
     "Sursă preț" line citing the captured URL and date
   - pillar `somn`; `status: 'published'`; `stock`: 25 (arbitrary test stock);
     `stripe_product_id`/`stripe_price_id` null; no images (`coverMediaId: null`, `gallery: []`)
2. **Night-map SKUs** — close the deck's block-6 loop: map products onto the four timeline
   segments (ADORMIREA → e.g. melatonină/glicină; SOMNUL PROFUND → magneziu bisglicinat/
   treonat; FEREASTRA FRAGILĂ → magneziu+B6, taurat; REM → L-teanină/ashwagandha — decide from
   the actual ingredient names, 2–3 SKUs per segment). Store the mapping as data consumed by
   the BS-5 night-map component's seam; each named SKU links to its `/magazin/[slug]` page.
3. **Verification of money math** — a unit test at a boundary case (e.g. cart with the 216 lei
   and two 49 lei items + shipping) through `modules/shop/money.ts` formatting.

## Definition of Done

- Fresh DB seed imports 40 articles + 33 products, exit 0; re-run is a no-op.
- `/magazin` lists 33 products with correctly formatted RON prices; a product page renders its
  Romanian description; add-to-cart → cart total correct.
- The landing night map names real seeded SKUs and links resolve (e2e).
- Root gate green; `docs/STATE.md` updated (BS-6 section: what remains for a real launch —
  Stripe live wiring, product images, supplier confirmation).
