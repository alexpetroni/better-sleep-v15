# BS-5 — The landing page

## Context

Replace the 33-line stub at `apps/web/src/routes/(public)/+page.svelte` with the real landing
page. The spec is `.initialData/somnium-landing-copy-deck.md` — Part 3 defines twelve blocks;
build TEN of them. Blocks #8 (Authority) and #10 (Testimonials) are OMITTED entirely: the deck
itself says an empty authority block is worse than none and testimonials must not be fabricated.
The deck's "Somnium" is a working title — the brand is betterSleep (from site config; never
hardcode it).

Prerequisites in place: quiz `arhetip-somn` (BS-2), archetype pages `/tipuri/[archetype]`
(BS-4), the four-pattern→archetype mapping exported by the quiz module (BS-2).

## Deliverables

1. **Ten blocks, deck order, Romanian copy verbatim from the deck** (brand references →
   betterSleep): 1 Hero · 2 Cost ("Ce ți-a luat noaptea trecută") · 3 Archetype grid
   ("Recunoaște-te", 4 cards → `/tipuri/…`) · 4 Reframe ("De ce nu au funcționat până acum") ·
   5 How it works ("Trei pași") · 6 Night map (23:00→07:00 timeline; product naming lands in
   BS-6 — leave a clean seam, no placeholder text) · 7 Proof ("Ce poți verifica") ·
   9 Objection accordion (4 items, native `<details>` or accessible equivalent) ·
   11 Risk reversal · 12 Final CTA. Hero primary CTA → the quiz; secondary → "Vezi cum
   funcționează" scrolls to block 5.
2. **Structure** — one component per block under `apps/web/src/lib/components/landing/`,
   composed by the route; copy via Paraglide keys in `messages/ro.json` (follow the existing
   key naming conventions). `+page.server.ts` supplies what the blocks need (site config,
   the four patterns with their archetype links).
3. **Design** — apply the repo skill `.claude/skills/soft-skill/SKILL.md`
   (high-end-visual-design) end to end: premium typography, macro-whitespace (`py-24`+),
   double-bezel card architecture, staggered `IntersectionObserver` entry reveals, custom
   cubic-bezier motion, transform/opacity-only animation, `min-h-[100dvh]` not `h-screen`.
   Work WITHIN the existing theme-token system: extend the oklch tokens in
   `config/sites/sleep.ts` (`theme:`) for a nighttime palette and consume them via
   `bg-(--color-…)` arbitrary properties — do NOT introduce a parallel styling mechanism.
   Respect `prefers-reduced-motion`.
4. **SEO** — keep the existing `Seo` component usage; title/description from the deck's
   positioning line, via Paraglide.

## Definition of Done

- E2E: all ten blocks render (stable `data-testid` per block); hero primary CTA reaches the
  quiz; each archetype card reaches its `/tipuri/…` page; the accordion opens; no horizontal
  scroll at 360×740 (assert `document.documentElement.scrollWidth <= innerWidth`).
- No banned pattern from the skill's §2 (fonts, harsh shadows, default transitions) — do a
  self-audit against the skill's checklist and record it in the commit message body.
- Blocks 8 and 10 are absent; nothing renders a placeholder for them.
- Root gate green; `docs/STATE.md` updated (BS-5 section).
