// Proof of WHAT was agreed to (review M-11, integrated into FIX-13's consent
// evidence in BS-11): every visitor-made grant records the consent copy the
// visitor saw as `<message key>@<version>:sha256:<16 hex>` — upstream's
// `CONSENT_TEXT_VERSIONS` reference (the human-declared revision of what the
// wording MEANS: bump it when the scope of the consent changes, not for typo
// fixes) plus a hash that binds the reference to the label TEXT, so any edit
// to the Paraglide message changes it automatically and a stored value can
// always be resolved back to its text via the git history of
// `messages/ro.json`.
//
// Server-only (node:crypto): exported via ./server.ts, not the universal
// barrel. ONE evidence structure: this only fills `ConsentEvidence.
// consentTextVersion`; ip/userAgent come from the request in the route.
import { createHash } from 'node:crypto';
import { m } from '$lib/paraglide/messages';
import { CONSENT_TEXT_VERSIONS, type ConsentEvidence, type ConsentKey } from './consent.ts';

export function consentTextRef(key: ConsentKey, label: string): string {
	const hash = createHash('sha256').update(label, 'utf8').digest('hex').slice(0, 16);
	return `${CONSENT_TEXT_VERSIONS[key]}:sha256:${hash}`;
}

/**
 * The wording currently rendered per consent key. Single-locale site: the
 * server renders the same message the visitor saw. `profile_emails` has no
 * public grant surface here (no form offers it) — add its label the day a
 * form does.
 */
export function currentConsentTextVersions(): NonNullable<ConsentEvidence['consentTextVersion']> {
	return { newsletter: consentTextRef('newsletter', m.newsletter_consent_label()) };
}
