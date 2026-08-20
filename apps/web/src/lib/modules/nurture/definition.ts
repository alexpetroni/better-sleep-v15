// Type-only cross-module import: erased at runtime, so this file stays loadable
// from plain node (seed script) and from universal code via the module barrel.
import type { ConsentKey } from '../crm/consent.ts';

/**
 * Sequence definitions are DATA: the shapes below live as jsonb on
 * `nurture_sequences` rows, seeded per site from `config/sites/*.ts`.
 * better-sleep and better-life run different sequences from the same code;
 * the operator stops one in /admin/nurture without a deploy.
 */

/** Template keys a step may reference (typed templates in modules/email). */
export const NURTURE_TEMPLATE_KEYS = ['nurture'] as const;

export type NurtureTemplateKey = (typeof NURTURE_TEMPLATE_KEYS)[number];

/**
 * A step CTA whose `url` is exactly this token resolves at SEND time to the
 * subscriber's own latest result page for the sequence's trigger quiz
 * (`/quiz/<slug>/rezultat/<id>`, absolutized). Only `quiz-completed`
 * sequences can carry it — validation refuses it elsewhere, and refuses any
 * other `{{…}}` so a typo'd token can't ship as a literal URL.
 */
export const RESULT_URL_TOKEN = '{{resultUrl}}';

export interface SequenceStep {
	/** Whole days after enrollment (0 = the enrollment day). */
	offsetDays: number;
	/**
	 * Wall-clock send hour (0–23) in Europe/Bucharest on the target day.
	 * Absent: exactly `offsetDays × 24h` after the enrollment instant.
	 */
	hourLocal?: number;
	templateKey: NurtureTemplateKey;
	subject: string;
	paragraphs: string[];
	/** Optional button; a site-relative `url` is absolutized at send time. */
	cta?: { label: string; url: string };
}

export type SequenceTrigger =
	| { kind: 'consent-confirmed' }
	| { kind: 'quiz-completed'; quizSlug: string; bands?: string[] }
	| { kind: 'order-paid' };

export const SEQUENCE_TRIGGER_KINDS = [
	'consent-confirmed',
	'quiz-completed',
	'order-paid'
] as const;

export interface NurtureSequenceDefinition {
	/** Stable identifier — the seed upserts by it. */
	key: string;
	name: string;
	trigger: SequenceTrigger;
	/** Which marketing consent gates enrollment AND every send. */
	consentKey: ConsentKey;
	steps: SequenceStep[];
}

/** Problems with a definition (English — these surface to the seed operator). */
export function validateSequenceDefinition(def: NurtureSequenceDefinition): string[] {
	const problems: string[] = [];
	const at = `sequence "${def.key || '?'}"`;
	if (!def.key.trim()) problems.push('sequence key must not be empty');
	if (!def.name.trim()) problems.push(`${at}: name must not be empty`);
	if (!(SEQUENCE_TRIGGER_KINDS as readonly string[]).includes(def.trigger?.kind)) {
		problems.push(`${at}: unknown trigger kind "${def.trigger?.kind}"`);
	}
	if (def.trigger.kind === 'quiz-completed' && !def.trigger.quizSlug.trim()) {
		problems.push(`${at}: quiz-completed trigger needs a quizSlug`);
	}
	if (def.steps.length === 0) problems.push(`${at}: needs at least one step`);
	def.steps.forEach((step, i) => {
		const stepAt = `${at} step ${i}`;
		if (!Number.isInteger(step.offsetDays) || step.offsetDays < 0) {
			problems.push(`${stepAt}: offsetDays must be a whole number >= 0`);
		}
		if (
			step.hourLocal !== undefined &&
			(!Number.isInteger(step.hourLocal) || step.hourLocal < 0 || step.hourLocal > 23)
		) {
			problems.push(`${stepAt}: hourLocal must be an hour 0-23`);
		}
		if (!(NURTURE_TEMPLATE_KEYS as readonly string[]).includes(step.templateKey)) {
			problems.push(`${stepAt}: unknown templateKey "${step.templateKey}"`);
		}
		if (step.cta?.url.includes('{{') && step.cta.url !== RESULT_URL_TOKEN) {
			problems.push(`${stepAt}: cta.url may only be the exact ${RESULT_URL_TOKEN} token or a plain URL`);
		}
		if (step.cta?.url === RESULT_URL_TOKEN && def.trigger.kind !== 'quiz-completed') {
			problems.push(`${stepAt}: ${RESULT_URL_TOKEN} needs a quiz-completed trigger`);
		}
		if (!step.subject.trim()) problems.push(`${stepAt}: subject must not be empty`);
		if (step.paragraphs.length === 0 || step.paragraphs.some((p) => !p.trim())) {
			problems.push(`${stepAt}: paragraphs must be non-empty`);
		}
	});
	return problems;
}
