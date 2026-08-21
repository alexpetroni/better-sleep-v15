// Proof of WHAT was agreed to (review M-11): every consent grant records a
// reference to the exact wording the visitor saw, as `v<N>:sha256:<16 hex>`.
//
// The hash binds the reference to the label TEXT — any edit to the Paraglide
// message changes it automatically. `CONSENT_COPY_VERSION` is the human-
// declared revision of what the wording MEANS: bump it when the scope of the
// consent changes (not for typo fixes), and note the old wording in the commit
// message so a stored `copy` ref can always be resolved back to its text via
// the git history of `messages/ro.json`.
//
// Server-only (node:crypto): exported via ./server.ts, not the universal
// barrel.
import { createHash } from 'node:crypto';
import { m } from '$lib/paraglide/messages';
import type { ConsentCopyRefs } from './consent.ts';

export const CONSENT_COPY_VERSION = 1;

export function consentCopyRef(label: string, version = CONSENT_COPY_VERSION): string {
	const hash = createHash('sha256').update(label, 'utf8').digest('hex').slice(0, 16);
	return `v${version}:sha256:${hash}`;
}

/**
 * The wording currently shown per consent key. Single-locale site: the server
 * renders the same message the visitor saw. `profile_emails` has no public
 * grant surface (no form offers it), hence no wording to record — add its
 * label here the day a form does.
 */
export function currentConsentCopyRefs(): ConsentCopyRefs {
	return { newsletter: consentCopyRef(m.newsletter_consent_label()) };
}
