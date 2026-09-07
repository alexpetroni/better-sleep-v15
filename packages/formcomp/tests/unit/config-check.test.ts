import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/lib/validation/config-check.js';
import { examples } from '../../src/examples/index.js';
import type { Condition, ConditionOperator, FormConfig } from '../../src/lib/types.js';

describe('validateConfig', () => {
	it('accepts a well-formed config', () => {
		const config: FormConfig = {
			steps: [
				{
					id: 'a',
					label: 'A',
					groups: [
						{
							id: 'g',
							label: 'G',
							questions: [
								{ id: 'q1', type: 'single-select', label: 'Q1', options: [{ value: 'x', label: 'X' }] },
								{
									id: 'q2',
									type: 'text-input',
									label: 'Q2',
									condition: { questionId: 'q1', operator: 'equals', value: 'x' }
								}
							]
						}
					]
				}
			]
		};
		expect(validateConfig(config)).toEqual([]);
	});

	it('flags duplicates, missing options, bad references, and valueless comparisons', () => {
		const config: FormConfig = {
			steps: [
				{
					id: 'a',
					label: 'A',
					groups: [
						{
							id: 'g',
							label: 'G',
							questions: [
								{ id: 'q1', type: 'single-select', label: '' }, // no options
								{ id: 'q1', type: 'text-input', label: '' }, // duplicate id
								{
									id: 'q3',
									type: 'text-input',
									label: '',
									condition: { questionId: 'nope', operator: 'equals', value: 1 } // unknown question
								},
								{
									id: 'q4',
									type: 'text-input',
									label: '',
									condition: { questionId: 'q1', operator: 'equals' } // missing value
								},
								{
									id: 'q5',
									type: 'text-input',
									label: '',
									condition: { questionId: 'q1', operator: 'equals', value: 1, stepId: 'ghost' } // unknown step
								}
							]
						}
					]
				}
			]
		};
		const warnings = validateConfig(config);
		expect(warnings.some((w) => w.includes('has no options'))).toBe(true);
		expect(warnings.some((w) => w.includes('duplicate question id "q1"'))).toBe(true);
		expect(warnings.some((w) => w.includes('unknown question "nope"'))).toBe(true);
		expect(warnings.some((w) => w.includes('without a value'))).toBe(true);
		expect(warnings.some((w) => w.includes('unknown step "ghost"'))).toBe(true);
	});

	it('flags mismatched likert-batch option sets', () => {
		const options = (values: string[]) => values.map((v) => ({ value: v, label: v }));
		const config: FormConfig = {
			steps: [
				{
					id: 'a',
					label: 'A',
					groups: [
						{
							id: 'g',
							label: 'G',
							renderMode: 'likert-batch',
							questions: [
								{ id: 'q1', type: 'likert', label: '', options: options(['0', '1']) },
								{ id: 'q2', type: 'likert', label: '', options: options(['0', '1', '2']) }
							]
						}
					]
				}
			]
		};
		expect(validateConfig(config).some((w) => w.includes('must share the same options'))).toBe(true);
	});
});

// ── PHASE-2 (R-13): comparison, self-reference, structural and likert-batch checks ──

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v.toUpperCase() }));

/**
 * Step "a" holds one target question of every relevant type; step "b" holds a
 * text question whose `condition` is under test (cross-step, via stepId 'a').
 * An optional `stepCondition` goes on step "b" itself.
 */
