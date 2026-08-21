import { createHash } from 'node:crypto';
import { and, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import type { FormConfig, Question } from 'formcomp';
import type { Db } from '../../db/client.ts';
import { pillars } from '../../db/schema/core.ts';
import { ensureUniqueSlug } from '../../db/unique-slug.ts';
import { isRecord } from '../../util/object.ts';
import type { Result } from '../../util/result.ts';
import { slugify } from '../../util/slug.ts';
import { subscribers } from '../crm/schema.ts';
import {
	quizResults,
	quizzes,
	type QuizResultRow,
	type QuizRow,
	type QuizStatus,
	type StoredAnswer
} from './schema.ts';
import {
	answersFromSubmitAnswers,
	scoreQuiz,
	validateScoringConfig,
	type ScoringConfig
} from './scoring.ts';
import { validateFormSchema, validateForPublish } from './validate.ts';

/** Quiz services. Framework-free ({ db } passed in), like blog. */

export interface QuizDeps {
	db: Db;
}

export type QuizError =
	| 'not-found'
	| 'invalid-title'
	| 'invalid-slug'
	| 'unknown-pillar'
	| 'invalid-form-schema'
	| 'invalid-scoring'
	| 'not-publishable';

export type QuizOpResult<T> = Result<T, QuizError>;

const QUIZ_SLUGS = { table: quizzes, id: quizzes.id, slug: quizzes.slug };

function uniqueQuizSlug(db: Db, base: string, excludeId?: string): Promise<string> {
	return ensureUniqueSlug(db, QUIZ_SLUGS, base, 'chestionar', excludeId);
}

export async function createQuiz(
	deps: QuizDeps,
	input: { title: string; createdBy: string }
): Promise<QuizOpResult<QuizRow>> {
	const title = input.title.trim();
	if (!title) return { ok: false, error: 'invalid-title' };
	const slug = await uniqueQuizSlug(deps.db, title);
	const [row] = await deps.db
		.insert(quizzes)
		.values({ id: crypto.randomUUID(), slug, title, createdBy: input.createdBy })
		.returning();
	return { ok: true, value: row };
}

export interface QuizPatch {
	title?: string;
	slug?: string;
	introMd?: string;
	/** Slug of the pillar this quiz belongs to, or null to untag. */
	pillarSlug?: string | null;
	formSchema?: FormConfig;
	scoring?: ScoringConfig;
	resultTemplateKey?: string;
}

export async function updateQuiz(
	deps: QuizDeps,
	id: string,
	patch: QuizPatch
): Promise<QuizOpResult<QuizRow>> {
	const [existing] = await deps.db.select().from(quizzes).where(eq(quizzes.id, id));
	if (!existing) return { ok: false, error: 'not-found' };

	const set: Partial<typeof quizzes.$inferInsert> = { updatedAt: new Date() };
	if (patch.title !== undefined) {
		const title = patch.title.trim();
		if (!title) return { ok: false, error: 'invalid-title' };
		set.title = title;
	}
	if (patch.slug !== undefined) {
		const normalized = slugify(patch.slug);
		if (!normalized) return { ok: false, error: 'invalid-slug' };
		set.slug = await uniqueQuizSlug(deps.db, normalized, id);
	}
	if (patch.introMd !== undefined) set.introMd = patch.introMd;
	if (patch.resultTemplateKey !== undefined) set.resultTemplateKey = patch.resultTemplateKey;

	if (patch.formSchema !== undefined) {
		const errors = validateFormSchema(patch.formSchema);
		if (errors.length) {
			return { ok: false, error: 'invalid-form-schema', detail: errors.join(' ') };
		}
		set.formSchema = patch.formSchema;
	}
	if (patch.scoring !== undefined) {
		const form = patch.formSchema ?? existing.formSchema;
		const errors = validateScoringConfig(form, patch.scoring);
		if (errors.length) return { ok: false, error: 'invalid-scoring', detail: errors.join(' ') };
		set.scoring = patch.scoring;
	}

	if (patch.pillarSlug !== undefined) {
		if (patch.pillarSlug === null) {
			set.pillarId = null;
		} else {
			const [pillar] = await deps.db
				.select()
				.from(pillars)
				.where(eq(pillars.slug, patch.pillarSlug));
			if (!pillar) return { ok: false, error: 'unknown-pillar', detail: patch.pillarSlug };
			set.pillarId = pillar.id;
		}
	}

	const [row] = await deps.db.update(quizzes).set(set).where(eq(quizzes.id, id)).returning();
	return { ok: true, value: row };
}

/** Publishing requires a renderable form, ≥1 question and a valid scoring config. */
export async function publishQuiz(deps: QuizDeps, id: string): Promise<QuizOpResult<QuizRow>> {
	const [existing] = await deps.db.select().from(quizzes).where(eq(quizzes.id, id));
	if (!existing) return { ok: false, error: 'not-found' };
	const errors = validateForPublish(existing.formSchema, existing.scoring);
	if (errors.length) return { ok: false, error: 'not-publishable', detail: errors.join(' ') };
	const [row] = await deps.db
		.update(quizzes)
		.set({ status: 'published', updatedAt: new Date() })
		.where(eq(quizzes.id, id))
		.returning();
	return { ok: true, value: row };
}

export async function unpublishQuiz(deps: QuizDeps, id: string): Promise<QuizOpResult<QuizRow>> {
	const [row] = await deps.db
		.update(quizzes)
		.set({ status: 'draft', updatedAt: new Date() })
		.where(eq(quizzes.id, id))
		.returning();
	return row ? { ok: true, value: row } : { ok: false, error: 'not-found' };
}

export interface QuizWithPillar {
	quiz: QuizRow;
	pillarSlug: string | null;
}

async function withPillar(deps: QuizDeps, quiz: QuizRow): Promise<QuizWithPillar> {
	if (quiz.pillarId === null) return { quiz, pillarSlug: null };
	const [pillar] = await deps.db.select().from(pillars).where(eq(pillars.id, quiz.pillarId));
	return { quiz, pillarSlug: pillar?.slug ?? null };
}

export async function getQuiz(deps: QuizDeps, id: string): Promise<QuizWithPillar | null> {
	const [quiz] = await deps.db.select().from(quizzes).where(eq(quizzes.id, id));
	return quiz ? withPillar(deps, quiz) : null;
}

/** Fetch by slug. Public callers get published quizzes only (the default). */
export async function getQuizBySlug(
	deps: QuizDeps,
	slug: string,
	opts: { includeDrafts?: boolean } = {}
): Promise<QuizWithPillar | null> {
	const [quiz] = await deps.db.select().from(quizzes).where(eq(quizzes.slug, slug));
	if (!quiz) return null;
	if (quiz.status !== 'published' && !opts.includeDrafts) return null;
	return withPillar(deps, quiz);
}

export interface QuizListItem {
	quiz: QuizRow;
	pillarSlug: string | null;
	resultsCount: number;
}

/** Admin listing: newest-updated first, with per-quiz result counts. */
export async function listQuizzes(
	deps: QuizDeps,
	opts: { status?: QuizStatus; search?: string } = {}
): Promise<QuizListItem[]> {
	const conditions = [];
	if (opts.status) conditions.push(eq(quizzes.status, opts.status));
	if (opts.search?.trim()) {
		const term = `%${opts.search.trim()}%`;
		conditions.push(or(ilike(quizzes.title, term), ilike(quizzes.slug, term)));
	}
	const rows = await deps.db
		.select({
			quiz: quizzes,
			pillarSlug: pillars.slug,
			resultsCount: sql<number>`(select count(*)::int from ${quizResults} where ${quizResults.quizId} = ${quizzes.id})`
		})
		.from(quizzes)
		.leftJoin(pillars, eq(quizzes.pillarId, pillars.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(quizzes.updatedAt), desc(quizzes.id));
	return rows;
}

/** Free-text answers are bounded so a hostile payload can't balloon the row. */
const MAX_TEXT_ANSWER_CHARS = 2000;

/**
 * Per-type value validation against the question declaration. Returns the
 * (possibly normalized) value, or `undefined` when the shape is hostile or
 * meaningless — the answer is then dropped, exactly like an unknown id.
 */
function sanitizeAnswerValue(question: Question, value: unknown): unknown {
	const optionValues = new Set((question.options ?? []).map((o) => o.value));
	switch (question.type) {
		case 'single-select':
		case 'select':
		case 'likert':
			// A single string among the declared options — an ARRAY here would be
			// scored like a multi-select with duplicates summed (review M-2).
			return typeof value === 'string' && optionValues.has(value) ? value : undefined;
		case 'multi-select': {
			if (!Array.isArray(value)) return undefined;
			const deduped = [
				...new Set(value.filter((v): v is string => typeof v === 'string' && optionValues.has(v)))
			];
			return deduped.length > 0 ? deduped : undefined;
		}
		case 'number-input':
		case 'scale': {
			if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
			if (question.min !== undefined && value < question.min) return undefined;
			if (question.max !== undefined && value > question.max) return undefined;
			return value;
		}
		case 'range': {
			if (!isRecord(value)) return undefined;
			const { from, to } = value;
			if (typeof from !== 'number' || !Number.isFinite(from)) return undefined;
			if (typeof to !== 'number' || !Number.isFinite(to)) return undefined;
			if (from > to) return undefined;
			if (question.min !== undefined && from < question.min) return undefined;
			if (question.max !== undefined && to > question.max) return undefined;
			// Rebuilt object: extra keys in the payload never reach the DB.
			return { from, to };
		}
		case 'consent':
			// An unticked box reads as unanswered, mirroring formcomp.
			return value === true ? true : undefined;
		default: {
			// text-input, textarea, time-input, date-input: a bounded string.
			if (typeof value !== 'string') return undefined;
			const trimmed = value.trim();
			return trimmed ? trimmed.slice(0, MAX_TEXT_ANSWER_CHARS) : undefined;
		}
	}
}

/** Mirror of formcomp's `formatAnswer` for the sanitized value (labels are literal ro). */
function displayValueFor(question: Question, value: unknown): string {
	const optionLabel = (v: unknown) =>
		question.options?.find((o) => o.value === v)?.label ?? String(v);
	const unit = question.unit ? ` ${question.unit}` : '';
	switch (question.type) {
		case 'single-select':
		case 'select':
		case 'likert':
			return optionLabel(value);
		case 'multi-select':
			return (value as string[]).map(optionLabel).join(', ');
		case 'range': {
			const range = value as { from: number; to: number };
			return `${range.from} – ${range.to}${unit}`;
		}
		case 'number-input':
		case 'scale':
			return `${value}${unit}`;
		case 'consent':
			return 'Da';
		default:
			return String(value);
	}
}

export interface SanitizedSubmission {
	answers: StoredAnswer[];
	/** Ids of required, unconditionally-visible questions left unanswered. */
	missingRequired: string[];
}

/**
 * Sanitize the submit endpoint's untrusted `answers` JSON against the form
 * schema (review M-2). Pure. Everything stored derives from the SCHEMA, not
 * the payload: unknown questionIds are dropped, duplicate questionIds keep
 * only their first occurrence, values are validated per question type
 * (declared option values only, deduped multi-selects, finite in-range
 * numbers, bounded strings), and uuid/stepId/type/label/displayValue are
 * rebuilt from the question declaration. Answers come out in schema order.
 *
 * `missingRequired` lists required questions with no valid answer, so the
 * endpoint can refuse a submission that skipped them (`answers: []` used to
 * bypass `required` and still store a winner). Questions gated by a
 * `condition` — their own, their group's or their step's — are exempt: they
 * can be legitimately hidden, and evaluating formcomp's visibility fixpoint
 * server-side is not worth the coupling.
 */
export function sanitizeSubmittedAnswers(raw: unknown, form: FormConfig): SanitizedSubmission {
	const submitted = new Map<string, unknown>();
	if (Array.isArray(raw)) {
		for (const item of raw) {
			if (!isRecord(item)) continue;
			const questionId = String(item.questionId ?? '');
			if (!submitted.has(questionId)) submitted.set(questionId, item.value);
		}
	}
	const answers: StoredAnswer[] = [];
	const missingRequired: string[] = [];
	for (const step of form.steps) {
		for (const group of step.groups) {
			for (const question of group.questions) {
				const value = submitted.has(question.id)
					? sanitizeAnswerValue(question, submitted.get(question.id))
					: undefined;
				if (value === undefined) {
					const conditional = Boolean(question.condition ?? group.condition ?? step.condition);
					if (question.required && !conditional) missingRequired.push(question.id);
					continue;
				}
				answers.push({
					uuid: question.uuid ?? question.id,
					questionId: question.id,
					stepId: step.id,
					type: question.type,
					label: question.label,
					value,
					displayValue: displayValueFor(question, value)
				});
			}
		}
	}
	return { answers, missingRequired };
}

/**
 * Idempotency key stored in `quiz_results.client_token`: the visitor's
 * per-attempt token scoped by a digest of the sanitized answers. A retried
 * POST (refresh, network replay, double-submit) carries the same token and
 * answers → same key → the original row is returned; going back and
 * resubmitting EDITED answers changes the digest → a fresh result.
 */
export function submissionKey(clientToken: string, answers: StoredAnswer[]): string {
	const digest = createHash('sha256').update(JSON.stringify(answers)).digest('hex');
	return `${clientToken}.${digest}`;
}

/** Score and store one submission. The caller decides whether drafts may submit. */
export async function submitQuiz(
	deps: QuizDeps,
	input: { quizId: string; answers: StoredAnswer[]; clientToken?: string }
): Promise<QuizOpResult<QuizResultRow>> {
	const [quiz] = await deps.db.select().from(quizzes).where(eq(quizzes.id, input.quizId));
	if (!quiz) return { ok: false, error: 'not-found' };
	if (quiz.scoring.bands.length === 0) {
		return { ok: false, error: 'invalid-scoring', detail: 'no bands' };
	}
	const profile = scoreQuiz(quiz.formSchema, quiz.scoring, answersFromSubmitAnswers(input.answers));
	const clientToken = input.clientToken ? submissionKey(input.clientToken, input.answers) : null;
	const [row] = await deps.db
		.insert(quizResults)
		.values({
			id: crypto.randomUUID(),
			quizId: quiz.id,
			answers: input.answers,
			score: Math.round(profile.score),
			profile,
			clientToken
		})
		.onConflictDoNothing({ target: [quizResults.quizId, quizResults.clientToken] })
		.returning();
	if (row) return { ok: true, value: row };
	// Conflict: this exact attempt was already stored — return the original row.
	const [existing] = await deps.db
		.select()
		.from(quizResults)
		.where(and(eq(quizResults.quizId, quiz.id), eq(quizResults.clientToken, clientToken!)));
	// No row despite the conflict only if the quiz (and its results) were
	// deleted between the two statements.
	return existing
		? { ok: true, value: existing }
		: { ok: false, error: 'not-found', detail: 'result gone after conflict' };
}

export interface ResultWithQuiz {
	result: QuizResultRow;
	quiz: QuizRow;
}

export async function getResultWithQuiz(
	deps: QuizDeps,
	resultId: string
): Promise<ResultWithQuiz | null> {
	const [row] = await deps.db
		.select({ result: quizResults, quiz: quizzes })
		.from(quizResults)
		.innerJoin(quizzes, eq(quizResults.quizId, quizzes.id))
		.where(eq(quizResults.id, resultId));
	return row ?? null;
}

/** Latest results with the (optional) claiming subscriber's email — admin view. */
export async function latestResultsWithEmail(
	deps: QuizDeps,
	quizId: string,
	limit = 20
): Promise<Array<{ result: QuizResultRow; email: string | null }>> {
	return deps.db
		.select({ result: quizResults, email: subscribers.email })
		.from(quizResults)
		.leftJoin(subscribers, eq(quizResults.subscriberId, subscribers.id))
		.where(eq(quizResults.quizId, quizId))
		.orderBy(desc(quizResults.createdAt), desc(quizResults.id))
		.limit(limit);
}

/**
 * Unclaimed results (no subscriber ever attached) expire after this. Claimed
 * results are the subscriber's — they live until the subscriber is erased.
 * The window is long because result URLs are shared/bookmarked without an
 * email; it exists at all because the public submit endpoint lets anyone
 * insert rows (review H-6) and nothing else ever deletes them.
 */
export const QUIZ_RESULTS_RETENTION_DAYS = 180;

/** Retention sweep hook: delete unclaimed results past the cutoff. */
export async function pruneUnclaimedQuizResults(db: Db, cutoff: Date): Promise<number> {
	const deleted = await db
		.delete(quizResults)
		.where(and(isNull(quizResults.subscriberId), lt(quizResults.createdAt, cutoff)))
		.returning({ id: quizResults.id });
	return deleted.length;
}

/** Latest results for the admin quiz page. */
export async function latestResults(
	deps: QuizDeps,
	quizId: string,
	limit = 20
): Promise<QuizResultRow[]> {
	return deps.db
		.select()
		.from(quizResults)
		.where(eq(quizResults.quizId, quizId))
		.orderBy(desc(quizResults.createdAt), desc(quizResults.id))
		.limit(limit);
}
