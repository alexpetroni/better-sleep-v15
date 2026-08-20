import { defineConfig } from '@playwright/test';
import { E2E_STRIPE_WEBHOOK_SECRET, siteDatabaseUrl } from './e2e/env.ts';

// One preview server for the single betterSleep site; `pnpm test:e2e` builds
// first. EMAIL_DRYRUN, an EMPTY STRIPE_SECRET_KEY and the MOCK chat and
// courier providers are forced: an e2e run must never deliver real email,
// call Stripe, an LLM or a courier API.
// Analytics points at the app's OWN origin so nothing ever leaves localhost:
// the script URL 404s harmlessly except in analytics-consent.e2e.ts, which
// intercepts it to prove the consent gating end-to-end.
function siteEnv(siteId: 'sleep', port: number) {
	return {
		SITE_ID: siteId,
		DATABASE_URL: siteDatabaseUrl(siteId),
		EMAIL_DRYRUN: 'true',
		STRIPE_SECRET_KEY: '',
		STRIPE_WEBHOOK_SECRET: E2E_STRIPE_WEBHOOK_SECRET,
		CHAT_PROVIDER: 'mock',
		ANTHROPIC_API_KEY: '',
		COURIER_PROVIDER: 'mock',
		SAMEDAY_USERNAME: '',
		SAMEDAY_PASSWORD: '',
		SAMEDAY_PICKUP_POINT: '',
		PUBLIC_ANALYTICS_PROVIDER: 'plausible',
		PUBLIC_ANALYTICS_HOST: `http://localhost:${port}`,
		PUBLIC_ANALYTICS_SITE_ID: 'bettersleep.ro'
	};
}

// Every test starts with the cookie-consent banner already dismissed — a
// fixed bottom overlay would intercept clicks on footer forms in unrelated
// specs. The funnel spec clears cookies first to exercise the banner itself.
const consentDismissed = {
	cookies: [
		{
			name: 'cookie_consent',
			value: 'denied',
			domain: 'localhost',
			path: '/',
			expires: -1,
			httpOnly: false,
			secure: false,
			sameSite: 'Lax' as const
		}
	],
	origins: []
};

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	globalSetup: './e2e/global-setup.ts',
	projects: [
		{ name: 'sleep', use: { baseURL: 'http://localhost:4173', storageState: consentDismissed } }
	],
	webServer: [
		{
			command: 'npm run preview -- --port 4173 --strictPort',
			port: 4173,
			env: siteEnv('sleep', 4173),
			reuseExistingServer: false
		}
	]
});