function withCondition(condition: Condition | undefined, stepCondition?: Condition): FormConfig {
	return {
		steps: [
			{
				id: 'a',
				label: 'A',
				groups: [
					{
						id: 'g',
						label: 'G',
						questions: [
							{ id: 'mood', type: 'scale', label: 'Mood', min: 1, max: 5 },
							{ id: 'age', type: 'number-input', label: 'Age' },
							{ id: 'role', type: 'single-select', label: 'Role', options: opts(['eng', 'design']) },
							{ id: 'country', type: 'select', label: 'Country', options: opts(['de', 'fr']) },
							{ id: 'interests', type: 'multi-select', label: 'Interests', options: opts(['music', 'sports']) },
							{ id: 'agree', type: 'likert', label: 'Agree?', options: opts(['1', '2', '3']) },
							{ id: 'budget', type: 'range', label: 'Budget', min: 0, max: 100 },
							{ id: 'consent', type: 'consent', label: 'Consent' },
							{ id: 'name', type: 'text-input', label: 'Name' }
						]
					}
				]
			},
			{
				id: 'b',
				label: 'B',
				condition: stepCondition,
				groups: [
					{
						id: 'h',
						label: 'H',
						questions: [{ id: 'follow', type: 'text-input', label: 'Follow-up', condition }]
					}
				]
			}
		]
	};
}

/** A simple cross-step condition targeting a question in step "a". */
const on = (questionId: string, operator: ConditionOperator, value?: unknown): Condition => ({
	questionId,
	operator,
	value,
	stepId: 'a'
});

describe('validateConfig: step conditions that resolve to their own step', () => {
	it('warns when a step condition has no stepId', () => {
		const warnings = validateConfig(withCondition(undefined, { questionId: 'follow', operator: 'answered' }));
		expect(warnings).toEqual([
			'Condition on step "b" references question "follow" in its own step; a step condition must target another step via stepId'
		]);
	});

	it('warns when a nested step condition names the step itself', () => {
		const warnings = validateConfig(
			withCondition(undefined, {
				operator: 'and',
				conditions: [on('name', 'answered'), { questionId: 'follow', operator: 'answered', stepId: 'b' }]
			})
		);
		expect(warnings).toEqual([
			'Condition on step "b" references question "follow" in its own step; a step condition must target another step via stepId'
		]);
	});

	it('accepts a step condition that targets another step', () => {
		expect(validateConfig(withCondition(undefined, on('name', 'answered')))).toEqual([]);
		expect(
			validateConfig(withCondition(undefined, { operator: 'or', conditions: [on('name', 'answered'), on('mood', 'greater-than', 3)] }))
		).toEqual([]);
	});

	it('a question condition without stepId is not a self-reference', () => {
		const config = withCondition(undefined);
		config.steps[1].groups[0].questions.push({
			id: 'other',
			type: 'text-input',
			label: 'Other',
			condition: { questionId: 'follow', operator: 'answered' }
		});
		expect(validateConfig(config)).toEqual([]);
	});
});

