/**
 * The progress header's <nav> landmark is named by `settings.progressLabel`
 * (default 'Progress'), and the label goes through `translate` like every
 * other built-in string (R-22). Rendered server-side: the label is static
 * markup, so the SSR output is enough and needs no DOM.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import MultiStepForm from '../../src/lib/components/core/MultiStepForm.svelte';
import ProgressBar from '../../src/lib/components/layout/ProgressBar.svelte';
import type { FormConfig, StepConfig } from '../../src/lib/types.js';

const steps: StepConfig[] = [
	{ id: 'a', label: 'step.a', groups: [{ id: 'ga', label: 'G', questions: [{ id: 'qa', type: 'text-input', label: 'Q' }] }] },
	{ id: 'b', label: 'step.b', groups: [{ id: 'gb', label: 'G', questions: [{ id: 'qb', type: 'text-input', label: 'Q' }] }] }
];

/** aria-label of the first <nav> in the markup, or undefined when there is none. */
const navLabel = (html: string) => html.match(/<nav\b[^>]*\baria-label="([^"]*)"/)?.[1];

describe('progress landmark label', () => {
	it('defaults to "Progress"', () => {
		const config: FormConfig = { steps };
		const { body } = render(MultiStepForm, { props: { config } });
		expect(navLabel(body)).toBe('Progress');
	});

	it('settings.progressLabel is passed through translate', () => {
		const config: FormConfig = { steps, settings: { progressLabel: 'progress.label' } };
		const translate = (key: string) => ({ 'progress.label': 'Fortschritt' })[key] ?? key;
		const { body } = render(MultiStepForm, { props: { config, translate } });
		expect(navLabel(body)).toBe('Fortschritt');
	});

	it('the default label is translated too', () => {
		const config: FormConfig = { steps };
		const translate = (key: string) => (key === 'Progress' ? 'Fortschritt' : key);
		const { body } = render(MultiStepForm, { props: { config, translate } });
		expect(navLabel(body)).toBe('Fortschritt');
	});

	it('ProgressBar standalone: the label prop names the nav, identity translate fallback', () => {
		const { body } = render(ProgressBar, { props: { steps, currentIndex: 0, label: 'Where you are' } });
		expect(navLabel(body)).toBe('Where you are');
		expect(navLabel(render(ProgressBar, { props: { steps, currentIndex: 0 } }).body)).toBe('Progress');
	});
});
