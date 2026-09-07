import type { FormConfig, SubmitPayload, SubmitAnswer } from './types.js';
import { collectResponses } from './validation/validator.js';
import { formatAnswer } from './format.js';

type GetResponse = (stepId: string, questionId: string) => unknown;
type Translate = (key: string) => string;

/** Field name of the hidden anti-spam input rendered when `settings.honeypot` is enabled. */
export const HONEYPOT_FIELD = 'website';

/**
 * Passed to `onSubmitError` when the configured POST returns a non-2xx
 * response: `status` is the HTTP status and `data` the parsed JSON body
 * (`null` when the body was not JSON). Network failures and rejected
 * `onFormComplete` promises reach `onSubmitError` as received, not wrapped.
 */
export class SubmitError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, data: unknown = null) {
		super(`Request failed (${status})`);
		this.name = 'SubmitError';
		this.status = status;
		this.data = data;
	}
}

/**
 * Build the JSON payload for the configured submit endpoint. Only currently
 * visible answers are included (same visibility fixpoint as
 * `collectResponses`). Each answer carries the question's stable `uuid`
 * (falling back to `id`) so a backend can match answers across quiz
 * revisions, plus the raw value and a human-readable `displayValue`.
 *
 * When `settings.honeypot` is enabled the payload also carries the honeypot
 * field name and its current value (`honeypotValue`, empty for humans) so a
 * server endpoint can reject bot submissions independently of the client.
 */
export function buildSubmitPayload(
	config: FormConfig,
	getResponse: GetResponse,
	translate: Translate = (k) => k,
	honeypotValue?: string
): SubmitPayload {
	const collected = collectResponses(config, getResponse);
	const answers: SubmitAnswer[] = [];

	for (const step of config.steps) {
		const stepResponses = collected[step.id];
		if (!stepResponses) continue;
		for (const group of step.groups) {
			for (const question of group.questions) {
				if (!(question.id in stepResponses)) continue;
				const value = stepResponses[question.id];
				answers.push({
					uuid: question.uuid ?? question.id,
					questionId: question.id,
					stepId: step.id,
					type: question.type,
					label: translate(question.label),
					value,
					displayValue: formatAnswer(question, value, translate)
				});
			}
		}
	}

	const payload: SubmitPayload = {
		form: {
			version: config.version,
			submittedAt: new Date().toISOString()
		},
		answers
	};

	if (config.settings?.honeypot) {
		payload.honeypot = { field: HONEYPOT_FIELD, value: honeypotValue ?? '' };
	}

	return payload;
}
