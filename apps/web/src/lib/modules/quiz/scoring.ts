import type { FormConfig, Question } from 'formcomp';
// The pure condition evaluator via its subpath: the package root pulls in
// .svelte components, which the seed/content scripts (plain node) cannot load.
import { evaluateCondition } from 'formcomp/conditions';
import { isRecord } from '../../util/object.ts';

/**
 * Pure scoring engine: (form schema, scoring config, answers) → profile.
 * No db, no framework — fully unit-testable. The scoring config is authored
 * as JSON in the admin editor and validated with `validateScoringConfig`.
 */

export interface ScoringBand {
	key: string;
	/** The band applies from this score upward (inclusive), until the next band's min. */
	min: number;
	label: string;
	advice: string;
}

/** Result-side copy for one archetype, snapshotted into the profile at scoring time. */
export interface ArchetypeDefinition {
	label: string;
	essence: string;
	/** The long-form "what it means" copy shown on the result page (paragraphs split by blank lines). */
	advice: string;
}

/** A ranked archetype in an archetype-mode profile. */
export interface ArchetypeResult extends ArchetypeDefinition {
	key: string;
	score: number;
}

export type QuestionScoring =
	| {
			kind: 'map';
			/** Answer value → points. Multi-select answers sum the points of every selected value. */
			map: Record<string, number>;
			dimension?: string;
	  }
	| {
			kind: 'numeric';
			/** Points = numeric answer (clamped to the question's min/max) × multiplier, then capped. */
			multiplier?: number;
			cap?: number;
			dimension?: string;
	  }
	| {
			kind: 'weights';
			/**
			 * Answer value → points per dimension key: which OPTION you pick
			 * decides which dimension(s) score — the backbone of archetype
			 * quizzes, where every option names a different archetype's lived
			 * experience. Multi-select answers sum every selected value.
			 */
			weights: Record<string, Record<string, number>>;
	  };

/** One declared dimension. Array position IS the order contract (see below). */
export interface DimensionDeclaration {
	key: string;
	label: string;
}

/**
 * The two accepted `dimensions` shapes. The ORDERED ARRAY is canonical:
 * Postgres jsonb preserves array order but re-sorts object keys (length, then
 * bytewise), so the legacy record shape loses its authored order the moment a
 * config round-trips through the `quizzes.scoring` jsonb column (review H-1).
 * Record-shaped configs already in the database still score correctly — but
 * their dimension order (and with it the archetype tie-break) follows jsonb's
 * key sort, which is why `archetype` mode now refuses the record shape at
 * validation time.
 */
export type DimensionsConfig = DimensionDeclaration[] | Record<string, { label: string }>;

/** Normalize either `dimensions` shape into the ordered list the engine uses. */
export function dimensionList(dimensions: DimensionsConfig | undefined): DimensionDeclaration[] {
	if (!dimensions) return [];
	if (Array.isArray(dimensions)) return dimensions;
	return Object.entries(dimensions).map(([key, { label }]) => ({ key, label }));
}

export interface ScoringConfig {
	questions: Record<string, QuestionScoring>;
	/** Ordered dimension declarations. Questions opt in via their `dimension` field. */
	dimensions?: DimensionsConfig;
	/** Sorted ascending by `min`; the total score picks the highest band it reaches. */
	bands: ScoringBand[];
	/**
	 * `archetype`: every dimension is an archetype and the profile gains
	 * `winner`/`runnerUp` (bands still apply — a single catch-all band keeps
	 * band consumers like the result email working). Default: `band`.
	 */
	resultMode?: 'band' | 'archetype';
	/** Archetype key → result copy. In `archetype` mode keys mirror `dimensions` 1:1. */
	archetypes?: Record<string, ArchetypeDefinition>;
}

export interface DimensionScore {
	key: string;
	label: string;
	score: number;
	maxScore: number | null;
}

export interface QuizProfile {
	score: number;
	/** Highest reachable score, or null when a numeric question is unbounded. */
	maxScore: number | null;
	band: ScoringBand;
	dimensions: DimensionScore[];
	/** Set only in `archetype` mode — the band path is unchanged. */
	resultMode?: 'band' | 'archetype';
	winner?: ArchetypeResult;
	runnerUp?: ArchetypeResult;
}

/** Flat answers keyed by question id — what the engine consumes. */
export type QuizAnswers = Record<string, unknown>;

/**
 * Safety bound for a numeric answer whose question declares no `min`/`max`
 * and whose scoring has no `cap` (FIX-15): a crafted `1e12` used to reach
 * the band — and the nurture sequence — through an unbounded multiplier.
 * The reachable maximum of such a question stays `null` (unknown), this
 * only bounds what one answer can contribute.
 */
