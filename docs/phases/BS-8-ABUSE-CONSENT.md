# BS-8 — Abuse economics & consent integrity

## Context

Review findings H-2, H-3, H-4, H-6, M-1, M-2 (`docs/REVIEW-2026-08-21.md` — read them in
full; each carries verified traces). The theme: the public endpoints' throttles and the
double-opt-in guarantee do not hold under adversarial use.

## Deliverables

1. **H-2 — unsubscribe must stick.** Confirmation becomes per-grant: clear `confirmedAt`
   on unsubscribe, or treat `consents.newsletter.at > confirmedAt` as not-mailable until
   a fresh confirm. The `already-confirmed` fast path applies only while the original
   grant was never revoked. Test: unsubscribe → re-capture by a third party → no send
   without re-confirmation.
2. **H-3 — global budget isolation.** `consumePublicEmailBudget`: per-IP check first,
   sequential; global slot consumed only when the IP check passed. Test: an over-cap IP
   cannot drain the global bucket.
3. **H-4 — proxy-aware client addresses.** Configure/document the trusted address header
   per deploy target (adapter-node `ADDRESS_HEADER`/`XFF_DEPTH`; Vercel default) in code
   where possible and DEPLOYMENT.md regardless; state plainly that without it the per-IP
   throttle is not load-bearing.
4. **H-6 — quiz submit throttle + hygiene.** Consume a `quiz-submit` scope (per-IP +
   global) through the existing rate-limit core before `submitQuiz`; shrink the body cap
   to a size a 12-answer payload needs (~16 KB is generous); add `quiz_results` (older
   unclaimed rows) to the retention sweep.
5. **M-1 — result `?/email` action guards.** Enforce the load's slug/published/pillar
   checks in the action; uniform `{ sent: true }` shape for not-found; first
   `subscriberId` wins unless re-claimed by the same subscriber; pass the claimed
   subscriber into `enrollFromQuizResult`; store the originating result id on the
   enrollment and use it for `{{resultUrl}}`. Tests for cross-slug and cross-result claims.
6. **M-2 — hostile submission validation.** `sanitizeSubmittedAnswers` enforces per-type
   value shape, declared option values only, deduped multi-select values and questionIds,
   and required-question presence. Hostile-payload tests (the review lists the exact
   payload shapes).

## Definition of Done

- Every listed test exists and fails against pre-phase behavior; root gate + e2e green.
- The capture/newsletter/quiz-submit flows still pass their existing happy-path e2e.
- `docs/STATE.md` BS-8 section.
