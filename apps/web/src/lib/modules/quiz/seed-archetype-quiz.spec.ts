import { describe, expect, it } from 'vitest';
import { ARCHETYPE_IDS, SLEEP_PATTERNS, type ArchetypeId } from './patterns.ts';
import { scoreQuiz, type QuizAnswers } from './scoring.ts';
import { ARCHETYPE_QUIZ_FORM, ARCHETYPE_QUIZ_SCORING } from './seed-archetype-quiz.ts';
import { countQuestions, validateForPublish } from './validate.ts';

const allQuestions = ARCHETYPE_QUIZ_FORM.steps.flatMap((s) => s.groups.flatMap((g) => g.questions));

/**
 * The answer set a visitor living archetype `target` would give, derived
 * straight from the scoring map: for every question pick the option that
 * scores `target` highest (ties → first); multi-selects tick every option
 * that signals `target`, or the honest zero-point option when none does.
 */
function answersFor(target: ArchetypeId): QuizAnswers {
	const answers: QuizAnswers = {};
	for (const question of allQuestions) {
		const spec = ARCHETYPE_QUIZ_SCORING.questions[question.id];
		if (!spec || spec.kind !== 'weights') continue;
		const entries = Object.entries(spec.weights);
		if (question.type === 'multi-select') {
			const positive = entries.filter(([, w]) => (w[target] ?? 0) > 0).map(([value]) => value);
			const neutral = entries.reduce((min, entry) => {
				const total = (e: (typeof entries)[number]) =>
					Object.values(e[1]).reduce((a, b) => a + b, 0);
				return total(entry) < total(min) ? entry : min;
			}, entries[0])[0];
			answers[question.id] = positive.length ? positive : [neutral];
		} else {
			let best = entries[0];
			for (const entry of entries) {
				if ((entry[1][target] ?? 0) > (best[1][target] ?? 0)) best = entry;
			}
			answers[question.id] = best[0];
		}
	}
	return answers;
}

describe('seeded archetype quiz', () => {
	it('is publishable: 12 questions, 3 steps, valid archetype scoring', () => {
		expect(validateForPublish(ARCHETYPE_QUIZ_FORM, ARCHETYPE_QUIZ_SCORING)).toEqual([]);
		expect(ARCHETYPE_QUIZ_FORM.steps).toHaveLength(3);
		expect(countQuestions(ARCHETYPE_QUIZ_FORM)).toBe(12);
	});

	it('every question is scored, required and carries a unique uuid', () => {
		const uuids = new Set<string>();
		for (const question of allQuestions) {
			expect(ARCHETYPE_QUIZ_SCORING.questions[question.id], question.id).toBeDefined();
			expect(question.required, question.id).toBe(true);
			expect(question.uuid, question.id).toBeTruthy();
			uuids.add(question.uuid!);
		}
		expect(uuids.size).toBe(12);
		expect(Object.keys(ARCHETYPE_QUIZ_SCORING.questions)).toHaveLength(12);
	});

	// The DoD guarantee: no archetype in the config is dead copy.
	it.each(ARCHETYPE_IDS.map((id) => [id]))(
		'archetype %s is reachable: its own answer set makes it the winner',
		(id) => {
			const answers = answersFor(id);
			// A full submission: every one of the 12 (required) questions answered.
			expect(Object.keys(answers)).toHaveLength(12);
			const profile = scoreQuiz(ARCHETYPE_QUIZ_FORM, ARCHETYPE_QUIZ_SCORING, answers);
			expect(profile.winner?.key).toBe(id);
			expect(profile.winner!.score).toBeGreaterThan(profile.runnerUp!.score);
			// The rendered result has real copy behind it.
			expect(profile.winner!.label).toBeTruthy();
			expect(profile.winner!.essence).toBeTruthy();
			expect(profile.winner!.advice.length).toBeGreaterThan(100);
		}
	);

	it('the four deck patterns map onto valid archetype ids and cover all nine', () => {
		const covered = new Set<ArchetypeId>();
		for (const pattern of SLEEP_PATTERNS) {
			expect(pattern.archetypeIds.length).toBeGreaterThan(0);
			for (const id of pattern.archetypeIds) {
				expect(ARCHETYPE_IDS).toContain(id);
				// Every pattern archetype exists in the seeded scoring config.
				expect(ARCHETYPE_QUIZ_SCORING.archetypes?.[id]).toBeDefined();
				covered.add(id);
			}
		}
		expect(covered.size).toBe(ARCHETYPE_IDS.length);
	});
});
