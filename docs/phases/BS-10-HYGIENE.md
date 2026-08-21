# BS-10 — Hygiene batch

## Context

The remaining accepted review findings (`docs/REVIEW-2026-08-21.md`): M-9…M-15 and the L
list. Mostly one-file changes; read each finding before touching its file. Where a finding
offers options, prefer the smallest fix that adds a pinning test.

## Deliverables (grouped)

1. **Content pipeline**: M-9 (sweep deletes only generated ranges/manifest; tmp+rename
   writes; ownership documented in content/README.md), L-12 (optional heuristic only if
   cheap).
2. **GDPR/CRM**: M-10 (`pnpm subscriber:export -- --email …` printing JSON over the same
   tables `erase.ts` touches), M-11 (consent copy version/hash recorded per grant).
3. **Docs**: M-12 (DEPLOYMENT.md rewritten single-site; multi-site demoted to appendix),
   L-14's PROMPT.md money-path correction.
4. **Landing/UI**: M-14 (literal-union-typed copy map), M-15 (pin the full `home_*`
   namespace + one distinctive render assertion per block), L-10 (the full polish list:
   eyebrow numbering, 100svh, print media scope, hydration reveal skip, pattern titles
   via Paraglide with CSS uppercase, each-key by index, dead token, BezelCard + ease
   token extraction, font preload + size-adjust fallback, record the block-3 image cut
   in STATE.md).
5. **Quiz/blog/shop small fixes**: L-2 (honeypot: only filled ⇒ bot; success copy only
   from server `form?.sent`), L-4 (results render for unpublished quizzes; only taking
   is gated), L-5 (form state/token created once), L-6 (shipping row on success page +
   order email), L-7 (zero-priced not purchasable), L-8 (blog page>max → 404/redirect),
   L-9 (Sursă-preț unlinked or nofollow), L-13 (curation order preserved; single source
   for archetype copy + drift spec; result page links winner to /tipuri).
6. **Platform**: L-1 (fix formcomp state-capture warnings in src, rebuild), L-3
   (document dry-run→live email_log transition or supersede rows), L-15 (CI workflow
   running the root gate; neon suite surfaced loudly when skipped), L-16 (the named test
   gaps not already covered by BS-7..9: blog pagination against the real corpus, tied
   answer set e2e).

## Definition of Done

- Every item either fixed with its pinning test, or explicitly recorded in STATE.md as
  deferred with a reason (do not silently skip).
- Root gate + e2e green; formcomp suites green; `docs/STATE.md` BS-10 section closes the
  review loop with a finding-by-finding disposition table.
