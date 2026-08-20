import { error, fail } from '@sveltejs/kit';
import { HONEYPOT_FIELD } from 'formcomp';
import { getDb } from '$lib/db';
import { enrollFromQuizResult } from '$lib/modules/nurture/server';
import { claimQuizResult, getQuizFunnelDeps, getResultWithQuiz } from '$lib/modules/quiz/server';
import { consumePublicEmailBudget } from '$lib/server/rate-limit';
import { getSite } from '$lib/server/site';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const found = await getResultWithQuiz({ db: getDb() }, params.resultId);
	if (!found || found.quiz.slug !== params.slug || found.quiz.status !== 'published') error(404);
	return {
		quizTitle: found.quiz.title,
		quizSlug: found.quiz.slug,
		profile: found.result.profile,
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
		// Honeypot first: the capture form always posts the (empty) field, so a
		// missing or non-empty value means a bot. Mimic the normal success shape
		// without doing anything — the same silent drop formcomp performs
		// client-side, so the bot can't tell it was refused.
		if (form.get(HONEYPOT_FIELD) !== '') return { sent: true };
		// GDPR: the capture is a newsletter signup ("îți trimitem protocolul") —
		// no ticked consent box, no capture.
		if (form.get('newsletter_consent') !== 'yes') return fail(400, { error: 'consent' as const });
		// This action emails a visitor-supplied address: throttle per IP and
		// globally before doing anything (a CAPTCHA check would slot in here —
		// see $lib/server/rate-limit/public-email.ts).
		const budget = await consumePublicEmailBudget(getDb(), 'quiz-email', getClientAddress());
		if (budget.limited) return fail(429, { error: 'rate-limited' as const });
		const outcome = await claimQuizResult(getQuizFunnelDeps(), {
			resultId: params.resultId,
			email: String(form.get('email') ?? ''),
			locale: getSite().locales[0],
			// The consent gate above passed, so this signup requests newsletter
			// (double opt-in). The form offers no other consent — never grant one.
			newsletter: true,
			profileEmails: false
		});
		if (!outcome.ok) {
			if (outcome.error === 'not-found') error(404);
			return fail(400, { error: 'invalid-email' as const });
		}
		// Quiz-completed nurture trigger (band-filtered). The consent gate
		// inside refuses unconfirmed subscribers — those enroll when the
		// double-opt-in confirm link is clicked. Idempotent.
		await enrollFromQuizResult({ db: getDb() }, params.resultId);
		return { sent: true };
	}
};
