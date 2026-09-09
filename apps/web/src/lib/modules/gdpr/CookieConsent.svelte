<script lang="ts">
	import { resolve } from '$app/paths';
	import { COOKIE_PAGE_SLUG } from '$lib/modules/pages';
	import { m } from '$lib/paraglide/messages';
	import { consentCookieString, type CookieConsentValue } from './consent.ts';

	// `initial` is the server-read cookie value: null = not decided yet.
	// `onchange` lets the layout react to a decision made here (it feeds the
	// consent-gated AnalyticsLoader without a reload).
	let {
		initial,
		onchange
	}: { initial: CookieConsentValue | null; onchange?: (value: CookieConsentValue) => void } =
		$props();

	// The server-read cookie is only the seed; later changes are local decisions.
	// svelte-ignore state_referenced_locally
	let decision = $state(initial);
	let bannerEl = $state<HTMLElement>();

	function decide(value: CookieConsentValue) {
		document.cookie = consentCookieString(value);
		decision = value;
		onchange?.(value);
	}

	// Publish the banner's height as --cookie-banner-h so other fixed-bottom UI
	// (the chat widget) can offset above it instead of being occluded. Cleared
	// when the banner leaves the DOM after a decision.
	$effect(() => {
		if (!bannerEl) {
			document.documentElement.style.removeProperty('--cookie-banner-h');
			return;
		}
		const el = bannerEl;
		const observer = new ResizeObserver(() => {
			document.documentElement.style.setProperty('--cookie-banner-h', `${el.offsetHeight}px`);
		});
		observer.observe(el);
		return () => {
			observer.disconnect();
			document.documentElement.style.removeProperty('--cookie-banner-h');
		};
	});
</script>

{#if decision === null}
	<section
		bind:this={bannerEl}
		data-testid="cookie-consent"
		aria-label={m.consent_aria_label()}
		class="fixed inset-x-0 bottom-0 z-50 border-t border-(--color-ink)/8 bg-(--color-surface)/95 p-4 shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.25)] backdrop-blur-md"
	>
		<div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-(--color-ink)">
				{m.consent_text()}
				<a href={resolve('/(public)/pagini/[slug]', { slug: COOKIE_PAGE_SLUG })} class="underline">
					{m.consent_more()}
				</a>
			</p>
			<div class="flex gap-2">
				<button
					type="button"
					data-testid="consent-deny"
					onclick={() => decide('denied')}
					class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-(--color-ink) shadow-pill hover:bg-(--color-brand-soft)/60"
				>
					{m.consent_deny()}
				</button>
				<button
					type="button"
					data-testid="consent-accept"
					onclick={() => decide('granted')}
					class="rounded-full bg-(--color-brand) px-4 py-2 text-sm font-semibold text-(--color-night-ink) hover:opacity-90"
				>
					{m.consent_accept()}
				</button>
			</div>
		</div>
	</section>
{/if}

<!--
	The analytics script itself is injected by AnalyticsLoader in the (public)
	layout, gated on `analyticsAllowed(decision)`; this banner only surfaces
	the decision (via the cookie + `onchange`).
-->
