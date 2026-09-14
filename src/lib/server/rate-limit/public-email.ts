import type { Db } from '../../db/client.ts';
import { consumeRateLimit, type RateLimitConfig } from './core.ts';
import { rateLimits } from './schema.ts';

/**
 * Throttles for the abusable public endpoints. Two caps per scope, both
 * enforced server-side before the endpoint does anything:
 *  - per IP: one visitor can only trigger a handful of requests per hour;
 *  - global: distinct requests from many IPs can't overwhelm the endpoint —
 *    it stops admitting when the hourly budget is spent (a deliberate
 *    availability trade-off vs. burning email reputation/quota or growing
 *    tables unbounded).
 *
 * The per-IP check runs FIRST and refusal short-circuits: a refused request
 * never consumes a global slot, so a single over-cap IP hammering the
 * endpoint cannot starve the shared budget for everyone else (review
 * 2026-08-21 H-3). Refused requests still count against their own IP key
 * (consumeRateLimit counts them), so hammering keeps the abuser limited.
 *
 * If abuse ever outgrows these caps, add a CAPTCHA/proof-of-work check in
 * the actions right before the consume call — this is the hook point;
 * nothing is wired today by design.
 */
export const PUBLIC_EMAIL_IP_LIMIT: RateLimitConfig = { max: 10, windowMs: 60 * 60 * 1000 };
export const PUBLIC_EMAIL_GLOBAL_LIMIT: RateLimitConfig = { max: 200, windowMs: 60 * 60 * 1000 };

/**
 * Quiz submissions don't send email, but every POST inserts a row — without a
 * cap the table grows at wire speed (review 2026-08-21 H-6). A human takes
 * minutes per 12-question attempt; 20/hour/IP is generous even for a shared
 * office NAT, and the global cap bounds table growth while never plausibly
 * limiting launch-scale legitimate traffic.
 */
export const QUIZ_SUBMIT_IP_LIMIT: RateLimitConfig = { max: 20, windowMs: 60 * 60 * 1000 };
export const QUIZ_SUBMIT_GLOBAL_LIMIT: RateLimitConfig = { max: 500, windowMs: 60 * 60 * 1000 };

export type PublicEmailScope = 'newsletter' | 'quiz-email';

export interface PublicEmailLimits {
	ip: RateLimitConfig;
	global: RateLimitConfig;
}

const DEFAULT_LIMITS: PublicEmailLimits = {
	ip: PUBLIC_EMAIL_IP_LIMIT,
	global: PUBLIC_EMAIL_GLOBAL_LIMIT
};

const QUIZ_SUBMIT_LIMITS: PublicEmailLimits = {
	ip: QUIZ_SUBMIT_IP_LIMIT,
	global: QUIZ_SUBMIT_GLOBAL_LIMIT
};

/** Per-IP first, then global — sequential so a refused IP drains nothing shared. */
async function consumeScopedBudget(
	db: Db,
	scope: string,
	ip: string,
	limits: PublicEmailLimits,
	now: Date
): Promise<{ limited: boolean }> {
	const byIp = await consumeRateLimit(db, rateLimits, `${scope}:ip:${ip}`, limits.ip, now);
	if (byIp.limited) return { limited: true };
	const global = await consumeRateLimit(db, rateLimits, `${scope}:global`, limits.global, now);
	return { limited: global.limited };
}

/** Atomically consume one send slot; refuse when either cap is exhausted. */
export async function consumePublicEmailBudget(
	db: Db,
	scope: PublicEmailScope,
	ip: string,
	now: Date = new Date(),
	limits: PublicEmailLimits = DEFAULT_LIMITS
): Promise<{ limited: boolean }> {
	return consumeScopedBudget(db, scope, ip, limits, now);
}

/** Atomically consume one quiz-submit slot; refuse when either cap is exhausted. */
export async function consumeQuizSubmitBudget(
	db: Db,
	ip: string,
	now: Date = new Date(),
	limits: PublicEmailLimits = QUIZ_SUBMIT_LIMITS
): Promise<{ limited: boolean }> {
	return consumeScopedBudget(db, 'quiz-submit', ip, limits, now);
}
