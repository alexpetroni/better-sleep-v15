// BS-7 (review H-5): pre-phase the hook chain set ZERO security headers —
// no CSP, no frame-ancestors, no nosniff, no HSTS, no Referrer-Policy — so
// every assertion in this file fails against that behavior. The end-to-end
// proof (headers on a real public and admin response) lives in
// e2e/headers.e2e.ts; this spec pins the rules themselves.
import { describe, expect, it } from 'vitest';
import { securityHeaders } from './headers.ts';

describe('securityHeaders', () => {
	it('always sets the frame/nosniff/referrer/CSP family', () => {
		const headers = securityHeaders('https://bettersleep.ro');
		expect(headers['X-Content-Type-Options']).toBe('nosniff');
		expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['X-Frame-Options']).toBe('DENY');
		expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'none'");
		expect(headers['Content-Security-Policy-Report-Only']).toBe("default-src 'self'");
	});

	it('emits HSTS only for an https PUBLIC_SITE_URL', () => {
		expect(securityHeaders('https://bettersleep.ro')['Strict-Transport-Security']).toBe(
			'max-age=31536000; includeSubDomains'
		);
		// Never on http/localhost — a cached HSTS entry would break local dev,
		// and never when the URL is unset (boot rejects that anyway).
		expect(securityHeaders('http://localhost:5173')['Strict-Transport-Security']).toBeUndefined();
		expect(securityHeaders(undefined)['Strict-Transport-Security']).toBeUndefined();
	});
});
