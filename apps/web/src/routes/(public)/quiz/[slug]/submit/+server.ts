import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { getQuizBySlug, sanitizeSubmittedAnswers, submitQuiz } from '$lib/modules/quiz/server';
import { readJsonBounded } from '$lib/server/body';
import { consumeQuizSubmitBudget } from '$lib/server/rate-limit';
import { getSite } from '$lib/server/site';
import type { RequestHandler } from './$types';

// A legitimate 12-answer payload is ~2–3 KB; 16 KB is generous headroom for
// long free-text answers while keeping a hostile POST from storing ~256 KB of
// attacker-chosen jsonb per request (review H-6).
const MAX_BODY_BYTES = 16 * 1024;

// Per-attempt idempotency token sent by the quiz page (a browser uuid). Bound
// in length/alphabet so it can't smuggle arbitrary data into the DB.
const ATTEMPT_TOKEN = /^[A-Za-z0-9-]{8,64}$/;

/** Receives formcomp's submit POST, scores + stores, and redirects to the result page. */
export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
	const db = getDb();
	const found = await getQuizBySlug({ db }, params.slug);
	if (!found || !found.pillarSlug || !getSite().pillars.includes(found.pillarSlug)) error(404);

	// Every POST that gets past here inserts a row — throttle per IP and
	// globally like every other public write (review H-6). The idempotency
	// token is client-supplied, so it is no protection against a loop.
	const budget = await consumeQuizSubmitBudget(db, getClientAddress());
	if (budget.limited) error(429, 'Too many submissions');

	// Byte-bounded read (audit L1): the cap holds even when Content-Length is
	// absent or lies — the stream is abandoned as soon as it crosses the cap.
	const parsed = await readJsonBounded(request, MAX_BODY_BYTES);
	if (!parsed.ok) {
		if (parsed.reason === 'too-large') error(413);
		error(400, 'Invalid JSON');
	}
	const body = parsed.value;

	const rawAnswers = (body as { answers?: unknown } | null)?.answers;
	const { answers, missingRequired } = sanitizeSubmittedAnswers(rawAnswers, found.quiz.formSchema);
	// The client enforces `required` before it ever POSTs; a payload that
	// skipped required questions (e.g. `answers: []`) is hand-crafted, and
	// scoring it would store a meaningless winner (review M-2).
	if (missingRequired.length > 0) error(400, 'Missing required answers');
	// A double-submit/refresh replays the same token + answers → same result
	// row. Clients without the header (or with a malformed one) just get no
	// idempotency, like before.
	const attemptToken = request.headers.get('x-quiz-attempt');
	const clientToken = attemptToken && ATTEMPT_TOKEN.test(attemptToken) ? attemptToken : undefined;
	const submitted = await submitQuiz({ db }, { quizId: found.quiz.id, answers, clientToken });
	if (!submitted.ok) error(500, 'Could not store the submission');

	return json({ redirectUrl: `/quiz/${params.slug}/rezultat/${submitted.value.id}` });
};
