import type {
	FormConfig, Condition, SimpleCondition, Question, QuestionGroup, QuestionType, StepConfig
} from '../types.js';

const OPTION_TYPES = new Set(['single-select', 'multi-select', 'select', 'likert']);
const VALUE_OPERATORS = new Set(['equals', 'not-equals', 'includes', 'not-includes', 'greater-than', 'less-than']);
/** Question types whose answer is a number — the only ones greater-than / less-than can compare. */
const NUMERIC_TYPES = new Set<QuestionType>(['scale', 'number-input']);

/** Questions of a step by id — condition targets are resolved through this. */
type QuestionIndex = Map<string, Map<string, Question>>;

/**
 * Sanity-check a form config and return a list of human-readable warnings.
 * MultiStepForm runs this automatically in dev mode and logs the results;
 * it can also be called directly (e.g. in a config unit test).
 */
export function validateConfig(config: FormConfig): string[] {
	const warnings: string[] = [];
	const stepIds = new Set<string>();
	// questions per step, for condition reference and comparison checks
	const questions: QuestionIndex = new Map();
	// uuids must be unique across the whole form — they key answers in the submission payload
	const uuids = new Set<string>();

	if (config.steps.length === 0) warnings.push('Config has no steps');

	for (const step of config.steps) {
		if (stepIds.has(step.id)) warnings.push(`Duplicate step id "${step.id}"`);
		stepIds.add(step.id);

		const byId = new Map<string, Question>();
		questions.set(step.id, byId);
		const groupIds = new Set<string>();

		if (step.groups.length === 0) warnings.push(`Step "${step.id}" has no groups`);

		for (const group of step.groups) {
			if (groupIds.has(group.id)) warnings.push(`Step "${step.id}": duplicate group id "${group.id}"`);
			groupIds.add(group.id);

			if (group.questions.length === 0) warnings.push(`Step "${step.id}": group "${group.id}" has no questions`);

			for (const question of group.questions) {
				if (byId.has(question.id)) {
					warnings.push(`Step "${step.id}": duplicate question id "${question.id}"`);
				}
				byId.set(question.id, question);

				if (OPTION_TYPES.has(question.type) && !question.options?.length) {
					warnings.push(`Question "${question.id}" (${question.type}) has no options`);
				}

				if (question.type === 'consent' && question.options?.length) {
					warnings.push(
						`Question "${question.id}" (consent) has options — a consent checkbox renders only its label`
					);
				}

				if (question.uuid) {
					if (uuids.has(question.uuid)) {
						warnings.push(`Duplicate question uuid "${question.uuid}"`);
					}
					uuids.add(question.uuid);
				}
			}

			if (group.renderMode === 'likert-batch') {
				checkLikertBatch(step, group, warnings);
			}
		}
	}

	// Condition references — checked after collecting all ids so forward references work
	for (const step of config.steps) {
		if (step.condition) {
			checkStepSelfReference(step.condition, step, warnings);
			checkCondition(step.condition, `step "${step.id}"`, step, questions, warnings);
		}
		for (const group of step.groups) {
			if (group.condition) {
				checkCondition(group.condition, `group "${group.id}" in step "${step.id}"`, step, questions, warnings);
			}
			for (const question of group.questions) {
				if (question.condition) {
					checkCondition(
						question.condition, `question "${question.id}" in step "${step.id}"`, step, questions, warnings
					);
				}
			}
		}
	}

	return warnings;
}

function checkLikertBatch(step: StepConfig, group: QuestionGroup, warnings: string[]) {
	// A batch renders every row on the first question's scale, so a non-likert
	// question would be drawn as a likert row (or not at all) — flag it by
	// itself and compare option sets among the likert rows only.
	const likerts: Question[] = [];
	for (const q of group.questions) {
		if (q.type === 'likert') likerts.push(q);
		else {
			warnings.push(
				`Step "${step.id}": likert-batch group "${group.id}" contains "${q.id}" of type ${q.type}; every question in a likert batch must be likert`
			);
		}
	}
	const first = likerts[0]?.options?.map((o) => o.value).join('|');
	for (const q of likerts.slice(1)) {
		const values = q.options?.map((o) => o.value).join('|');
		if (values !== first) {
			warnings.push(
				`Step "${step.id}": likert-batch questions must share the same options; "${q.id}" differs from "${likerts[0].id}"`
			);
		}
	}
}

