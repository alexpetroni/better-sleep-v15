import { expect, test } from '@playwright/test';
import { ARCHETYPE_PAGES } from '../src/lib/modules/quiz/index.ts';
import { NIGHT_MAP_SKUS, NIGHT_SEGMENT_KEYS } from '../src/lib/modules/shop/index.ts';

// BS-5 landing gate: the ten deck blocks (and ONLY those — Authority and
// Testimonials are deliberately absent), the hero CTA into the quiz, the
// pattern grid's /tipuri links, the objection accordion, and no horizontal
// scroll on a small phone.

const BLOCKS = [
	'landing-hero',
	'landing-cost',
	'landing-patterns',
	'landing-reframe',
	'landing-steps',
	'landing-nightmap',
	'landing-proof',
	'landing-objections',
	'landing-risk',
	'landing-final-cta'
];

test('exactly the ten deck blocks render, in deck order', async ({ page }) => {
	await page.goto('/');
	const sections = page.locator('section[data-testid^="landing-"]');
	await expect(sections).toHaveCount(BLOCKS.length);
	// Order equality doubles as the absence proof for blocks 8 and 10: any
	// extra/placeholder section would break the array match.
	expect(await sections.evaluateAll((els) => els.map((el) => el.dataset.testid))).toEqual(BLOCKS);
});

test('hero primary CTA reaches the archetype quiz', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('hero-cta-primary').click();
	await expect(page).toHaveURL(/\/quiz\/arhetip-somn$/);
	await expect(page.locator('form').first()).toBeVisible();
});

test('hero secondary CTA scrolls to the three-steps block', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('hero-cta-secondary').click();
	await expect(page.getByTestId('landing-steps')).toBeInViewport();
});

test('each pattern card links only to real archetype pages and reaches one', async ({ page }) => {
	await page.goto('/');
	const validSlugs = new Set(ARCHETYPE_PAGES.map((p) => p.slug));
	const cards = page.locator('[data-testid="pattern-card"]');
	await expect(cards).toHaveCount(4);

	// Collect every card's chip hrefs up front (evaluateAll does not auto-wait,
	// so it must not race the re-render after goBack below).
	const perCard = await cards.evaluateAll((els) =>
		els.map((el) =>
			Array.from(el.querySelectorAll('[data-testid="pattern-archetype-link"]')).map((a) =>
				a.getAttribute('href')
			)
		)
	);
	for (const hrefs of perCard) {
		expect(hrefs.length).toBeGreaterThan(0);
		for (const href of hrefs) {
			expect(validSlugs.has(href!.split('/').pop()!), `${href} is not a /tipuri page`).toBe(true);
		}
	}

	// Click-through: each card's first archetype chip lands on its page.
	for (let i = 0; i < 4; i++) {
		const slug = perCard[i][0]!.split('/').pop()!;
		await cards.nth(i).locator('[data-testid="pattern-archetype-link"]').first().click();
		await expect(page).toHaveURL(new RegExp(`/tipuri/${slug}$`));
		await expect(page.getByTestId('archetype-name')).toBeVisible();
		await page.goBack();
	}
});

test('the night map names real seeded SKUs and every link resolves (BS-6)', async ({ page }) => {
	await page.goto('/');
	const links = page.locator('[data-testid="nightmap-sku-link"]');
	const expectedCount = NIGHT_SEGMENT_KEYS.reduce((n, key) => n + NIGHT_MAP_SKUS[key].length, 0);
	await expect(links).toHaveCount(expectedCount);

	// Each of the four segments names at least two SKUs, in segment order.
	const segments = page.locator('[data-testid="landing-nightmap"] ol > li');
	await expect(segments).toHaveCount(4);
	for (let i = 0; i < 4; i++) {
		const skus = NIGHT_MAP_SKUS[NIGHT_SEGMENT_KEYS[i]];
		const segmentLinks = segments.nth(i).locator('[data-testid="nightmap-sku-link"]');
		await expect(segmentLinks).toHaveCount(skus.length);
		await expect(segmentLinks.first()).toHaveText(skus[0].label);
	}

	// Every href is a live product page — the SKUs are really seeded.
	const hrefs = await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')!));
	for (const href of hrefs) {
		expect(href).toMatch(/^\/magazin\/[a-z0-9-]+$/);
		const response = await page.request.get(href);
		expect(response.status(), href).toBe(200);
	}

	// Click-through: the first ADORMIREA SKU lands on its shop page.
	await links.first().click();
	await expect(page).toHaveURL(new RegExp(`/magazin/${NIGHT_MAP_SKUS.adormirea[0].slug}$`));
	await expect(page.getByTestId('product-title')).toBeVisible();
});

test('the objection accordion opens', async ({ page }) => {
	await page.goto('/');
	const items = page.locator('[data-testid="objection-item"]');
	await expect(items).toHaveCount(4);
	const answer = items.first().locator('p');
	await expect(answer).toBeHidden();
	await items.first().locator('summary').click();
	await expect(answer).toBeVisible();
});

test.describe('small phone', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('no horizontal scroll at 360×740', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});
