# BS-4 — 40 articles + archetype pages

## Context

`.initialData/articles/` holds 40 finished Romanian articles (markdown, ~850 words each,
filenames `01-…` to `40-…`), matching `.initialData/topics.json` 1:1 by number/slug.

Two traps — they are silent failure modes, so read carefully:
- The `.md` files have **no frontmatter**. Line 1 is the `# H1` (the Romanian title).
- `topics.json` `title` and `excerpt` are **ENGLISH**. Only `slug` (and `theme`) are usable.
  Using them as content would ship English text on a Romanian site.

The import mechanism already exists end-to-end: JSON bundles in `content/sleep/` are imported
by `pnpm db:seed` / `pnpm content:init` (contract: `apps/web/src/lib/modules/content/bundle.ts`,
example: `content/examples/article.json`, docs: `content/README.md`). Idempotent, upsert by slug.

## Deliverables

1. **Conversion script** — `apps/web/scripts/articles-from-initialdata.ts` (committed, rerunnable):
   reads `.initialData/articles/*.md` + `.initialData/topics.json`, writes 40 bundles to
   `content/sleep/0010-<slug>.json` … `0400-<slug>.json` (v2 article bundles):
   - `slug` ← topics.json; `title` ← the file's H1; `bodyMd` ← file minus the H1 line
   - `excerpt` ← REQUIRED, non-empty (see 2); `seoTitle`/`seoDescription` ← see 2
   - `pillars: ["somn"]`, `status: "published"`, `publishedAt` staggered (e.g. one every 2 days
     backwards from a fixed date — deterministic, not `new Date()` per run), `coverMediaId: null`,
     `media: []`
   - The script FAILS loudly if any article lacks an excerpt/seo entry or any topic lacks a file.
2. **Editorial pass** — write fresh ROMANIAN `excerpt` (1–2 sentences, deck tone),
   `seoTitle` (≤60 chars) and `seoDescription` (≤160 chars) for EVERY article. Store them in a
   committed data file the script consumes (e.g. `apps/web/scripts/article-meta.ro.json`),
   keyed by slug — so regeneration is deterministic. Base each on the article's actual content,
   not on the English topics.json text.
3. **Archetype→article mapping** — does not exist anywhere; author it. A typed constant in the
   quiz module (e.g. `modules/quiz/archetype-articles.ts`): archetype id → article slugs
   (an article may map to several archetypes; every archetype gets ≥3 where content allows).
   Base assignments on reading the articles' subject matter. Export through the module barrel.
4. **Archetype pages** — new route `(public)/tipuri/[archetype]`: the archetype's name, essence
   and adapted long-form copy (source: `.initialData/archetype-copy/`), its mapped article list
   (reusing the blog listing components/services), and a CTA into the quiz. Prerender-friendly
   loads via module services; 404 for unknown ids; add the pages to the sitemap.

## Definition of Done

- Fresh DB: `pnpm db:seed` imports all 40 (exit 0); re-run imports nothing new.
- `/blog` lists 40 published articles; three spot-checked bodies render with intact Romanian
  diacritics and markdown structure.
- No English text from topics.json appears anywhere in the DB (test: import, then assert no
  article title/excerpt equals the topics.json English title/excerpt).
- Every archetype page resolves and lists ≥1 article; unknown slug 404s; sitemap includes them.
- Root gate + e2e green; `docs/STATE.md` updated (BS-4 section).
