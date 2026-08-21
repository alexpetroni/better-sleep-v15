/**
 * GDPR consent shaping, pure. Consents are stored as jsonb on the subscriber:
 * each key carries its own granted flag, timestamp and source, so every
 * consent CHANGE is provable. Callers pass only EXPLICIT intents — an
 * unticked checkbox on a later form is a no-op, never a revocation
 * (revocation happens only via unsubscribe or an explicit false).
 */

export const CONSENT_KEYS = ['newsletter', 'profile_emails'] as const;

export type ConsentKey = (typeof CONSENT_KEYS)[number];

export interface ConsentRecord {
	granted: boolean;
	/** ISO timestamp of the change. */
	at: string;
	/** Where the change came from, e.g. `quiz:evaluare-somn`, `footer`, `unsubscribe`. */
	source: string;
	/**
	 * Version + hash of the consent wording shown at grant time (review M-11),
	 * e.g. `v1:sha256:8c1f…` — see ./consent-copy.ts. Proves WHAT was agreed
	 * to even after the label text changes. Absent on revocations and on
	 * pre-BS-10 records.
	 */
	copy?: string;
}

export type Consents = Partial<Record<ConsentKey, ConsentRecord>>;

/** Only keys present here are touched; `undefined` keys keep their state. */
export type ConsentChanges = Partial<Record<ConsentKey, boolean>>;

/** The consent-wording reference per key, recorded on grants (see ConsentRecord.copy). */
export type ConsentCopyRefs = Partial<Record<ConsentKey, string>>;

export function applyConsents(
	current: Consents,
	changes: ConsentChanges,
	source: string,
	now: Date,
	copyRefs?: ConsentCopyRefs
): Consents {
	const next: Consents = { ...current };
	for (const key of CONSENT_KEYS) {
		const granted = changes[key];
		if (granted === undefined) continue;
		// Re-affirming an unchanged state is not a consent CHANGE: the original
		// record (the proof of when consent was first given) is kept, and
		// retried handlers stay idempotent because the timestamp is stable.
		if (current[key]?.granted === granted) continue;
		const copy = granted ? copyRefs?.[key] : undefined;
		next[key] = { granted, at: now.toISOString(), source, ...(copy ? { copy } : {}) };
	}
	return next;
}

export function hasConsent(consents: Consents, key: ConsentKey): boolean {
	return consents[key]?.granted === true;
}

/** All consents revoked — the one-click unsubscribe shape. */
export function revokeAllConsents(current: Consents, now: Date): Consents {
	const changes: ConsentChanges = {};
	for (const key of CONSENT_KEYS) changes[key] = false;
	return applyConsents(current, changes, 'unsubscribe', now);
}
