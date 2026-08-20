/**
 * New in 0.3.0 — email-format validation, the `consent` question type, and the
 * opt-in honeypot. Every test in this file FAILS against formcomp 0.2.1:
 *
 * - email: 0.2.1 has no text-input branch in the validator, so any non-empty
 *   string validated as 'ok' (and `isValidEmail` did not exist).
 * - consent: the type did not exist; `questionStatus` treated `false` as an
 *   answered value ('ok'), and `formatAnswer` fell through to String(true).
 * - honeypot: `buildSubmitPayload` had no honeypot parameter and never
 *   emitted a `honeypot` key; `validateConfig` knew no consent type.
 */
import { describe, it, expect } from 'vitest';
import { questionStatus, validateStep, isValidEmail } from '../../src/lib/validation/validator.js';
import { validateConfig } from '../../src/lib/validation/config-check.js';
import { buildSubmitPayload, HONEYPOT_FIELD } from '../../src/lib/submission.js';
import { formatAnswer } from '../../src/lib/format.js';
import type { FormConfig, Question, StepConfig } from '../../src/lib/types.js';

const q = (partial: Partial<Question> & { id: string; type: Question['type'] }): Question => ({
	label: partial.id,
	...partial
});

describe('email validation (text-input + inputType email)', () => {
	const email = (required: boolean) =>
		q({ id: 'email', type: 'text-input', inputType: 'email', required });

	it('accepts well-formed addresses, required or optional', () => {
		for (const value of ['jane@example.com', 'a.b+c@sub.domain.ro', ' padded@example.ro ']) {
			expect(questionStatus(email(true), value)).toBe('ok');
			expect(questionStatus(email(false), value)).toBe('ok');
		}
	});

	it('rejects malformed addresses as invalid, required or optional', () => {
		for (const value of [
			'jane',
			'jane@',
			'@example.com',
			'jane@example', // no dot in the domain
			'jane@@example.com', // two @
			'ja ne@example.com',
			'jane@exam ple.com'
		]) {
			expect(questionStatus(email(true), value)).toBe('invalid');
			expect(questionStatus(email(false), value)).toBe('invalid');
		}
	});

	it('empty: missing when required, ok when optional', () => {
		for (const value of [undefined, '', '   ']) {
			expect(questionStatus(email(true), value)).toBe('missing');
			expect(questionStatus(email(false), value)).toBe('ok');
		}
	});

	it('does not apply to plain text or url inputs', () => {
		expect(questionStatus(q({ id: 't', type: 'text-input' }), 'not-an-email')).toBe('ok');
		expect(questionStatus(q({ id: 'u', type: 'text-input', inputType: 'url' }), 'not-an-email')).toBe('ok');
	});

	it('validateStep reports reason invalid so the red-ring UX engages', () => {
		const step: StepConfig = {
			id: 's',
			label: 'S',
			groups: [{ id: 'g', label: 'G', questions: [email(true)] }]
		};
		expect(validateStep(step, () => 'nope', 's')).toEqual({
			isValid: false,
			firstIncompleteGroupId: 'g',
			reason: 'invalid'
		});
		expect(validateStep(step, () => 'jane@example.com', 's').isValid).toBe(true);
	});

	it('isValidEmail is exported for reuse', () => {
		expect(isValidEmail('jane@example.com')).toBe(true);
		expect(isValidEmail('jane@example')).toBe(false);
	});
});

describe('consent question type', () => {
	it('required: validates only when the value is exactly true', () => {
		const consent = q({ id: 'gdpr', type: 'consent', required: true });
		expect(questionStatus(consent, true)).toBe('ok');
		expect(questionStatus(consent, false)).toBe('missing');
		expect(questionStatus(consent, undefined)).toBe('missing');
		expect(questionStatus(consent, 'true')).toBe('missing'); // booleans only
	});

	it('optional: any state is ok', () => {
		const consent = q({ id: 'news', type: 'consent' });
		expect(questionStatus(consent, true)).toBe('ok');
		expect(questionStatus(consent, false)).toBe('ok');
		expect(questionStatus(consent, undefined)).toBe('ok');
	});

	it('formats as an affirmative through the translate fn, dash otherwise', () => {
		const consent = q({ id: 'gdpr', type: 'consent' });
		expect(formatAnswer(consent, true)).toBe('Yes');
		expect(formatAnswer(consent, true, (k) => (k === 'Yes' ? 'Da' : k))).toBe('Da');
		expect(formatAnswer(consent, false)).toBe('—');
		expect(formatAnswer(consent, undefined)).toBe('—');
	});

	it('validateConfig warns when a consent question carries options', () => {
		const config: FormConfig = {
			steps: [
				{
					id: 's',
					label: 'S',
					groups: [
						{
							id: 'g',
							label: 'G',
							questions: [
								q({ id: 'ok_consent', type: 'consent' }),
								q({ id: 'odd_consent', type: 'consent', options: [{ value: 'x', label: 'X' }] })
							]
						}
					]
				}
			]
		};
		const warnings = validateConfig(config);
		expect(warnings.some((w) => w.includes('"odd_consent"') && w.includes('consent'))).toBe(true);
		expect(warnings.some((w) => w.includes('"ok_consent"'))).toBe(false);
	});
});

describe('honeypot payload passthrough', () => {
	const config = (honeypot: boolean): FormConfig => ({
		version: 1,
		submit: { url: '/api/x' },
		settings: honeypot ? { honeypot: true } : {},
		steps: [
			{
				id: 's',
				label: 'S',
				groups: [
					{
						id: 'g',
						label: 'G',
						questions: [q({ id: 'email', type: 'text-input', inputType: 'email' })]
					}
				]
			}
		]
	});
	const get = (_: string, qid: string) => (qid === 'email' ? 'jane@example.com' : undefined);

	it('includes field name and an empty value for human submissions', () => {
		const payload = buildSubmitPayload(config(true), get, (k) => k, '');
		expect(payload.honeypot).toEqual({ field: HONEYPOT_FIELD, value: '' });
		// answers stay untouched next to the honeypot key
		expect(payload.answers.map((a) => a.questionId)).toEqual(['email']);
	});

	it('passes a filled honeypot value through so a server can reject', () => {
		const payload = buildSubmitPayload(config(true), get, (k) => k, 'gotcha');
		expect(payload.honeypot).toEqual({ field: HONEYPOT_FIELD, value: 'gotcha' });
	});

	it('defaults the value to empty when the caller passes none', () => {
		expect(buildSubmitPayload(config(true), get).honeypot).toEqual({
			field: HONEYPOT_FIELD,
			value: ''
		});
	});

	it('emits no honeypot key when the setting is off', () => {
		expect(buildSubmitPayload(config(false), get, (k) => k, 'gotcha').honeypot).toBeUndefined();
	});
});
