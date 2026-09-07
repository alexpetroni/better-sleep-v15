import { test, expect, type Page } from '@playwright/test';

/**
 * Browser tests for likert questions: the `likert` example (a likert-batch of
 * four statements) and the standalone likert question in `all-inputs`.
 *
 * Accessibility contract (R-7): every radio is named by its option label at
 * every viewport (on desktop the label text is sr-only, never display:none),
 * each statement row is a radiogroup named by its statement, the radios of a
 * row share one `name` so arrow keys stay within the row, and the desktop
 * header row is aria-hidden. Standalone rendering (R-1): a likert question in
 * a default group renders a one-row scale that can be answered.
 */

const STATEMENTS = [
	'My work is meaningful to me.',
	'I feel supported by my manager.',
	'I have opportunities to grow.',
	'I would recommend this workplace to a friend.'
];

const row = (page: Page, statement: string) => page.getByRole('radiogroup', { name: statement, exact: true });
const radio = (page: Page, statement: string, label: string) =>
	row(page, statement).getByRole('radio', { name: label, exact: true });
/**
 * Select an option by statement and option label. The radio is located by
 * role and accessible name; like the scale and card options it is sr-only
 * inside its label, so the click goes to that wrapping label.
 */
async function pick(page: Page, statement: string, label: string) {
	await radio(page, statement, label).locator('xpath=..').click();
	await expect(radio(page, statement, label)).toBeChecked();
}
const submit = (page: Page) => page.getByRole('button', { name: 'Submit' });

async function gotoLikert(page: Page) {
	await page.goto('/examples/likert');
	await page.waitForLoadState('networkidle');
}

/** Resolves with the `allResponses` the example page logs from onFormComplete. */
function completedPayload(page: Page) {
	page.on('dialog', (dialog) => dialog.accept());
	return new Promise<Record<string, Record<string, unknown>>>((resolve) => {
		page.on('console', async (msg) => {
			if (msg.text().startsWith('Form completed!')) {
				resolve((await msg.args()[1].jsonValue()) as Record<string, Record<string, unknown>>);
			}
		});
	});
}

test('likert rows are radiogroups named by their statement, radios by their option label', async ({ page }) => {
	await gotoLikert(page);
	// Playwright's default viewport is the desktop layout (>= sm), where the
	// option label text is visually hidden and a bullet is shown instead.
	expect(page.viewportSize()!.width).toBeGreaterThanOrEqual(640);

	await expect(page.getByRole('radiogroup')).toHaveCount(STATEMENTS.length);
	for (const statement of STATEMENTS) {
		await expect(row(page, statement)).toBeVisible();
		await expect(row(page, statement).getByRole('radio')).toHaveCount(5);
		await expect(radio(page, statement, 'Strongly disagree')).toBeAttached();
		await expect(radio(page, statement, 'Strongly agree')).toBeAttached();
	}
	await expect(page.getByRole('radio', { name: 'Strongly agree', exact: true })).toHaveCount(4);
	await expect(page.getByRole('radio', { name: '•' })).toHaveCount(0);

	// The desktop scale header is visible but hidden from assistive technology
	await expect(page.locator('[aria-hidden="true"]', { hasText: 'Strongly disagree' })).toBeVisible();
});

test('one option per row, then Submit completes the form', async ({ page }) => {
	const payload = completedPayload(page);
	await gotoLikert(page);

	await pick(page, STATEMENTS[0], 'Strongly disagree');
	await pick(page, STATEMENTS[1], 'Neutral');
	await pick(page, STATEMENTS[2], 'Agree');
	await pick(page, STATEMENTS[3], 'Strongly agree');

	await expect(radio(page, STATEMENTS[2], 'Agree')).toBeChecked();
	await expect(radio(page, STATEMENTS[2], 'Strongly agree')).not.toBeChecked();

	await submit(page).click();
	expect(await payload).toEqual({
		'job-satisfaction': { meaningful: '1', supported: '3', growth: '4', recommend: '5' }
	});
});

test('arrow keys move within a row only (the radios of a row share one name)', async ({ page }) => {
	await gotoLikert(page);

	await pick(page, STATEMENTS[0], 'Neutral');
	await pick(page, STATEMENTS[1], 'Disagree');
	await radio(page, STATEMENTS[0], 'Neutral').focus();
	await page.keyboard.press('ArrowRight');

	await expect(radio(page, STATEMENTS[0], 'Agree')).toBeChecked();
	await expect(radio(page, STATEMENTS[0], 'Agree')).toBeFocused();
	await expect(radio(page, STATEMENTS[1], 'Disagree')).toBeChecked();
});

test('an unanswered row blocks Submit with an alert', async ({ page }) => {
	await gotoLikert(page);

	await pick(page, STATEMENTS[0], 'Agree');
	await pick(page, STATEMENTS[1], 'Agree');
	await pick(page, STATEMENTS[3], 'Agree');
	await submit(page).click();

	await expect(page.getByRole('alert')).toContainText('Please complete the required fields');
	await expect(row(page, STATEMENTS[2])).toBeVisible();
});

test.describe('mobile viewport', () => {
	test.use({ viewport: { width: 400, height: 800 } });

	test('radios keep their option-label names and the scale header is not shown', async ({ page }) => {
		await gotoLikert(page);

		await expect(page.getByRole('radiogroup')).toHaveCount(STATEMENTS.length);
		await expect(page.getByRole('radio', { name: 'Strongly agree', exact: true })).toHaveCount(4);
		await expect(radio(page, STATEMENTS[1], 'Disagree')).toBeAttached();
		await expect(page.locator('[aria-hidden="true"]', { hasText: 'Strongly disagree' })).toBeHidden();
	});
});

test('all-inputs: a standalone likert renders on its step and is listed in the summary', async ({ page }) => {
	const statement = 'I would like to work remotely more often.';
	page.on('dialog', (dialog) => dialog.accept());
	await page.goto('/examples/all-inputs');
	await page.waitForLoadState('networkidle');
	const next = page.getByRole('button', { name: /Next|Submit/ });

	await page.getByLabel('Name', { exact: true }).fill('Ada');
	await next.click();

	// Choice step: the standalone likert shows its scale header and one row
	await expect(page.getByRole('heading', { name: 'Likert — single statement' })).toBeVisible();
	await expect(row(page, statement)).toBeVisible();
	await expect(row(page, statement).getByRole('radio')).toHaveCount(5);
	await expect(page.locator('[aria-hidden="true"]', { hasText: 'Strongly disagree' })).toBeVisible();
	await pick(page, statement, 'Strongly agree');

	await page.getByRole('radio', { name: 'Engineer' }).check();
	await page.locator('label').filter({ hasText: 'Free' }).click();
	await page.getByLabel('Country').selectOption('pt');
	await page.getByRole('checkbox', { name: 'Reading' }).check();
	await next.click();

	await page.getByLabel('Height').fill('170');
	await page.getByLabel('Weight').fill('70');
	await page.locator('label').filter({ hasText: /^\s*8\s*$/ }).click();
	await page.getByLabel('At least').fill('1000');
	await page.getByLabel('At most').fill('3000');
	await page.getByLabel('Workday start').fill('09:00');
	await page.getByLabel('Workday end').fill('17:00');
	await page.getByLabel('Available from').fill('2026-08-01');
	await next.click();

	// Summary: the statement with the chosen option's label, not its value
	await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
	const summaryRow = page.locator('dl > div', { hasText: statement });
	await expect(summaryRow).toBeVisible();
	await expect(summaryRow.locator('dd')).toHaveText('Strongly agree');
});
