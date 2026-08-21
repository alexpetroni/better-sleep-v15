import { expect, test } from '@playwright/test';

// BS-7 (review H-5): pre-phase NO security header existed on any response —
// /admin/login was frameable by any attacker page and the sanitized {@html}
// routes had no CSP backstop. Both cases here fail against that behavior.
// One public and one admin response, per the phase plan; the preview server
// runs on http://localhost, so HSTS must be absent (https-only by design —
// the unit spec covers the https branch).
for (const path of ['/', '/admin/login']) {
	test(`security headers are set on ${path}`, async ({ request }) => {
		const response = await request.get(path);
		expect(response.status()).toBe(200);
		const headers = response.headers();
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['x-frame-options']).toBe('DENY');
		expect(headers['content-security-policy']).toBe("frame-ancestors 'none'");
		expect(headers['content-security-policy-report-only']).toBe("default-src 'self'");
		expect(headers['strict-transport-security']).toBeUndefined();
	});
}
