import { test, expect, type Page } from '@playwright/test';

/**
 * Browser tests for the lead-capture example (examples/lead-capture.ts):
 * email-format validation, the required `consent` checkbox, and the opt-in
 * honeypot (silent client-side drop + payload passthrough). New in 0.3.0.
 */

const submit = (page: Page) => page.getByRole('button', { name: 'Subscribe' });
const consent = (page: Page) => page.getByRole('checkbox', { name: /I agree to receive/ });

async function gotoForm(page: Page) {
	await page.goto('/examples/lead-capture');
	await page.waitForLoadState('networkidle');
}

test('malformed email blocks submission with the invalid message', async ({ page }) => {
	await page.route('**/api/lead-demo', (route) => route.fulfill({ json: {} }));
	page.on('dialog', (dialog) => dialog.accept());
	await gotoForm(page);

	await page.getByLabel('Email address').fill('jane@example');
	await consent(page).check();
	await submit(page).click();
	await expect(page.getByRole('alert')).toContainText('correct the highlighted answers');

	// Correcting the address clears the block and the form submits
	await page.getByLabel('Email address').fill('jane@example.com');
	await submit(page).click();
	await expect(page.getByRole('heading', { name: 'You are on the list!' })).toBeVisible();
});

test('unticked consent blocks submission with the required message', async ({ page }) => {
	await gotoForm(page);

	await page.getByLabel('Email address').fill('jane@example.com');
	await submit(page).click();
	await expect(page.getByRole('alert')).toContainText('Please complete the required fields');
	await expect(consent(page)).toBeVisible();
});

test('valid submission POSTs consent + empty honeypot in the payload', async ({ page }) => {
	let body: Record<string, unknown> | null = null;
	await page.route('**/api/lead-demo', (route) => {
		body = route.request().postDataJSON();
		return route.fulfill({ json: {} });
	});
	page.on('dialog', (dialog) => dialog.accept());

	await gotoForm(page);
	await page.getByLabel('Email address').fill('jane@example.com');
	await consent(page).check();
	await submit(page).click();

	await expect(page.getByRole('heading', { name: 'You are on the list!' })).toBeVisible();
	expect(body).toMatchObject({ honeypot: { field: 'website', value: '' } });
	const answers = (body! as { answers: Record<string, unknown>[] }).answers;
	expect(answers).toEqual([
		expect.objectContaining({ questionId: 'email', value: 'jane@example.com' }),
		expect.objectContaining({ questionId: 'gdpr_consent', value: true, displayValue: 'Yes' })
	]);
});

test('filled honeypot shows the success state without POSTing', async ({ page }) => {
	let requests = 0;
	await page.route('**/api/lead-demo', (route) => {
		requests++;
		return route.fulfill({ json: {} });
	});
	page.on('dialog', (dialog) => dialog.accept());

	await gotoForm(page);

	// The honeypot is off-screen but present in the DOM and not display:none
	const honeypot = page.locator('input[name="website"]');
	await expect(honeypot).toBeAttached();
	await expect(honeypot).toHaveAttribute('tabindex', '-1');
	await expect(honeypot).toHaveAttribute('autocomplete', 'off');

	await page.getByLabel('Email address').fill('bot@example.com');
	await consent(page).check();
	// Fill the hidden field the way a naive bot would
	await honeypot.evaluate((el) => {
		(el as HTMLInputElement).value = 'gotcha';
		el.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await submit(page).click();

	// Indistinguishable from success — but nothing was sent
	await expect(page.getByRole('heading', { name: 'You are on the list!' })).toBeVisible();
	expect(requests).toBe(0);
});
