import { test, expect } from '@playwright/test';

/**
 * Per-instance DOM ids (R-9), on the dev route /dev/two-forms, which renders
 * two `MultiStepForm` instances of the minimal example (non-persisting
 * controllers, so nothing is shared between them).
 *
 * Every id — inputs, group wrappers, alerts — and every radio `name` is
 * prefixed with the instance's `$props.id()`, so two forms on one page (or a
 * host element with the same id) do not collide: each label resolves to its
 * own input, and each form validates on its own. Before, ids were the raw
 * question / group ids, so both "Full name" labels pointed at the first input
 * and the second form's Submit could ring the first form's group.
 */

test('/dev/two-forms: labels, ids and validation stay per form', async ({ page }) => {
	await page.goto('/dev/two-forms');
	await page.waitForLoadState('networkidle');

	const formA = page.getByRole('region', { name: 'Form A' });
	const formB = page.getByRole('region', { name: 'Form B' });
	await expect(formA).toBeVisible();
	await expect(formB).toBeVisible();

	// Both labels resolve, each to its own input
	await expect(page.getByLabel('Full name')).toHaveCount(2);
	const nameA = formA.getByLabel('Full name');
	const nameB = formB.getByLabel('Full name');
	await expect(nameA).toHaveCount(1);
	await expect(nameB).toHaveCount(1);

	// Typing in the second form leaves the first empty
	await nameB.fill('Second');
	await expect(nameB).toHaveValue('Second');
	await expect(nameA).toHaveValue('');

	// Clicking the second form's label focuses the second input (label → input association)
	await formB.getByText('Full name', { exact: true }).click();
	await expect(nameB).toBeFocused();
	await expect(nameA).not.toBeFocused();

	// Every [id] in the document is unique
	const duplicates = await page.evaluate(() => {
		const seen = new Map<string, number>();
		for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
		return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
	});
	expect(duplicates).toEqual([]);

	// Each form validates independently: Submit on the first shows one alert,
	// inside the first form, and its input points at that alert.
	await formA.getByRole('button', { name: 'Submit' }).click();
	await expect(page.getByRole('alert')).toHaveCount(1);
	const alertA = formA.getByRole('alert');
	await expect(alertA).toContainText('Please complete the required fields');
	await expect(formB.getByRole('alert')).toHaveCount(0);
	await expect(nameA).toHaveAttribute('aria-invalid', 'true');
	await expect(nameA).toHaveAttribute('aria-describedby', (await alertA.getAttribute('id'))!);
	await expect(nameB).not.toHaveAttribute('aria-invalid');
	await expect(nameB).not.toHaveAttribute('aria-describedby');
});
