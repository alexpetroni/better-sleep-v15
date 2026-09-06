import { test, expect, type Page } from '@playwright/test';

/**
 * Honest validation and ARIA state (R-5, R-6, R-8):
 * - a malformed email is rejected through the UI with the invalid message and
 *   can be corrected in place (the number case lives in multi-step-form.spec.ts);
 * - a required question shows a visible marker that does not change its
 *   accessible name; an optional one shows none;
 * - in the warning group only the failing question carries aria-invalid (and
 *   the field ring driven by the same prop), described by the group's alert;
 * - radio-based inputs expose required/invalid state on their radiogroup
 *   (ARIA 1.2 has no aria-required / aria-invalid on the radio role), likert
 *   batches per row;
 * - a two-column group (layout.columns, formerly renderMode: 'inline' — now a
 *   deprecated alias of 'individual') gets the same per-question state;
 * - likert rows show the visible required marker in their statement cell.
 */

async function gotoExample(page: Page, slug: string) {
	await page.goto(`/examples/${slug}`);
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

test('conditional, Follow-up: a malformed email is rejected and can be corrected', async ({ page }) => {
	const payload = completedPayload(page);
	await gotoExample(page, 'conditional');
	const next = page.getByRole('button', { name: /Next|Submit/ });

	// "No" skips Trip Details and hides the budget group: Follow-up shows only the email
	await page.getByRole('radio', { name: 'No', exact: true }).check();
	await next.click();
	await expect(page.getByRole('heading', { name: 'Follow-up' })).toBeVisible();

	const email = page.getByLabel(/Email/);
	await expect(email).not.toHaveAttribute('aria-required'); // optional
	await email.fill('not-an-email');
	await next.click(); // Submit

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Please correct the highlighted answers in this section.');
	await expect(email).toHaveValue('not-an-email');
	await expect(email).toHaveAttribute('aria-invalid', 'true');
	await expect(email).toHaveAttribute('aria-describedby', (await alert.getAttribute('id'))!);
	await expect(email).not.toHaveAttribute('aria-required'); // invalid, still optional

	// Fixing the address lets the form submit
	await email.fill('jane@example.com');
	await next.click();
	expect((await payload)['follow-up']).toEqual({ email: 'jane@example.com' });
	await expect(page.getByRole('alert')).toBeHidden();
});

test('all-inputs: the required Name shows a marker that leaves its label intact; the optional Email shows none', async ({ page }) => {
	await gotoExample(page, 'all-inputs');

	// The canary: the exact-label lookup still resolves, so the marker is not
	// part of the label text — and the control is announced as required.
	const name = page.getByLabel('Name', { exact: true });
	await expect(name).toBeVisible();
	await expect(name).toHaveAttribute('aria-required', 'true');
	// The marker sits next to the label, inside the same field container
	await expect(name.locator('xpath=..').getByText('*', { exact: true })).toBeVisible();

	const email = page.getByLabel('Email', { exact: true });
	await expect(email).toBeVisible();
	await expect(email).not.toHaveAttribute('aria-required');
	await expect(email.locator('xpath=..').getByText('*', { exact: true })).toHaveCount(0);
	// The optional field's accessible name is exactly its label
	await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
});

test('customized: only the failing question in the warning group is marked invalid', async ({ page }) => {
	await gotoExample(page, 'customized');
	const next = page.getByRole('button', { name: 'Continue' });

	await page.locator('label').filter({ hasText: 'Playful' }).click();
	await next.click();
	await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();

	// Team size (max 500) out of range; the range next to it is valid
	const teamSize = page.getByLabel('Team size');
	const atLeast = page.getByLabel('At least');
	const atMost = page.getByLabel('At most');
	await expect(teamSize).toHaveAttribute('aria-required', 'true');
	await expect(atLeast).toHaveAttribute('aria-required', 'true');
	await expect(atMost).toHaveAttribute('aria-required', 'true');
	await teamSize.fill('600');
	await atLeast.fill('300');
	await atMost.fill('400');
	await next.click();

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('One of these values is out of the allowed range.');
	await expect(teamSize).toHaveValue('600'); // not clamped to 500
	await expect(teamSize).toHaveAttribute('aria-invalid', 'true');
	await expect(teamSize).toHaveAttribute('aria-describedby', (await alert.getAttribute('id'))!);
	await expect(atLeast).not.toHaveAttribute('aria-invalid');
	await expect(atMost).not.toHaveAttribute('aria-invalid');
	await expect(atLeast).not.toHaveAttribute('aria-describedby');
	await expect(atMost).not.toHaveAttribute('aria-describedby');

	// Correcting the number clears the block and reaches the summary
	await teamSize.fill('50');
	await next.click();
	await expect(page.getByRole('heading', { name: 'Check your answers before sending' })).toBeVisible();
});

test('conditional: a required radio question exposes required/invalid state on its radiogroup', async ({ page }) => {
	await gotoExample(page, 'conditional');
	const next = page.getByRole('button', { name: /Next|Submit/ });

	const traveling = page.getByRole('radiogroup', { name: 'Are you planning to travel this year?', exact: true });
	await expect(traveling).toBeVisible();
	await expect(traveling).toHaveAttribute('aria-required', 'true');
	await expect(traveling).not.toHaveAttribute('aria-invalid');

	await next.click();
	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Please complete the required fields');
	await expect(traveling).toHaveAttribute('aria-invalid', 'true');
	await expect(traveling).toHaveAttribute('aria-describedby', (await alert.getAttribute('id'))!);

	// Answering clears the field state right away (the group message stays until the next attempt)
	await page.getByRole('radio', { name: 'Yes' }).check();
	await expect(traveling).not.toHaveAttribute('aria-invalid');
	await expect(traveling).not.toHaveAttribute('aria-describedby');
	await expect(traveling).toHaveAttribute('aria-required', 'true');
});

const STATEMENTS = [
	'My work is meaningful to me.',
	'I feel supported by my manager.',
	'I have opportunities to grow.',
	'I would recommend this workplace to a friend.'
];

test('likert batch: every row is required and only the unanswered row is marked invalid', async ({ page }) => {
	await gotoExample(page, 'likert');
	const row = (statement: string) => page.getByRole('radiogroup', { name: statement, exact: true });
	const pick = async (statement: string, label: string) => {
		const radio = row(statement).getByRole('radio', { name: label, exact: true });
		await radio.locator('xpath=..').click(); // sr-only radio inside its label
		await expect(radio).toBeChecked();
	};

	for (const statement of STATEMENTS) {
		await expect(row(statement)).toHaveAttribute('aria-required', 'true');
		await expect(row(statement)).not.toHaveAttribute('aria-invalid');
		// A required row shows the visible marker in its statement cell; the
		// exact-name lookup above proves it does not leak into the row's name.
		await expect(row(statement).getByText('*', { exact: true })).toBeVisible();
	}

	await pick(STATEMENTS[0], 'Agree');
	await pick(STATEMENTS[1], 'Agree');
	await pick(STATEMENTS[3], 'Agree');
	await page.getByRole('button', { name: 'Submit' }).click();

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Please complete the required fields');
	await expect(row(STATEMENTS[2])).toHaveAttribute('aria-invalid', 'true');
	await expect(row(STATEMENTS[2])).toHaveAttribute('aria-describedby', (await alert.getAttribute('id'))!);
	for (const statement of [STATEMENTS[0], STATEMENTS[1], STATEMENTS[3]]) {
		await expect(row(statement)).not.toHaveAttribute('aria-invalid');
		await expect(row(statement)).not.toHaveAttribute('aria-describedby');
	}
});

test('sleep-assessment (home): failing questions of a two-column group carry aria-invalid and point at the alert', async ({ page }) => {
	// The first group of the home page form ("Sleep Schedule") is a two-column
	// layout.columns group (it used renderMode: 'inline', now a deprecated alias
	// of 'individual') with two required time inputs; its questions must get
	// the same per-question state as any individual group.
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bedtime = page.getByLabel('Usual bedtime');
	const waketime = page.getByLabel('Usual wake time');
	await expect(bedtime).toHaveAttribute('aria-required', 'true');
	await expect(waketime).toHaveAttribute('aria-required', 'true');
	await expect(bedtime).not.toHaveAttribute('aria-invalid');
	await expect(bedtime).not.toHaveAttribute('aria-describedby');

	await page.getByRole('button', { name: 'Next' }).click();
	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Please complete the required fields');
	const alertId = (await alert.getAttribute('id'))!;
	await expect(bedtime).toHaveAttribute('aria-invalid', 'true');
	await expect(bedtime).toHaveAttribute('aria-describedby', alertId);
	await expect(waketime).toHaveAttribute('aria-invalid', 'true');
	await expect(waketime).toHaveAttribute('aria-describedby', alertId);

	// Answering one of them clears its own state only; the other stays marked
	await bedtime.fill('22:30');
	await expect(bedtime).not.toHaveAttribute('aria-invalid');
	await expect(bedtime).not.toHaveAttribute('aria-describedby');
	await expect(waketime).toHaveAttribute('aria-invalid', 'true');
	await expect(waketime).toHaveAttribute('aria-describedby', alertId);
});
