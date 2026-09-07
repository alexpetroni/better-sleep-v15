import { test, expect, type Page } from '@playwright/test';

/**
 * SSR-safe hydration of persisted state (R-2).
 *
 * The server has no storage, so it always renders the first step. Persisted
 * answers must be applied *after* mount: the first client render then equals
 * the server render (hydration is clean — the server-rendered heading is
 * hydrated as-is and later replaced by the swap to the persisted step), and
 * the swap happens in an effect. Before the fix the client constructed the
 * state from storage during init and hydrated a different step over the
 * server DOM: the server-rendered heading was patched in place.
 *
 * Runs against the production preview, where Svelte repairs a mismatch
 * silently — so the test watches the heading node itself instead of the
 * console.
 */

const KEY = 'formcomp-example-conditional';

/** The example page's persisted entry (or null) — read inside the page. */
const storedEntry = (page: Page, key: string) => page.evaluate((k) => sessionStorage.getItem(k), key);

type SsrHeading = { text: string | null; node: HTMLElement };

/**
 * Keep a reference to the first <h2> the HTML parser produces — the
 * server-rendered step heading — before any page script runs. The observer
 * fires in a microtask, long before SvelteKit's dynamically imported client
 * bundle hydrates the page.
 */
function captureServerHeading(page: Page) {
	return page.addInitScript(() => {
		const w = window as unknown as { __ssrHeading?: SsrHeading };
		const observer = new MutationObserver(() => {
			const h2 = document.querySelector('h2');
			if (!h2) return;
			w.__ssrHeading = { text: h2.textContent, node: h2 };
			observer.disconnect();
		});
		observer.observe(document, { childList: true, subtree: true });
	});
}

/** Answer "Yes" + "Mountains" on the conditional example and advance to Trip Details. */
async function completeStepOne(page: Page) {
	await page.goto('/examples/conditional');
	await page.waitForLoadState('networkidle');
	await page.getByRole('radio', { name: 'Yes' }).check();
	await page.getByRole('checkbox', { name: 'Mountains' }).check();
	await page.getByRole('button', { name: /Next/ }).click();
	await expect(page.getByRole('heading', { name: 'Trip Details' })).toBeVisible();
	// The debounced save must have flushed before the reload.
	await expect.poll(() => storedEntry(page, KEY)).toContain('"currentStepIndex":1');
}

test('reload mid-form: the server renders step 1, hydration keeps it, the persisted step is swapped in after mount', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
	});
	await captureServerHeading(page);

	await completeStepOne(page);

	// (a) The raw response body of the reload is the server render: step 1,
	// because the server has no storage to read the persisted index from.
	const response = await page.reload({ waitUntil: 'commit' });
	const html = await response!.text();
	expect(html).toContain('Travel Preferences');
	expect(html).not.toContain('Trip Details');

	// (b) The hydrated DOM shows the persisted step.
	await expect(page.getByRole('heading', { name: 'Trip Details' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Travel Preferences' })).toBeHidden();
	await expect(page.getByLabel(/How many days will you travel/)).toBeVisible();

	// The server-rendered heading was hydrated unchanged and then *replaced*
	// when the effect swapped the step in. A hydration mismatch would have
	// patched its text to "Trip Details" in place and left it in the document.
	const serverHeading = await page.evaluate(() => {
		const captured = (window as unknown as { __ssrHeading?: SsrHeading }).__ssrHeading;
		return captured
			? { text: captured.text, textNow: captured.node.textContent, connected: captured.node.isConnected }
			: null;
	});
	expect(serverHeading).toEqual({ text: 'Travel Preferences', textNow: 'Travel Preferences', connected: false });

	// (c) Back → step 1 still carries the persisted answers.
	await page.getByRole('button', { name: 'Back' }).click();
	await expect(page.getByRole('heading', { name: 'Travel Preferences' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Mountains' })).toBeChecked();

	// (d) Nothing blew up along the way.
	expect(errors).toEqual([]);
});