describe('validateConfig: equals / not-equals against the target question', () => {
	it.each(['equals', 'not-equals'] as const)('%s on a scale or number-input needs a number value', (operator) => {
		expect(validateConfig(withCondition(on('mood', operator, '3')))).toEqual([
			`Condition on question "follow" in step "b": "${operator}" on "mood" (scale) needs a number value, got "3" (string)`
		]);
		expect(validateConfig(withCondition(on('age', operator, true)))).toEqual([
			`Condition on question "follow" in step "b": "${operator}" on "age" (number-input) needs a number value, got true (boolean)`
		]);
		expect(validateConfig(withCondition(on('mood', operator, 3)))).toEqual([]);
		expect(validateConfig(withCondition(on('age', operator, 30)))).toEqual([]);
	});

	it.each([
		['role', 'single-select', 'eng', 'pm', 'eng, design'],
		['country', 'select', 'fr', 'FR', 'de, fr'],
		['agree', 'likert', '2', 2, '1, 2, 3']
	] as const)('equals on %s (%s) must use one of its option values', (id, type, good, bad, list) => {
		expect(validateConfig(withCondition(on(id, 'equals', bad)))).toEqual([
			`Condition on question "follow" in step "b": "equals" value ${JSON.stringify(bad)} is not one of the options of "${id}" (${type}: ${list})`
		]);
		expect(validateConfig(withCondition(on(id, 'equals', good)))).toEqual([]);
	});

	it('not-equals also checks the option set', () => {
		expect(validateConfig(withCondition(on('role', 'not-equals', 'nope')))).toHaveLength(1);
		expect(validateConfig(withCondition(on('role', 'not-equals', 'design')))).toEqual([]);
	});

	it('equals on a range target never matches', () => {
		expect(validateConfig(withCondition(on('budget', 'equals', { from: 1, to: 2 })))).toEqual([
			'Condition on question "follow" in step "b": "equals" on "budget" (range) never matches; a range answer is an object compared by identity, use answered / not-answered'
		]);
		expect(validateConfig(withCondition(on('budget', 'not-equals', 5)))).toHaveLength(1);
		// answered / not-answered are the supported operators for a range
		expect(validateConfig(withCondition(on('budget', 'answered')))).toEqual([]);
		expect(validateConfig(withCondition(on('budget', 'not-answered')))).toEqual([]);
	});

	it('equals on a consent target needs a boolean value', () => {
		expect(validateConfig(withCondition(on('consent', 'equals', 'true')))).toEqual([
			'Condition on question "follow" in step "b": "equals" on "consent" (consent) needs a boolean value, got "true" (string)'
		]);
		expect(validateConfig(withCondition(on('consent', 'not-equals', 1)))).toHaveLength(1);
		expect(validateConfig(withCondition(on('consent', 'equals', true)))).toEqual([]);
		expect(validateConfig(withCondition(on('consent', 'not-equals', false)))).toEqual([]);
	});

	it('equals on a free-text target is not type-checked', () => {
		expect(validateConfig(withCondition(on('name', 'equals', 'Ada')))).toEqual([]);
	});

	it('a group condition names the group and its step', () => {
		const config = withCondition(undefined);
		config.steps[1].groups[0].condition = on('mood', 'equals', '3');
		expect(validateConfig(config)).toEqual([
			'Condition on group "h" in step "b": "equals" on "mood" (scale) needs a number value, got "3" (string)'
		]);
	});
});

describe('validateConfig: includes / not-includes', () => {
	it.each(['includes', 'not-includes'] as const)('%s needs a multi-select target', (operator) => {
		expect(validateConfig(withCondition(on('role', operator, 'eng')))).toEqual([
			`Condition on question "follow" in step "b": "${operator}" needs a multi-select target, but "role" is single-select`
		]);
		expect(validateConfig(withCondition(on('name', operator, 'x')))).toHaveLength(1);
		expect(validateConfig(withCondition(on('interests', operator, 'music')))).toEqual([]);
	});

	it.each(['includes', 'not-includes'] as const)('%s must use one of the multi-select option values', (operator) => {
		expect(validateConfig(withCondition(on('interests', operator, 'dancing')))).toEqual([
			`Condition on question "follow" in step "b": "${operator}" value "dancing" is not one of the options of "interests" (multi-select: music, sports)`
		]);
		expect(validateConfig(withCondition(on('interests', operator, 'sports')))).toEqual([]);
	});
});

describe('validateConfig: greater-than / less-than', () => {
	it.each(['greater-than', 'less-than'] as const)('%s needs a scale or number-input target', (operator) => {
		expect(validateConfig(withCondition(on('role', operator, 1)))).toEqual([
			`Condition on question "follow" in step "b": "${operator}" needs a scale or number-input target, but "role" is single-select`
		]);
		expect(validateConfig(withCondition(on('budget', operator, 1)))).toHaveLength(1);
		expect(validateConfig(withCondition(on('mood', operator, 3)))).toEqual([]);
		expect(validateConfig(withCondition(on('age', operator, 18)))).toEqual([]);
	});

	it('greater-than / less-than need a number value (the evaluator compares numbers only)', () => {
		expect(validateConfig(withCondition(on('age', 'greater-than', '18')))).toEqual([
			'Condition on question "follow" in step "b": "greater-than" on "age" (number-input) needs a number value, got "18" (string)'
		]);
		expect(validateConfig(withCondition(on('mood', 'less-than', 4)))).toEqual([]);
	});
});

