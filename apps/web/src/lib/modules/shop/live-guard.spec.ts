// BS-7 (review C-1/H-7): these guards did not exist pre-phase — a live env
// (EMAIL_DRYRUN=false) with no STRIPE_SECRET_KEY redirected customers to the
// mock's dead checkout.stripe.com URL, and the mock courier issued fake AWBs
// for real orders. Every "blocked" assertion here fails against that behavior.
import { describe, expect, it } from 'vitest';
import { isLiveEnv, mockAwbBlocked, mockCheckoutBlocked, stripeSyncEnabled } from './live-guard.ts';

describe('isLiveEnv', () => {
	it('only EMAIL_DRYRUN=false is live — unset and "true" are dev-shaped', () => {
		expect(isLiveEnv({})).toBe(false);
		expect(isLiveEnv({ EMAIL_DRYRUN: 'true' })).toBe(false);
		expect(isLiveEnv({ EMAIL_DRYRUN: 'false' })).toBe(true);
	});
});

describe('mockCheckoutBlocked', () => {
	it('blocks a keyless (mock gateway) checkout in a live env', () => {
		expect(mockCheckoutBlocked({ EMAIL_DRYRUN: 'false' })).toBe(true);
		// The e2e/dev shape: an explicitly EMPTY key still selects the mock.
		expect(mockCheckoutBlocked({ EMAIL_DRYRUN: 'false', STRIPE_SECRET_KEY: '' })).toBe(true);
	});

	it('never blocks dev/test (dry-run) envs — the mock is legitimate there', () => {
		expect(mockCheckoutBlocked({ EMAIL_DRYRUN: 'true' })).toBe(false);
		expect(mockCheckoutBlocked({})).toBe(false);
	});

	it('never blocks a real gateway, live or not', () => {
		expect(mockCheckoutBlocked({ EMAIL_DRYRUN: 'false', STRIPE_SECRET_KEY: 'sk_live_x' })).toBe(
			false
		);
		expect(mockCheckoutBlocked({ EMAIL_DRYRUN: 'true', STRIPE_SECRET_KEY: 'sk_test_x' })).toBe(
			false
		);
	});
});

// BS-7 (review H-8): pre-phase every admin save synced through whatever
// gateway was selected, so a keyless env wrote prod_mock_N ids into the DB.
describe('stripeSyncEnabled', () => {
	it('keyless (mock gateway) envs never sync — mock ids must not persist', () => {
		expect(stripeSyncEnabled({})).toBe(false);
		expect(stripeSyncEnabled({ STRIPE_SECRET_KEY: '' })).toBe(false);
	});

	it('any real key syncs, test or live', () => {
		expect(stripeSyncEnabled({ STRIPE_SECRET_KEY: 'sk_test_x' })).toBe(true);
		expect(stripeSyncEnabled({ STRIPE_SECRET_KEY: 'sk_live_x' })).toBe(true);
	});
});

describe('mockAwbBlocked', () => {
	it('blocks the mock courier (unset, empty or explicit) in a live env', () => {
		expect(mockAwbBlocked({ EMAIL_DRYRUN: 'false' })).toBe(true);
		expect(mockAwbBlocked({ EMAIL_DRYRUN: 'false', COURIER_PROVIDER: '' })).toBe(true);
		expect(mockAwbBlocked({ EMAIL_DRYRUN: 'false', COURIER_PROVIDER: 'mock' })).toBe(true);
	});

	it('never blocks dev/test envs or the real sameday adapter', () => {
		expect(mockAwbBlocked({ EMAIL_DRYRUN: 'true', COURIER_PROVIDER: 'mock' })).toBe(false);
		expect(mockAwbBlocked({ EMAIL_DRYRUN: 'false', COURIER_PROVIDER: 'sameday' })).toBe(false);
	});
});
