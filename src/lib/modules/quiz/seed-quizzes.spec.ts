import { describe, expect, it } from 'vitest';
import { validateConfig } from 'formcomp/config-check';
import { SLEEP_QUIZ_SEED } from './seed-quiz.ts';
import { ARCHETYPE_QUIZ_SEED } from './seed-archetype-quiz.ts';
import { validateForPublish } from './validate.ts';

// formComp 0.4.0's validateConfig is stricter than 0.3.0's (BS-11 Stage E):
// both seeded quizzes must pass it with ZERO warnings, through the same
// function the publish/save gate uses — one rule for seeds and the editor.
describe('seeded quiz configs under formComp 0.4.0', () => {
	for (const seed of [SLEEP_QUIZ_SEED, ARCHETYPE_QUIZ_SEED]) {
		it(`"${seed.slug}" validates with zero formcomp warnings`, () => {
			expect(validateConfig(seed.formSchema)).toEqual([]);
		});

		it(`"${seed.slug}" passes the publish gate (which includes validateConfig)`, () => {
			expect(validateForPublish(seed.formSchema, seed.scoring)).toEqual([]);
		});
	}

	it('the publish gate reports what formcomp reports (not only the local structural rules)', () => {
		// A group-level condition pointing at a question that does not exist:
		// structurally fine for the local validator, a formcomp warning.
		const broken = structuredClone(SLEEP_QUIZ_SEED.formSchema);
		broken.steps[0].groups[0].condition = { questionId: 'nu-exista', operator: 'answered' };
		expect(validateConfig(broken).length).toBeGreaterThan(0);
		expect(validateForPublish(broken, SLEEP_QUIZ_SEED.scoring)).toEqual(validateConfig(broken));
	});
});