export const DEFAULT_NUMERIC_BOUND = 1000;

/** Flatten a formcomp submit payload's answers array. */
export function answersFromSubmitAnswers(
	answers: Array<{ questionId: string; value: unknown }>
): QuizAnswers {
	const flat: QuizAnswers = {};
	for (const answer of answers) flat[answer.questionId] = answer.value;
	return flat;
}

export function pickBand(bands: ScoringBand[], score: number): ScoringBand {
	if (bands.length === 0) throw new Error('Scoring config has no bands');
	const sorted = [...bands].sort((a, b) => a.min - b.min);
	let picked = sorted[0];
	for (const band of sorted) if (score >= band.min) picked = band;
	return picked;
}

function questionsById(form: FormConfig): Map<string, Question> {
	const byId = new Map<string, Question>();
	for (const step of form.steps) {
		for (const group of step.groups) {
			for (const question of group.questions) byId.set(question.id, question);
		}
	}
	return byId;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
	if (min !== undefined && value < min) return min;
	if (max !== undefined && value > max) return max;
	return value;
}

/**
 * The questions a visitor could actually see given these answers — step,
 * group and question `condition`s evaluated server-side with formcomp's own
 * evaluator, to a fixpoint like formcomp's `collectResponses` (an answer to
 * a hidden question is discarded, which may hide more). Hidden questions
 * neither score nor count towards the reachable maximum (FIX-15).
 */
export function visibleQuestions(form: FormConfig, answers: QuizAnswers): Map<string, Question> {
	const all = questionsById(form);
	let allowed = new Set(all.keys());
	// Each pass can only change membership; bounded by the question count.
	for (let pass = 0; pass <= all.size; pass++) {
		const get = (_stepId: string, questionId: string) =>
			allowed.has(questionId) ? answers[questionId] : undefined;
		const visible = new Map<string, Question>();
		for (const step of form.steps) {
			if (step.condition && !evaluateCondition(step.condition, get, step.id)) continue;
			for (const group of step.groups) {
				if (group.condition && !evaluateCondition(group.condition, get, step.id)) continue;
				for (const question of group.questions) {
					if (question.condition && !evaluateCondition(question.condition, get, step.id)) {
						continue;
					}
					visible.set(question.id, question);
				}
			}
		}
		if (visible.size === allowed.size && [...visible.keys()].every((id) => allowed.has(id))) {
			return visible;
		}
		allowed = new Set(visible.keys());
	}
	return new Map([...all].filter(([id]) => allowed.has(id)));
}

/**
 * Points for a `map` question, coerced by the question's type (FIX-15):
 * only a multi-select may answer with an array (each value counted once);
 * an array on any other type — or a scalar on a multi-select — is a shape
 * the form never produces and scores 0.
 */
function mapPoints(
	map: Record<string, number>,
	question: Question | undefined,
	answer: unknown
): number {
	if (answer === undefined || answer === null) return 0;
	if (question?.type === 'multi-select') {
		if (!Array.isArray(answer)) return 0;
		return [...new Set(answer.map(String))].reduce((sum, value) => sum + (map[value] ?? 0), 0);
	}
	if (Array.isArray(answer) || isRecord(answer)) return 0;
	return map[String(answer)] ?? 0;
}

function numericPoints(
	spec: Extract<QuestionScoring, { kind: 'numeric' }>,
	question: Question | undefined,
	answer: unknown
): number {
	// Numbers and numeric strings only; objects (range values) and arrays are
	// not a numeric answer.
	const value =
		typeof answer === 'number' ? answer : typeof answer === 'string' ? Number(answer) : NaN;
	if (answer === '' || !Number.isFinite(value)) return 0;
	const bounded = clamp(
		value,
		question?.min ?? -DEFAULT_NUMERIC_BOUND,
		question?.max ?? DEFAULT_NUMERIC_BOUND
	);
	let points = bounded * (spec.multiplier ?? 1);
	if (spec.cap !== undefined) points = Math.min(points, spec.cap);
	return points;
}

/** Per-dimension points of one `weights` question for the given answer. */
function weightPoints(
	weights: Record<string, Record<string, number>>,
	answer: unknown
): Record<string, number> {
	const out: Record<string, number> = {};
	if (answer === undefined || answer === null) return out;
	for (const value of Array.isArray(answer) ? answer : [answer]) {
		const entry = weights[String(value)];
		if (!entry) continue;
		for (const [dim, points] of Object.entries(entry)) out[dim] = (out[dim] ?? 0) + points;
	}
	return out;
}

