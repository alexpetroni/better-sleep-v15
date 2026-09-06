import { test, expect, type Page } from '@playwright/test';

/**
 * Keyboard-reachable field tooltip (R-8).
 *
 * The info icon next to a label is a real `<button>` named by the tooltip
 * text: it is in the tab order, Enter toggles a visible description element
 * (`aria-expanded` + `aria-controls`), Escape closes it, and activating it
 * neither moves focus into the field nor acts on the labelled control.
 * Before, the icon was a title-only span that keyboard and touch users never
 * saw. The hover `title` stays for mouse users.
 */

const TOOLTIP = 'First and last name, as on official documents.';

async function gotoAllInputs(page: Page) {
	await page.goto('/examples/all-inputs');
	await page.waitForLoadState('networkidle');
}

/** The element the tooltip button points at with aria-controls. */
async function controlledDescription(page: Page, button: ReturnType<Page['getByRole']>) {
	const id = await button.getAttribute('aria-controls');
	expect(id).toBeTruthy();
	return page.locator(`[id="${id}"]`);
}

test('all-inputs: the Name tooltip is a focusable button; Enter reveals the description, Escape and a second Enter hide it', async ({ page }) => {
	await gotoAllInputs(page);

	const button = page.getByRole('button', { name: /official documents/ });
	const name = page.getByLabel('Name', { exact: true });
	await expect(button).toBeVisible();
	await expect(button).toHaveAttribute('aria-expanded', 'false');
	await expect(button).toHaveAttribute('title', TOOLTIP);
	const description = await controlledDescription(page, button);
	await expect(description).toBeHidden();

	// Reachable by keyboard
	await button.focus();
	await expect(button).toBeFocused();

	// Enter shows the description text; focus stays on the button, not in the Name input
	await button.press('Enter');
	await expect(button).toHaveAttribute('aria-expanded', 'true');
	await expect(description).toBeVisible();
	await expect(description).toHaveText(TOOLTIP);
	await expect(page.getByText(TOOLTIP, { exact: true })).toBeVisible();
	await expect(button).toBeFocused();
	await expect(name).not.toBeFocused();

	// Escape hides it
	await button.press('Escape');
	await expect(button).toHaveAttribute('aria-expanded', 'false');
	await expect(description).toBeHidden();

	// A second activation toggles it off again
	await button.press('Enter');
	await expect(description).toBeVisible();
	await button.press('Enter');
	await expect(description).toBeHidden();
	await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('all-inputs: clicking the tooltip button opens the description without touching the Name input', async ({ page }) => {
	await gotoAllInputs(page);

	const button = page.getByRole('button', { name: /official documents/ });
	const name = page.getByLabel('Name', { exact: true });
	await name.fill('Ada');

	await button.click();
	await expect(button).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(TOOLTIP, { exact: true })).toBeVisible();
	// The button is interactive content of its own: the click neither focuses
	// nor changes the labelled input.
	await expect(name).not.toBeFocused();
	await expect(name).toHaveValue('Ada');

	// The description is not part of the label: the exact-name lookups still resolve
	await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Ada');

	await button.click();
	await expect(button).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByText(TOOLTIP, { exact: true })).toBeHidden();
});
