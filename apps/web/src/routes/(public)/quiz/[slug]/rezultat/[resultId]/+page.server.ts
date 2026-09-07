import { error, fail } from '@sveltejs/kit';
import { HONEYPOT_FIELD } from 'formcomp';
import { getDb } from '$lib/db';
import { enrollFromQuizResult } from '$lib/modules/nurture/server';
import { ARCHETYPE_PAGES } from '$lib/modules/quiz';
import {
	claimQuizResult,
	getQuizBySlug,
	getQuizFunnelDeps,
	getResultWithQuiz
} from '$lib/modules/quiz/server';
import { consumePublicEmailBudget } from '$lib/server/rate-limit';
import { getSite } from '$lib/server/site';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Deliberately NO `published` gate here (L-4): result emails and nurture
	// CTAs embed permanent-looking URLs, and the profile is fully snapshotted —
	// unpublishing a quiz gates TAKING it (../+page.server.ts), never results
	// already delivered. The `?/email` action below keeps its stricter gates.
	const found = await getResultWithQuiz({ db: getDb() }, params.resultId);
	// Same gate as the quiz page: published AND tagged to a pillar this site
	// activates (FIX-15) — a result is not a back door to a hidden quiz.
	if (
		!found ||
		found.quiz.slug !== params.slug ||
		found.quiz.status !== 'published' ||
		!found.pillarSlug ||
		!getSite().pillars.includes(found.pillarSlug)
	) {
		error(404);
	}
	// The winner's /tipuri page — the most natural next click (L-13). Null for
	// band-mode results and for winner keys without a page.
	const winnerKey = found.result.profile.winner?.key;
	const winnerPage = winnerKey ? ARCHETYPE_PAGES.find((p) => p.id === winnerKey) : undefined;
	return {
		quizTitle: found.quiz.title,
		quizSlug: found.quiz.slug,
		profile: found.result.profile,
		winnerPageSlug: winnerPage?.slug ?? null,
		// The visitor may already have left an email for this result (reload).
		claimed: found.result.subscriberId !== null
	};
};

export const actions: Actions = {
	// The email step is OPTIONAL — the result above stays visible without it.
	// The client-side formcomp form validates all of this too, but never trust
	// the browser (mirrors the newsletter action): every check runs again here.
	email: async ({ params, request, getClientAddress }) => {
		const form = await request.formData();
		// Honeypot first: only a FILLED field means a bot (L-2) — privacy
		// extensions and form rewriters can strip the off-screen input entirely,
		// and a missing field must not swallow a real human's submission. Bots
		// get the normal success shape without anything happening, so they can't
		// tell they were refused.
		const honeypot = form.get(HONEYPOT_FIELD);
		if (typeof honeypot === 'string' && honeypot.trim() !== '') return { sent: true };
		// GDPR: the capture is a newsletter signup ("îți trimitem protocolul") —
		// no ticked consent box, no capture.
		if (form.get('newsletter_consent') !== 'yes') return fail(400, { error: 'consent' as const });
		// The gates the page load and submit endpoint enforce, re-run here
		// (review M-1): a direct POST can name any resultId under any slug.
		// Every refusal returns the SAME shape as a real send — the action must
		// not be an existence oracle over result ids, and a probing bot learns
		// nothing.
		const db = getDb();
		const quiz = await getQuizBySlug({ db }, params.slug); // published only
		if (!quiz || !quiz.pillarSlug || !getSite().pillars.includes(quiz.pillarSlug)) {
			return { sent: true };
		}
		const found = await getResultWithQuiz({ db }, params.resultId);
		if (!found || found.result.quizId !== quiz.quiz.id) return { sent: true };
		// This action emails a visitor-supplied address: throttle per IP and
		// globally before doing anything (a CAPTCHA check would slot in here —
		// see $lib/server/rate-limit/public-email.ts).
		const budget = await consumePublicEmailBudget(db, 'quiz-email', getClientAddress());
		if (budget.limited) return fail(429, { error: 'rate-limited' as const });
		const outcome = await claimQuizResult(getQuizFunnelDeps(), {
			resultId: params.resultId,
			email: String(form.get('email') ?? ''),
			locale: getSite().locales[0],
			// The consent gate above passed, so this signup requests newsletter
			// (double opt-in). The form offers no other consent — never grant one.
			newsletter: true,
			profileEmails: false,
			// Proof of the grant: who agreed, from which client, to which copy
			// (FIX-13 evidence; the copy ref carries the M-11 hash).
			evidence: {
				ip: getClientAddress(),
				userAgent: request.headers.get('user-agent')?.slice(0, 256) || undefined,
				consentTextVersion: currentConsentTextVersions()
			}
		});
		if (!outcome.ok) {
			if (outcome.error === 'invalid-email') return fail(400, { error: 'invalid-email' as const });
			// not-found / already-claimed: first claim won; silent uniform shape.
			return { sent: true };
		}
		// Quiz-completed nurture trigger (band-filtered), for the subscriber
		// THIS claim attached — a racing claim by someone else enrolls nobody
		// here. The consent gate inside refuses unconfirmed subscribers — those
		// enroll when the double-opt-in confirm link is clicked. Idempotent.
		await enrollFromQuizResult({ db }, params.resultId, outcome.subscriberId);
		return { sent: true };
	}
};