/** Highest reachable points per dimension of one `weights` question. */
function weightMaxByDimension(
	weights: Record<string, Record<string, number>>,
	question: Question | undefined
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const entry of Object.values(weights)) {
		for (const [dim, points] of Object.entries(entry)) {
			out[dim] =
				question?.type === 'multi-select'
					? (out[dim] ?? 0) + Math.max(0, points)
					: Math.max(out[dim] ?? 0, points);
		}
	}
	return out;
}

/** Highest reachable points for one scored question, or null when unbounded. */
function questionMax(spec: QuestionScoring, question: Question | undefined): number | null {
	if (spec.kind === 'weights') {
		const totals = Object.values(spec.weights).map((entry) =>
			Object.values(entry).reduce((a, b) => a + b, 0)
		);
		if (totals.length === 0) return 0;
		if (question?.type === 'multi-select') {
			return totals.filter((t) => t > 0).reduce((a, b) => a + b, 0);
		}
		return Math.max(0, ...totals);
	}
	if (spec.kind === 'map') {
		const values = Object.values(spec.map);
		if (values.length === 0) return 0;
		if (question?.type === 'multi-select') {
			return values.filter((v) => v > 0).reduce((a, b) => a + b, 0);
		}
		return Math.max(0, ...values);
	}
	const multiplier = spec.multiplier ?? 1;
	const fromQuestion = question?.max !== undefined ? question.max * multiplier : null;
	if (spec.cap !== undefined) {
		return fromQuestion === null ? spec.cap : Math.min(fromQuestion, spec.cap);
	}
	return fromQuestion;
}

export function scoreQuiz(
	form: FormConfig,
	scoring: ScoringConfig,
	answers: QuizAnswers
): QuizProfile {
	const byId = questionsById(form);
	const visible = visibleQuestions(form, answers);

	let score = 0;
	let maxScore: number | null = 0;
	// Declaration order comes from `dimensionList` — for the canonical array
	// shape this survives jsonb storage; the legacy record shape follows the
	// stored key order instead (H-1).
	const declared = dimensionList(scoring.dimensions);
	const perDimension = new Map<string, { score: number; maxScore: number | null }>();
	for (const { key } of declared) {
		perDimension.set(key, { score: 0, maxScore: 0 });
	}

	for (const [questionId, spec] of Object.entries(scoring.questions)) {
		const question = byId.get(questionId);
		// A question the visitor could not see contributes neither points nor
		// reachable maximum (a scored id missing from the form is validated
		// away by validateScoringConfig; tolerated here as visible).
		if (question && !visible.has(questionId)) continue;
		const max = questionMax(spec, question);

		if (spec.kind === 'weights') {
			// Weights spread one question's points across dimensions per option.
			const byDim = weightPoints(spec.weights, answers[questionId]);
			score += Object.values(byDim).reduce((a, b) => a + b, 0);
			maxScore = maxScore === null || max === null ? null : maxScore + max;
			const maxByDim = weightMaxByDimension(spec.weights, question);
			for (const [key, dimension] of perDimension) {
				dimension.score += byDim[key] ?? 0;
				dimension.maxScore =
					dimension.maxScore === null ? null : dimension.maxScore + (maxByDim[key] ?? 0);
			}
			continue;
		}

		const points =
			spec.kind === 'map'
				? mapPoints(spec.map, question, answers[questionId])
				: numericPoints(spec, question, answers[questionId]);

		score += points;
		maxScore = maxScore === null || max === null ? null : maxScore + max;

		const dimension = spec.dimension ? perDimension.get(spec.dimension) : undefined;
		if (dimension) {
			dimension.score += points;
			dimension.maxScore =
				dimension.maxScore === null || max === null ? null : dimension.maxScore + max;
		}
	}

	const dimensions: DimensionScore[] = declared.map(({ key, label }) => ({
		key,
		label,
		score: perDimension.get(key)?.score ?? 0,
		maxScore: perDimension.get(key)?.maxScore ?? 0
	}));

	const profile: QuizProfile = {
		score,
		maxScore,
		band: pickBand(scoring.bands, score),
		dimensions
	};

	if (scoring.resultMode === 'archetype') {
		// Tie-break is deterministic: the higher score wins; on EQUAL scores the
		// dimension declared EARLIER in the `dimensions` ARRAY wins (Array#sort
		// is stable). Since the array shape survives jsonb storage, this order
		// holds in production, not just in memory — validation refuses the
		// legacy record shape in archetype mode for exactly this reason (H-1).
		const ranked = [...dimensions].sort((a, b) => b.score - a.score);
		const toArchetype = (dim: DimensionScore): ArchetypeResult => {
			// Validation guarantees a matching entry; fall back to the dimension
			// label so a stale stored config still renders something sensible.
			const def = scoring.archetypes?.[dim.key];
			return {
				key: dim.key,
				score: dim.score,
				label: def?.label ?? dim.label,
				essence: def?.essence ?? '',
				advice: def?.advice ?? ''
			};
		};
		profile.resultMode = 'archetype';
		if (ranked[0]) profile.winner = toArchetype(ranked[0]);
		if (ranked[1]) profile.runnerUp = toArchetype(ranked[1]);
	}

	return profile;
}