describe('validateConfig: comparison checks skip unknown targets', () => {
	it('reports only the unknown-question warning', () => {
		const warnings = validateConfig(withCondition(on('ghost', 'greater-than', 'x')));
		expect(warnings).toEqual([
			'Condition on question "follow" in step "b" references unknown question "ghost" in step "a"'
		]);
	});

	it('reports only the unknown-step warning', () => {
		const warnings = validateConfig(withCondition({ questionId: 'mood', operator: 'equals', value: 'x', stepId: 'zzz' }));
		expect(warnings).toEqual(['Condition on question "follow" in step "b" references unknown step "zzz"']);
	});

	it('a valueless comparison reports only the missing value', () => {
		const warnings = validateConfig(withCondition({ questionId: 'mood', operator: 'equals', stepId: 'a' }));
		expect(warnings).toEqual(['Condition on question "follow" in step "b" uses operator "equals" without a value']);
	});
});

describe('validateConfig: structure', () => {
	it('warns on a config with no steps', () => {
		expect(validateConfig({ steps: [] })).toEqual(['Config has no steps']);
	});

	it('warns on a step with no groups', () => {
		const config: FormConfig = { steps: [{ id: 'empty', label: 'Empty', groups: [] }] };
		expect(validateConfig(config)).toEqual(['Step "empty" has no groups']);
	});

	it('warns on a group with no questions', () => {
		const config: FormConfig = {
			steps: [{ id: 'a', label: 'A', groups: [{ id: 'blank', label: 'Blank', questions: [] }] }]
		};
		expect(validateConfig(config)).toEqual(['Step "a": group "blank" has no questions']);
	});

	it('does not warn on a populated structure', () => {
		expect(validateConfig(withCondition(undefined))).toEqual([]);
	});
});

describe('validateConfig: likert-batch membership', () => {
	const batch = (questions: FormConfig['steps'][0]['groups'][0]['questions']): FormConfig => ({
		steps: [{ id: 'a', label: 'A', groups: [{ id: 'g', label: 'G', renderMode: 'likert-batch', questions }] }]
	});

	it('warns on a non-likert question inside a likert-batch group', () => {
		const warnings = validateConfig(
			batch([
				{ id: 'q1', type: 'likert', label: 'Q1', options: opts(['1', '2']) },
				{ id: 'note', type: 'text-input', label: 'Note' },
				{ id: 'q2', type: 'likert', label: 'Q2', options: opts(['1', '2']) }
			])
		);
		expect(warnings).toEqual([
			'Step "a": likert-batch group "g" contains "note" of type text-input; every question in a likert batch must be likert'
		]);
	});

	it('accepts a batch of likert questions sharing one option set', () => {
		expect(
			validateConfig(
				batch([
					{ id: 'q1', type: 'likert', label: 'Q1', options: opts(['1', '2']) },
					{ id: 'q2', type: 'likert', label: 'Q2', options: opts(['1', '2']) }
				])
			)
		).toEqual([]);
	});

	it('a likert question in a default group is fine (it renders standalone)', () => {
		const config: FormConfig = {
			steps: [
				{
					id: 'a',
					label: 'A',
					groups: [{ id: 'g', label: 'G', questions: [{ id: 'q1', type: 'likert', label: 'Q1', options: opts(['1', '2']) }] }]
				}
			]
		};
		expect(validateConfig(config)).toEqual([]);
	});
});

describe('validateConfig: shipped examples', () => {
	it('registers the expected examples', () => {
		expect(examples.map((e) => e.slug)).toContain('all-inputs');
		expect(examples.length).toBeGreaterThanOrEqual(8);
	});

	it.each(examples.map((e) => [e.slug, e] as const))('%s produces no warnings', (_slug, example) => {
		expect(validateConfig(example.config)).toEqual([]);
	});
});
