import { test, expect, type Page } from '@playwright/test';

/**
 * Callback edges (R-23): `onStepChange` fires only when the step index
 * actually changed, and `onStepComplete` fires exactly once per completed
 * step. The example page logs `Step completed: <id> (index: n)` and
 * `Step changed: a → b` from the two callbacks.
 */

/** Collect the example page's `Step …` console lines, in order. */
function captureStepLogs(page: Page) {
	const lines: string[] = [];
	page.on('console', (msg) => {
		const text = msg.text();
		if (text.startsWith('Step ')) lines.push(text);
	});
	return lines;
}

test('conditional: an invalid Next logs nothing; a valid Next logs one Step completed and one Step changed', async ({ page }) => {
	const lines = captureStepLogs(page);
	await page.goto('/examples/conditional');
	await page.waitForLoadState('networkidle');
	const next = page.getByRole('button', { name: /Next|Submit/ });

	// Empty required question: the step is blocked, no callback fires
	await next.click();
	await expect(page.getByRole('alert')).toContainText('Please complete the required fields');
	expect(lines).toEqual([]);

	// "Not sure yet" skips Trip Details: 0 → 2, completed once, changed once
	await page.getByRole('radio', { name: 'Not sure yet' }).check();
	await page.getByRole('checkbox', { name: 'City break' }).check();
	await next.click();
	await expect(page.getByRole('heading', { name: 'Follow-up' })).toBeVisible();
	expect(lines).toEqual(['Step completed: travel (index: 0)', 'Step changed: 0 → 2']);
});

test('all-inputs summary: Edit on the current step fires no onStepChange; Edit on an earlier step fires it once', async ({ page }) => {
	const lines = captureStepLogs(page);
	await page.goto('/examples/all-inputs');
	await page.waitForLoadState('networkidle');
	const next = page.getByRole('button', { name: /Next|Submit/ });

	// Fill the three steps (see the summary test in multi-step-form.spec.ts)
	await page.getByLabel('Name', { exact: true }).fill('Ada');
	await next.click();
	await page.getByRole('radio', { name: 'Engineer' }).check();
	await page.locator('label').filter({ hasText: 'Free' }).click();
	await page.getByLabel('Country').selectOption('pt');
	await page.getByRole('checkbox', { name: 'Reading' }).check();
	await next.click();
	await page.getByLabel('Height').fill('170');
	await page.getByLabel('Weight').fill('70');
	await page.locator('label').filter({ hasText: /^\s*8\s*$/ }).click();
	await page.getByLabel('At least').fill('2000');
	await page.getByLabel('At most').fill('3000');
	await page.getByLabel('Workday start').fill('09:00');
	await page.getByLabel('Workday end').fill('17:00');
	await page.getByLabel('Available from').fill('2026-08-01');
	await next.click();
	await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
	expect(lines).toEqual([
		'Step completed: text (index: 0)',
		'Step changed: 0 → 1',
		'Step completed: choice (index: 1)',
		'Step changed: 1 → 2',
		'Step completed: numbers-and-time (index: 2)'
	]);

	// The summary sits on the last step's index. Editing that step is not a
	// step change: the index stays 2, so onStepChange must not fire.
	lines.length = 0;
	await page.getByRole('button', { name: 'Edit' }).last().click();
	await expect(page.getByRole('heading', { name: 'Numbers & Time' })).toBeVisible();
	expect(lines).toEqual([]);

	// Next returns to the summary: the step completes once more, still no change
	await next.click();
	await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
	expect(lines).toEqual(['Step completed: numbers-and-time (index: 2)']);

	// Editing the first step is a real change: 2 → 0, exactly once
	lines.length = 0;
	await page.getByRole('button', { name: 'Edit' }).first().click();
	await expect(page.getByRole('heading', { name: 'Text', exact: true })).toBeVisible();
	expect(lines).toEqual(['Step changed: 2 → 0']);
});