const OPTION_TYPES = new Set(['single-select', 'multi-select', 'select', 'likert']);

/**
 * Validate a scoring config (as parsed, untrusted JSON) against a form
 * schema. Returns human-readable ro errors; an empty list means the value is
 * a usable `ScoringConfig`.
 */
export function validateScoringConfig(form: FormConfig, raw: unknown): string[] {
	const errors: string[] = [];
	if (!isRecord(raw)) return ['Configurația de scor trebuie să fie un obiect JSON.'];

	// bands
	const bands = raw.bands;
	if (!Array.isArray(bands) || bands.length === 0) {
		errors.push('"bands" trebuie să conțină cel puțin o bandă de rezultat.');
	} else {
		const keys = new Set<string>();
		bands.forEach((band, i) => {
			if (
				!isRecord(band) ||
				typeof band.key !== 'string' ||
				typeof band.label !== 'string' ||
				typeof band.advice !== 'string' ||
				typeof band.min !== 'number'
			) {
				errors.push(
					`Banda #${i + 1}: are nevoie de "key", "label", "advice" (text) și "min" (număr).`
				);
				return;
			}
			if (keys.has(band.key)) errors.push(`Banda "${band.key}" apare de două ori.`);
			keys.add(band.key);
		});
		const mins = bands
			.filter((b): b is { min: number } => isRecord(b) && typeof b.min === 'number')
			.map((b) => b.min);
		if (mins.some((min, i) => i > 0 && min <= mins[i - 1])) {
			errors.push('Pragurile "min" ale benzilor trebuie să fie strict crescătoare.');
		}
	}

	// dimensions — canonical shape: ORDERED array [{ key, label }] (the order
	// is the tie-break contract and survives jsonb storage, review H-1). The
	// legacy record shape { key: { label } } is still accepted for stored
	// band-mode configs, but its order is whatever jsonb sorted it to.
	const dimensionKeys = new Set<string>();
	let dimensionsAreOrdered = false;
	if (raw.dimensions !== undefined) {
		if (Array.isArray(raw.dimensions)) {
			dimensionsAreOrdered = true;
			raw.dimensions.forEach((entry, i) => {
				if (!isRecord(entry) || typeof entry.key !== 'string' || typeof entry.label !== 'string') {
					errors.push(`Dimensiunea #${i + 1}: are nevoie de "key" și "label" (texte).`);
					return;
				}
				if (dimensionKeys.has(entry.key)) {
					errors.push(`Dimensiunea "${entry.key}" apare de două ori.`);
				}
				dimensionKeys.add(entry.key);
			});
		} else if (isRecord(raw.dimensions)) {
			for (const [key, value] of Object.entries(raw.dimensions)) {
				if (!isRecord(value) || typeof value.label !== 'string') {
					errors.push(`Dimensiunea "${key}" are nevoie de un "label" text.`);
				}
				dimensionKeys.add(key);
			}
		} else {
			errors.push('"dimensions" trebuie să fie o listă ordonată [{ key, label }].');
		}
	}

	// resultMode + archetypes (archetype mode: dimensions ⇔ archetypes must match 1:1)
	if (raw.resultMode !== undefined && raw.resultMode !== 'band' && raw.resultMode !== 'archetype') {
		errors.push('"resultMode" trebuie să fie "band" sau "archetype".');
	}
	const archetypeKeys = new Set<string>();
	if (raw.archetypes !== undefined) {
		if (!isRecord(raw.archetypes)) {
			errors.push('"archetypes" trebuie să fie un obiect { cheie: { label, essence, advice } }.');
		} else {
			for (const [key, value] of Object.entries(raw.archetypes)) {
				if (
					!isRecord(value) ||
					typeof value.label !== 'string' ||
					typeof value.essence !== 'string' ||
					typeof value.advice !== 'string'
				) {
					errors.push(`Arhetipul "${key}" are nevoie de "label", "essence" și "advice" (texte).`);
				}
				archetypeKeys.add(key);
			}
		}
	}
	if (raw.resultMode === 'archetype') {
		if (dimensionKeys.size < 2) {
			errors.push('Modul "archetype" are nevoie de cel puțin două dimensiuni declarate.');
		}
		// In archetype mode the dimension order IS the tie-break; a record-shaped
		// config would ship whatever order jsonb sorted it to (review H-1).
		if (raw.dimensions !== undefined && !dimensionsAreOrdered) {
			errors.push(
				'Modul "archetype" cere "dimensions" ca listă ordonată [{ key, label }] — ordinea decide egalitățile.'
			);
		}
		if (!isRecord(raw.archetypes)) {
			errors.push('Modul "archetype" are nevoie de un obiect "archetypes".');
		} else {
			for (const key of dimensionKeys) {
				if (!archetypeKeys.has(key)) {
					errors.push(`Dimensiunea "${key}" nu are un arhetip corespunzător în "archetypes".`);
				}
			}
			for (const key of archetypeKeys) {
				if (!dimensionKeys.has(key)) {
					errors.push(`Arhetipul "${key}" nu are o dimensiune corespunzătoare în "dimensions".`);
				}
			}
		}
	}

	// questions
	if (!isRecord(raw.questions)) {
		errors.push('"questions" lipsește sau nu este un obiect.');
		return errors;
	}
	const byId = questionsById(form);
	for (const [questionId, spec] of Object.entries(raw.questions)) {
		const where = `Întrebarea "${questionId}"`;
		const question = byId.get(questionId);
		if (!question) {
			errors.push(`${where} nu există în schema formularului.`);
			continue;
		}
		if (
			!isRecord(spec) ||
			(spec.kind !== 'map' && spec.kind !== 'numeric' && spec.kind !== 'weights')
		) {
			errors.push(`${where}: "kind" trebuie să fie "map", "numeric" sau "weights".`);
			continue;
		}
		if (spec.dimension !== undefined) {
			if (typeof spec.dimension !== 'string' || !dimensionKeys.has(spec.dimension)) {
				errors.push(`${where}: dimensiunea "${String(spec.dimension)}" nu este declarată.`);
			}
		}
		if (spec.kind === 'weights') {
			if (!isRecord(spec.weights)) {
				errors.push(
					`${where}: "weights" trebuie să fie un obiect { valoare: { dimensiune: puncte } }.`
				);
				continue;
			}
			const optionValues = OPTION_TYPES.has(question.type)
				? new Set((question.options ?? []).map((o) => o.value))
				: null;
			for (const [value, entry] of Object.entries(spec.weights)) {
				if (optionValues && !optionValues.has(value)) {
					errors.push(`${where}: valoarea "${value}" nu este printre opțiunile întrebării.`);
				}
				if (!isRecord(entry)) {
					errors.push(
						`${where}: punctajele pentru "${value}" trebuie să fie un obiect { dimensiune: puncte }.`
					);
					continue;
				}
				for (const [dim, points] of Object.entries(entry)) {
					if (!dimensionKeys.has(dim)) {
						errors.push(
							`${where}: dimensiunea "${dim}" (la valoarea "${value}") nu este declarată.`
						);
					}
					if (typeof points !== 'number') {
						errors.push(
							`${where}: punctajul pentru "${value}" → "${dim}" trebuie să fie un număr.`
						);
					}
				}
			}
		} else if (spec.kind === 'map') {
			if (!isRecord(spec.map)) {
				errors.push(`${where}: "map" trebuie să fie un obiect { valoare: puncte }.`);
				continue;
			}
			for (const [value, points] of Object.entries(spec.map)) {
				if (typeof points !== 'number') {
					errors.push(`${where}: punctajul pentru "${value}" trebuie să fie un număr.`);
				}
			}
			if (OPTION_TYPES.has(question.type)) {
				const optionValues = new Set((question.options ?? []).map((o) => o.value));
				for (const value of Object.keys(spec.map)) {
					if (!optionValues.has(value)) {
						errors.push(`${where}: valoarea "${value}" nu este printre opțiunile întrebării.`);
					}
				}
			}
		} else {
			if (spec.multiplier !== undefined && typeof spec.multiplier !== 'number') {
				errors.push(`${where}: "multiplier" trebuie să fie un număr.`);
			}
			if (spec.cap !== undefined && typeof spec.cap !== 'number') {
				errors.push(`${where}: "cap" trebuie să fie un număr.`);
			}
		}
	}

	return errors;
}
