import { test, expect } from '@playwright/test';

/**
 * Demo shell tests: the favicon is served from static/ (it used to ship inside
 * the package), and the home page renders the shared sleep-assessment example
 * (it used to inline a copy of the config).
 */

test('the demo serves the favicon referenced by the layout', async ({ page }) => {
	await page.goto('/');

	const href = await page.locator('link[rel="icon"]').getAttribute('href');
	expect(href).toBeTruthy();

	const res = await page.request.get(href!);
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('image/svg+xml');
	expect(await res.text()).toContain('<svg');
});

test('the home page renders the sleep-assessment example', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	await expect(page.getByRole('heading', { name: 'Better Sleep Assessment' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Progress' })).toContainText('Sleep Patterns');
	await expect(page.getByRole('heading', { name: 'Sleep Patterns' })).toBeVisible();
	await expect(page.getByLabel('Usual bedtime')).toBeVisible();
	await expect(page.getByLabel(/How long does it take you to fall asleep/)).toBeVisible();
});

test('the sleep-assessment example route renders the same form', async ({ page }) => {
	await page.goto('/examples/sleep-assessment');
	await page.waitForLoadState('networkidle');

	await expect(page.getByRole('heading', { name: 'Sleep assessment', exact: true })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Progress' })).toContainText('Sleep Patterns');
	await expect(page.getByRole('heading', { name: 'Sleep Patterns' })).toBeVisible();
	await expect(page.getByLabel('Usual bedtime')).toBeVisible();
});
