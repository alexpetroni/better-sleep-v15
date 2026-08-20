import { expect, test } from '@playwright/test';
import { sleepSite } from '../src/lib/config/sites/sleep.ts';

// Single-site harness: the one 'sleep' playwright project targets the one
// preview server (SITE_ID=sleep) — see playwright.config.ts.
const site = sleepSite;

test('homepage shows the site name and the landing hero', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('header')).toContainText(site.name);
	await expect(page.getByTestId('landing-hero')).toBeVisible();
});

test('an active pillar has a landing page', async ({ page }) => {
	const slug = site.pillars[0];
	await page.goto(`/sanatate/${slug}`);
	await expect(page.getByTestId('pillar-title')).toBeVisible();
});

test('an unknown pillar renders the 404 page', async ({ page }) => {
	const response = await page.goto('/sanatate/nu-exista');
	expect(response?.status()).toBe(404);
	await expect(page.locator('h1')).toContainText('404');
});

test('an inactive canonical pillar 404s', async ({ page }) => {
	const response = await page.goto('/sanatate/finante');
	expect(response?.status()).toBe(404);
});
