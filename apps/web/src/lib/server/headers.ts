/**
 * Security headers for EVERY response, applied by the `handleHeaders` hook in
 * hooks.server.ts (review H-5). One hook covers both deploy targets — no
 * proxy or vercel.json config to keep in sync.
 *
 * - nosniff + Referrer-Policy: hygiene with no known consumer to break.
 * - X-Frame-Options DENY + CSP `frame-ancestors 'none'`: nothing on the site
 *   is meant to be embedded, and /admin/login must not be clickjackable.
 * - HSTS only when PUBLIC_SITE_URL is https (the deploy's own signal — never
 *   on localhost, where it would poison the browser's HSTS cache).
 * - A REPORT-ONLY `default-src 'self'` CSP as the starting point toward an
 *   enforced policy: the site renders sanitized `{@html}` on five public
 *   routes, so an eventual enforced CSP is the backstop against a sanitizer
 *   bypass. Report-only cannot break anything.
 *
 * Pure (the URL is passed in) so the rules are unit-testable offline.
 */
export function securityHeaders(publicSiteUrl: string | undefined): Record<string, string> {
	const headers: Record<string, string> = {
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'X-Frame-Options': 'DENY',
		'Content-Security-Policy': "frame-ancestors 'none'",
		'Content-Security-Policy-Report-Only': "default-src 'self'"
	};
	if (publicSiteUrl?.startsWith('https://')) {
		headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
	}
	return headers;
}