/**
 * A step condition is evaluated to decide whether the step is shown at all, so
 * it can only sensibly look at answers on *other* steps. A simple condition
 * without `stepId` (or with the step's own id) resolves to the step itself.
 */
function checkStepSelfReference(condition: Condition, step: StepConfig, warnings: string[]) {
	if ('conditions' in condition) {
		for (const c of condition.conditions) checkStepSelfReference(c, step, warnings);
		return;
	}
	if (condition.stepId === undefined || condition.stepId === step.id) {
		warnings.push(
			`Condition on step "${step.id}" references question "${condition.questionId}" in its own step; a step condition must target another step via stepId`
		);
	}
}

function checkCondition(
	condition: Condition,
	where: string,
	step: StepConfig,
	questions: QuestionIndex,
	warnings: string[]
) {
	if ('conditions' in condition) {
		for (const c of condition.conditions) checkCondition(c, where, step, questions, warnings);
		return;
	}
	const targetStepId = condition.stepId ?? step.id;
	const targets = questions.get(targetStepId);
	const target = targets?.get(condition.questionId);
	if (!targets) {
		warnings.push(`Condition on ${where} references unknown step "${targetStepId}"`);
	} else if (!target) {
		warnings.push(`Condition on ${where} references unknown question "${condition.questionId}" in step "${targetStepId}"`);
	}
	if (VALUE_OPERATORS.has(condition.operator) && condition.value === undefined) {
		warnings.push(`Condition on ${where} uses operator "${condition.operator}" without a value`);
	} else if (target) {
		checkComparison(condition, where, target, warnings);
	}
}

/**
 * Compare the operator and value with what the target question actually stores
 * (see the evaluator): numbers for scale / number-input, option values for
 * select types, arrays for multi-select, booleans for consent, objects for
 * range. A mismatch can never match at runtime, so it is a config mistake.
 */
function checkComparison(condition: SimpleCondition, where: string, target: Question, warnings: string[]) {
	const { operator, value } = condition;
	const prefix = `Condition on ${where}: "${operator}"`;
	const needsNumber = () =>
		`${prefix} on "${target.id}" (${target.type}) needs a number value, got ${describe(value)}`;

	switch (operator) {
		case 'equals':
		case 'not-equals':
			if (NUMERIC_TYPES.has(target.type)) {
				if (typeof value !== 'number') warnings.push(needsNumber());
			} else if (target.type === 'range') {
				warnings.push(
					`${prefix} on "${target.id}" (range) never matches; a range answer is an object compared by identity, use answered / not-answered`
				);
			} else if (target.type === 'consent') {
				if (typeof value !== 'boolean') {
					warnings.push(`${prefix} on "${target.id}" (consent) needs a boolean value, got ${describe(value)}`);
				}
			} else {
				checkOptionValue(prefix, target, value, warnings);
			}
			break;
		case 'includes':
		case 'not-includes':
			if (target.type !== 'multi-select') {
				warnings.push(`${prefix} needs a multi-select target, but "${target.id}" is ${target.type}`);
			} else {
				checkOptionValue(prefix, target, value, warnings);
			}
			break;
		case 'greater-than':
		case 'less-than':
			if (!NUMERIC_TYPES.has(target.type)) {
				warnings.push(`${prefix} needs a scale or number-input target, but "${target.id}" is ${target.type}`);
			} else if (typeof value !== 'number') {
				warnings.push(needsNumber());
			}
			break;
	}
}

/** For a target with options, the compared value must be one of the option values. */
function checkOptionValue(prefix: string, target: Question, value: unknown, warnings: string[]) {
	const values = target.options?.map((o) => o.value);
	// A select-type question without options is reported separately.
	if (!values?.length) return;
	if (!values.includes(value as string)) {
		warnings.push(
			`${prefix} value ${describe(value, false)} is not one of the options of "${target.id}" (${target.type}: ${values.join(', ')})`
		);
	}
}

function describe(value: unknown, withType = true): string {
	let text: string;
	try {
		text = JSON.stringify(value) ?? String(value);
	} catch {
		text = String(value);
	}
	return withType ? `${text} (${typeof value})` : text;
}
