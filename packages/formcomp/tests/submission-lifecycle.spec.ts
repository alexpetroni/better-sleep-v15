import { test, expect, type Page } from '@playwright/test';

/**
 * Submission lifecycle (R-3, R-4, R-26):
 * - after a successful submission of any kind — POST 2xx, server redirect,
 *   callback transport, honeypot drop — the persisted entry is removed, so a
 *   reload lands on an empty first step instead of the filled last step with
 *   Submit one click away from a duplicate POST;
 * - without `config.submit`, `onFormComplete` is the transport: Submit is
 *   busy while its promise is pending, then the built-in success screen
 *   shows; a rejection shows the submit error, keeps the answers and the
 *   retry calls `onFormComplete` again;
 * - a non-2xx POST reaches `onSubmitError` as a `SubmitError` carrying the
 *   status and the parsed body.
 *
 * The example page (src/routes/examples/[slug]/+page.svelte) returns a ~300 ms
 * promise from onFormComplete, rejects the first call when the URL carries
 * `?fail=once`, and logs `Submit failed <status> <data>` from onSubmitError.
 */

const MINIMAL_KEY = 'formcomp-example-minimal';
const CONDITIONAL_KEY = 'formcomp-example-conditional';
const LEAD_KEY = 'formcomp-example-lead-capture';

/** The example page's persisted entry (or null) — read inside the page. */
const storedEntry = (page: Page, key: string) => page.evaluate((k) => sessionStorage.getItem(k), key);

const submit = (page: Page) => page.getByRole('button', { name: /Next|Submit/ });

/** Accept the demo's alert() dialogs and count the `Form completed!` console lines. */
function trackCompletions(page: Page) {
	const seen = { count: 0 };
	page.on('dialog', (dialog) => dialog.accept());
	page.on('console', (msg) => {
		if (msg.text().startsWith('Form completed!')) seen.count++;
	});
	return seen;
}

/** Fill the minimal example and wait until the answers are actually persisted. */
async function fillMinimal(page: Page) {
	await page.goto('/examples/minimal');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Full name').fill('Jane Doe');
	await page.getByLabel(/What would you like to say/).fill('Hello');
	await expect.poll(() => storedEntry(page, MINIMAL_KEY)).toContain('Jane Doe');
}

/** Answer "No" on the conditional example and move to Follow-up. */
async function fillConditionalNoPath(page: Page, url = '/examples/conditional') {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
	await page.getByRole('radio', { name: 'No', exact: true }).check();
	await page.getByLabel(/keeping you from traveling/).fill('Work');
	await submit(page).click(); // Next → Follow-up (Trip Details is skipped)
	await expect(page.getByRole('heading', { name: 'Follow-up' })).toBeVisible();
	await page.getByLabel(/Email/).fill('jane@example.com');
	await expect.poll(() => storedEntry(page, CONDITIONAL_KEY)).toContain('jane@example.com');
}

test('minimal, POST 2xx: the persisted entry is removed and a reload lands on an empty first step', async ({ page }) => {
	await page.route('**/api/minimal-demo', (route) => route.fulfill({ json: { ok: true } }));
	trackCompletions(page);
	await fillMinimal(page);

	await submit(page).click();
	await expect(page.getByRole('heading', { name: 'Message sent!' })).toBeVisible();
	await expect(page.getByText('Thanks for reaching out')).toBeVisible();
	expect(await storedEntry(page, MINIMAL_KEY)).toBeNull();

	// Wait out the debounce window: a save scheduled before the reset must not resurrect the entry
	await page.waitForTimeout(500);
	expect(await storedEntry(page, MINIMAL_KEY)).toBeNull();

	await page.reload();
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
	await expect(page.getByLabel('Full name')).toHaveValue('');
	await expect(page.getByLabel(/What would you like to say/)).toHaveValue('');
	await expect(submit(page)).toBeEnabled();
	expect(await storedEntry(page, MINIMAL_KEY)).toBeNull();
});

test('minimal, server redirectUrl: the persisted entry is removed before navigating away', async ({ page }) => {
	await page.route('**/api/minimal-demo', (route) => route.fulfill({ json: { redirectUrl: '/examples' } }));
	trackCompletions(page);
	await fillMinimal(page);

	await submit(page).click();
	await page.waitForURL('**/examples');
	expect(await storedEntry(page, MINIMAL_KEY)).toBeNull();

	// Coming back to the form finds it empty
	await page.goto('/examples/minimal');
	await page.waitForLoadState('networkidle');
	await expect(page.getByLabel('Full name')).toHaveValue('');
	await expect(page.getByLabel(/What would you like to say/)).toHaveValue('');
	expect(await storedEntry(page, MINIMAL_KEY)).toBeNull();
});

