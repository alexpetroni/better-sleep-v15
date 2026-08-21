/**
 * Runtime backstop for the mock-by-default providers (review C-1/H-7): the
 * launch preflight refuses a live env on mocks, but a deploy that skipped it
 * must STILL never let a mock face a customer. `EMAIL_DRYRUN=false` is the
 * platform's "this env is live" signal (the same one launch-check.ts and
 * boot.ts key on); dev, vitest and e2e all run dry, so the guards are inert
 * everywhere the mocks are legitimate.
 *
 * Pure (env passed in) so the rules are unit-testable offline.
 */

export interface LiveGuardEnv {
	EMAIL_DRYRUN?: string;
	STRIPE_SECRET_KEY?: string;
	COURIER_PROVIDER?: string;
}

/** The live signal, shared by both guards below. */
export function isLiveEnv(env: LiveGuardEnv): boolean {
	return env.EMAIL_DRYRUN === 'false';
}

/**
 * True when checkout must be refused: the mock gateway is selected (no
 * STRIPE_SECRET_KEY — see getStripeGateway) in a live env. Without this, the
 * cart action 303s real customers to the mock's fake checkout.stripe.com URL.
 */
export function mockCheckoutBlocked(env: LiveGuardEnv): boolean {
	return isLiveEnv(env) && !env.STRIPE_SECRET_KEY;
}

/**
 * True when AWB generation must be refused: the mock courier is selected
 * (COURIER_PROVIDER unset or `mock` — see selectCourierProvider) in a live
 * env. Without this, real paid orders get deterministic fake AWBs mailed to
 * customers as tracking numbers.
 */
export function mockAwbBlocked(env: LiveGuardEnv): boolean {
	return isLiveEnv(env) && (env.COURIER_PROVIDER?.trim() || 'mock') === 'mock';
}
