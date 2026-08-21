import { describe, expect, it } from 'vitest';
import { GatewayResourceMissingError } from './gateway.ts';
import { createStripeGateway } from './stripe-gateway.ts';

// Audit Theme C (resilience #3): Stripe calls must be bounded. Before the fix
// the client was constructed bare — stripe-node's 80s default timeout with
// retries on top, so a hung socket pinned checkout/webhook requests.
describe('createStripeGateway timeouts', () => {
	/** A fetch whose request never completes, but that honors its abort signal. */
	const hangingFetch: typeof fetch = (_url, init) =>
		new Promise((_resolve, reject) => {
			init?.signal?.addEventListener('abort', () => reject((init!.signal as AbortSignal).reason));
		});

	it('fails within the configured timeout when Stripe never responds', async () => {
		const gateway = createStripeGateway('sk_test_not_real', {
			timeoutMs: 50,
			maxNetworkRetries: 0,
			fetchFn: hangingFetch
		});
		await expect(gateway.getPrice('price_x')).rejects.toThrow(/timeout|ETIMEDOUT|connection/i);
	}, 3_000);
});

// BS-7 (review H-8): pre-phase, Stripe's `resource_missing` surfaced as a raw
// StripeInvalidRequestError, so sync.ts could not tell "the stored id no
// longer exists — create fresh" from a genuine gateway failure.
describe('createStripeGateway resource_missing translation', () => {
	/** Stripe's own 404 shape for an id the account does not know. */
	const resourceMissingFetch: typeof fetch = async () =>
		new Response(
			JSON.stringify({
				error: {
					type: 'invalid_request_error',
					code: 'resource_missing',
					message: 'No such product: prod_mock_1'
				}
			}),
			{ status: 404, headers: { 'content-type': 'application/json' } }
		);

	function gateway() {
		return createStripeGateway('sk_test_not_real', {
			maxNetworkRetries: 0,
			fetchFn: resourceMissingFetch
		});
	}

	it('updateProduct on an unknown id throws the typed error', async () => {
		await expect(gateway().updateProduct('prod_mock_1', { name: 'X' })).rejects.toBeInstanceOf(
			GatewayResourceMissingError
		);
	});

	it('archivePrice on an unknown id throws the typed error', async () => {
		await expect(gateway().archivePrice('price_mock_1')).rejects.toBeInstanceOf(
			GatewayResourceMissingError
		);
	});
});