test('conditional (no submit endpoint): Submit is busy while onFormComplete is pending, then the success screen shows and the state is cleared', async ({ page }) => {
	const completions = trackCompletions(page);
	await fillConditionalNoPath(page);

	await submit(page).click();

	// The callback is the transport: busy while its promise is pending…
	await expect(submit(page)).toBeDisabled();
	await expect(submit(page)).toHaveAttribute('aria-busy', 'true');

	// …then the built-in success screen replaces the form
	await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
	await expect(page.getByText('Your answers have been submitted.')).toBeVisible();
	await expect(submit(page)).toBeHidden();
	expect(completions.count).toBe(1);
	expect(await storedEntry(page, CONDITIONAL_KEY)).toBeNull();

	await page.waitForTimeout(500);
	await page.reload();
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'Travel Preferences' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'No', exact: true })).not.toBeChecked();
	await expect(page.getByRole('radio', { name: 'Yes' })).not.toBeChecked();
	await expect(page.getByRole('radio', { name: 'Not sure yet' })).not.toBeChecked();
	await expect(page.getByLabel(/keeping you from traveling/)).toBeHidden();
	expect(await storedEntry(page, CONDITIONAL_KEY)).toBeNull();
});

test('conditional?fail=once: a rejected onFormComplete shows the submit error, keeps the answers, and the retry calls it again', async ({ page }) => {
	const completions = trackCompletions(page);
	await fillConditionalNoPath(page, '/examples/conditional?fail=once');

	await submit(page).click();
	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Something went wrong while submitting. Please try again.');
	await expect(submit(page)).toBeEnabled();
	await expect(submit(page)).not.toHaveAttribute('aria-busy');
	await expect(page.getByRole('heading', { name: 'Follow-up' })).toBeVisible();
	await expect(page.getByLabel(/Email/)).toHaveValue('jane@example.com');
	expect(completions.count).toBe(1);
	// Nothing was reset
	expect(await storedEntry(page, CONDITIONAL_KEY)).toContain('jane@example.com');
	expect(await storedEntry(page, CONDITIONAL_KEY)).toContain('Work');

	// Retry: onFormComplete runs again and this time succeeds
	await submit(page).click();
	await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
	expect(completions.count).toBe(2);
	expect(await storedEntry(page, CONDITIONAL_KEY)).toBeNull();
});

test('minimal, POST 500: onSubmitError receives a SubmitError with the status and the parsed body', async ({ page }) => {
	await page.route('**/api/minimal-demo', (route) =>
		route.fulfill({ status: 500, json: { message: 'Server exploded' } })
	);
	trackCompletions(page);
	const failure = new Promise<{ status: unknown; data: unknown }>((resolve) => {
		page.on('console', async (msg) => {
			if (msg.text().startsWith('Submit failed')) {
				const [, status, data] = await Promise.all(msg.args().map((arg) => arg.jsonValue()));
				resolve({ status, data });
			}
		});
	});
	await fillMinimal(page);

	await submit(page).click();
	await expect(page.getByRole('alert')).toContainText('Server exploded');
	expect(await failure).toEqual({ status: 500, data: { message: 'Server exploded' } });

	// A failed POST resets nothing: the answers and the entry are intact for the retry
	await expect(page.getByLabel('Full name')).toHaveValue('Jane Doe');
	await expect(submit(page)).toBeEnabled();
	expect(await storedEntry(page, MINIMAL_KEY)).toContain('Jane Doe');
});

test('lead-capture, filled honeypot: the silent drop also clears the persisted entry', async ({ page }) => {
	let requests = 0;
	await page.route('**/api/lead-demo', (route) => {
		requests++;
		return route.fulfill({ json: {} });
	});
	trackCompletions(page);
	await page.goto('/examples/lead-capture');
	await page.waitForLoadState('networkidle');

	await page.getByLabel('Email address').fill('bot@example.com');
	await page.getByRole('checkbox', { name: /I agree to receive/ }).check();
	await expect.poll(() => storedEntry(page, LEAD_KEY)).toContain('bot@example.com');
	// Fill the off-screen field the way a naive bot would (it is aria-hidden, hence no role)
	await page.locator('input[name="website"]').evaluate((el) => {
		(el as HTMLInputElement).value = 'gotcha';
		el.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await page.getByRole('button', { name: 'Subscribe' }).click();

	await expect(page.getByRole('heading', { name: 'You are on the list!' })).toBeVisible();
	expect(requests).toBe(0);
	expect(await storedEntry(page, LEAD_KEY)).toBeNull();
	await page.waitForTimeout(500);
	expect(await storedEntry(page, LEAD_KEY)).toBeNull();
});
