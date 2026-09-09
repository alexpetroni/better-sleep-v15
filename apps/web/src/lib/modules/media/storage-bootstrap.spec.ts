import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorage } from './storage.ts';

/**
 * `ensureBucket` against Cloudflare R2 (2026-09-09): a bucket-scoped R2 API
 * token answers CreateBucket with AccessDenied even when the bucket exists
 * and is fully usable, so `pnpm seed:base` (documented for production in
 * VERCEL-DEPLOY.md §6) died before seeding a single row. When CreateBucket
 * is refused, an accessible bucket (HeadBucket succeeds) counts as `exists`;
 * a bucket that is refused AND absent still surfaces the original error.
 */
function fakeStorage() {
	return createStorage({
		endpoint: 'https://example.r2.cloudflarestorage.com',
		region: 'auto',
		accessKey: 'k',
		secretKey: 's',
		bucket: 'media'
	});
}

function s3Error(name: string, httpStatusCode: number): Error {
	return Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });
}

describe('ensureBucket on a provider that refuses CreateBucket', () => {
	afterEach(() => vi.restoreAllMocks());

	it("treats AccessDenied + reachable bucket as 'exists'", async () => {
		const send = vi.spyOn(S3Client.prototype, 'send').mockImplementation((async (cmd: unknown) => {
			if (cmd instanceof CreateBucketCommand) throw s3Error('AccessDenied', 403);
			if (cmd instanceof HeadBucketCommand) return {};
			throw new Error(`unexpected command ${cmd?.constructor?.name}`);
		}) as never);
		await expect(fakeStorage().ensureBucket()).resolves.toBe('exists');
		expect(send.mock.calls.map((c) => c[0]?.constructor?.name)).toEqual([
			'CreateBucketCommand',
			'HeadBucketCommand'
		]);
	});

	it('rethrows AccessDenied when the bucket is not reachable either', async () => {
		vi.spyOn(S3Client.prototype, 'send').mockImplementation((async (cmd: unknown) => {
			if (cmd instanceof CreateBucketCommand) throw s3Error('AccessDenied', 403);
			if (cmd instanceof HeadBucketCommand) throw s3Error('NotFound', 404);
			throw new Error(`unexpected command ${cmd?.constructor?.name}`);
		}) as never);
		await expect(fakeStorage().ensureBucket()).rejects.toMatchObject({ name: 'AccessDenied' });
	});

	it("still reports 'created' / 'exists' on the plain S3 answers", async () => {
		vi.spyOn(S3Client.prototype, 'send').mockImplementation((async () => ({})) as never);
		await expect(fakeStorage().ensureBucket()).resolves.toBe('created');
		vi.restoreAllMocks();
		vi.spyOn(S3Client.prototype, 'send').mockImplementation((async () => {
			throw s3Error('BucketAlreadyOwnedByYou', 409);
		}) as never);
		await expect(fakeStorage().ensureBucket()).resolves.toBe('exists');
	});
});
