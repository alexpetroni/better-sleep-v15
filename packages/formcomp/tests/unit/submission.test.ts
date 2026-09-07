import { describe, it, expect } from 'vitest';
import { buildSubmitPayload, SubmitError } from '../../src/lib/submission.js';
import { SubmitError as SubmitErrorFromBarrel } from '../../src/lib/index.js';
import { formatAnswer } from '../../src/lib/format.js';
import type { FormConfig, Question } from '../../src/lib/types.js';

const config: FormConfig = {
	version: 7,
	submit: { url: '/api/x' },
	steps: [
		{
			id: 'travel',
			label: 'Travel',
			groups: [
				{
					id: 'plans',
					label: 'Plans',
					questions: [
						{
							id: 'traveling',
							uuid: 'uuid-traveling',
							type: 'single-select',
							label: 'Traveling?',
							options: [
								{ value: 'yes', label: 'Yes, definitely' },
								{ value: 'no', label: 'No' }
							]
						},
						{
							id: 'budget',
							// no uuid → falls back to id
							type: 'range',
							label: 'Budget',
							unit: '€',
							condition: { questionId: 'traveling', operator: 'equals', value: 'yes' }
						}
					]
				}
			]
		}
	]
};

describe('buildSubmitPayload', () => {
	it('carries uuid (with id fallback), raw value, and displayValue', () => {
		const responses: Record<string, unknown> = {
			traveling: 'yes',
			budget: { from: 100, to: 500 }
		};
		const payload = buildSubmitPayload(config, (_, qid) => responses[qid]);

		expect(payload.form.version).toBe(7);
		expect(new Date(payload.form.submittedAt).getTime()).not.toBeNaN();
		expect(payload.answers).toEqual([
			{
				uuid: 'uuid-traveling',
				questionId: 'traveling',
				stepId: 'travel',
				type: 'single-select',
				label: 'Traveling?',
				value: 'yes',
				displayValue: 'Yes, definitely'
			},
			{
				uuid: 'budget',
				questionId: 'budget',
				stepId: 'travel',
				type: 'range',
				label: 'Budget',
				value: { from: 100, to: 500 },
				displayValue: '100 – 500 €'
			}
		]);
	});

	it('excludes hidden answers, matching collectResponses', () => {
		const responses: Record<string, unknown> = {
			traveling: 'no',
			budget: { from: 100, to: 500 } // stale — budget is hidden when traveling = no
		};
		const payload = buildSubmitPayload(config, (_, qid) => responses[qid]);
		expect(payload.answers.map((a) => a.uuid)).toEqual(['uuid-traveling']);
	});

	it('runs labels through the translate function', () => {
		const payload = buildSubmitPayload(config, (_, qid) => (qid === 'traveling' ? 'yes' : undefined), (k) => k.toUpperCase());
		expect(payload.answers[0].label).toBe('TRAVELING?');
		expect(payload.answers[0].displayValue).toBe('YES, DEFINITELY');
	});
});

describe('formatAnswer', () => {
	const q = (partial: Partial<Question> & { type: Question['type'] }): Question => ({
		id: 'q',
		label: 'Q',
		...partial
	});

	it('formats each answer kind', () => {
		expect(formatAnswer(q({ type: 'text-input' }), undefined)).toBe('—');
		expect(formatAnswer(q({ type: 'text-input' }), 'hi')).toBe('hi');
		expect(
			formatAnswer(q({ type: 'multi-select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }), ['a', 'b'])
		).toBe('A, B');
		expect(formatAnswer(q({ type: 'number-input', unit: 'kg' }), 70)).toBe('70 kg');
		expect(formatAnswer(q({ type: 'scale' }), 0)).toBe('0');
		expect(formatAnswer(q({ type: 'range' }), { from: 1 })).toBe('1 – —');
	});
});

describe('SubmitError', () => {
	it('is an Error carrying the HTTP status and the parsed response body', () => {
		const error = new SubmitError(500, { message: 'Server exploded' });

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(SubmitError);
		expect(error.name).toBe('SubmitError');
		expect(error.status).toBe(500);
		expect(error.data).toEqual({ message: 'Server exploded' });
		expect(error.message).toBe('Request failed (500)');
	});

	it('keeps data as null for a non-JSON body', () => {
		const error = new SubmitError(502, null);

		expect(error.status).toBe(502);
		expect(error.data).toBeNull();
		expect(error.message).toBe('Request failed (502)');
	});

	it('is exported from the package barrel', () => {
		expect(typeof SubmitErrorFromBarrel).toBe('function');
		expect(SubmitErrorFromBarrel).toBe(SubmitError);
	});
});
