<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import {
		baseLocale,
		deLocalizeUrl,
		localizeHref,
		strategy,
		type Locale
	} from '$lib/paraglide/runtime';
	import { canonicalUrl, hreflangAlternates } from '$lib/seo';
	import { AnalyticsLoader } from '$lib/modules/analytics';
	import { ChatWidget } from '$lib/modules/chat';
	import { NewsletterSignup } from '$lib/modules/crm';
	import { CookieConsent, type CookieConsentValue } from '$lib/modules/gdpr';
	import { LegalIdentity } from '$lib/modules/settings';

	let { data, children } = $props();

	// Merged page data, so a page load that mutates the cart cookie (checkout
	// success) can override the count the layout load read before the mutation.
	const cartCount = $derived(page.data.cartCount ?? 0);

	// Live consent decision: the server-read cookie until the banner (or the
	// consent manager, which reloads) changes it. Feeds the consent-gated
	// analytics loader, so accepting in the banner takes effect immediately.
	let localDecision = $state<CookieConsentValue | null>(null);
	const consentDecision = $derived(localDecision ?? data.cookieConsent);

	// hreflang alternates — only when the SITE has more than one locale and
	// paraglide resolves locales from the URL (FIX-15; see hreflangAlternates).
	// Today both sites are `ro` only, so nothing is emitted. When they are,
	// each is the locale-less (base) pathname localized per locale, absolute
	// via PUBLIC_SITE_URL, with x-default at the base locale.
	const basePath = $derived(deLocalizeUrl(page.url).pathname);
	const alternates = $derived(
		hreflangAlternates(data.site.locales, strategy, baseLocale, (locale) =>
			canonicalUrl(localizeHref(basePath, { locale: locale as Locale }))
		)
	);
</script>

<svelte:head>
	{#each alternates as alt (alt.hreflang)}
		<link rel="alternate" hreflang={alt.hreflang} href={alt.href} />
	{/each}
</svelte:head>

<!-- Floating pill header (2026-09-09): the wordmark in one paper pill, the
     nav in another, the quiz as the single dark pill. Sticky with a blurred
     cream ground so the paper shows through while scrolling. -->
<header class="sticky top-0 z-40 pt-3 sm:pt-5">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 sm:px-6">
		<a
			href={resolve('/')}
			class="inline-flex items-center gap-2.5 rounded-full bg-white/80 py-2 pr-4 pl-2 text-[15px] font-bold tracking-tight shadow-pill backdrop-blur-md"
		>
			<span
				aria-hidden="true"
				class="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-brand) text-(--color-moon)"
			>
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
					<path d="M15.5 3a8.5 8.5 0 1 0 5.5 15 7 7 0 0 1-5.5-15Z" />
				</svg>
			</span>
			{data.site.name}
		</a>
		<nav class="rounded-full bg-white/80 p-1 shadow-pill backdrop-blur-md">
			<!-- Must wrap on narrow phones: the landing gate asserts no horizontal
			     scroll at 360px, and this nav is wider than that in one row. -->
			<ul class="flex flex-wrap items-center justify-end gap-0.5">
				{#each data.site.nav as item (item.href)}
					{@const active = page.url.pathname === item.href}
					{@const quiz = item.href.startsWith('/quiz/')}
					<li>
						<!-- Static config hrefs; cast to a static route type because the Pathname
					     union (with dynamic routes) defeats resolve()'s overloads. -->
						<a
							href={resolve(item.href as '/')}
							aria-current={active ? 'page' : undefined}
							class={[
								'inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-300 sm:text-sm',
								quiz
									? 'bg-(--color-brand) text-(--color-night-ink) hover:bg-(--color-ink)'
									: active
										? 'bg-(--color-brand-soft)/70 text-(--color-ink)'
										: 'text-(--color-ink)/75 hover:bg-(--color-brand-soft)/60 hover:text-(--color-ink)'
							]}
						>
							{item.label}
						</a>
					</li>
				{/each}
				<li>
					<a
						href={resolve('/(public)/cos')}
						data-testid="cart-link"
						class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-(--color-ink)/75 transition-colors duration-300 hover:bg-(--color-brand-soft)/60 hover:text-(--color-ink) sm:text-sm"
					>
						{m.shop_cart_link()}
						{#if cartCount > 0}
							<span
								data-testid="cart-count"
								class="rounded-full bg-(--color-accent) px-1.5 text-xs font-bold text-white tabular-nums"
							>
								{cartCount}
							</span>
						{/if}
					</a>
				</li>
			</ul>
		</nav>
	</div>
</header>

<!-- The landing composes full-bleed sections and manages its own containers;
     every other public page keeps the shared reading-width main. -->
<main
	class={page.route.id === '/(public)' ? undefined : 'mx-auto max-w-4xl px-5 pt-12 pb-16 sm:px-6'}
>
	{@render children()}
</main>

<footer class="relative mt-16 overflow-hidden border-t border-(--color-ink)/8">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute -right-24 -bottom-40 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-moon)_55%,transparent),transparent_70%)]"
	></div>
	<div class="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr]">
		<div>
			<p class="font-serif text-3xl leading-tight text-balance sm:text-4xl">
				{data.site.name}
			</p>
			<div class="mt-8">
				<NewsletterSignup source="footer" />
			</div>
		</div>
		<div class="md:pt-2">
			<nav aria-label={m.footer_legal_aria()}>
				<ul class="flex flex-col gap-2 text-sm">
					{#each data.site.footerLinks as link (link.href)}
						<li>
							<a
								href={resolve(link.href as '/')}
								class="text-(--color-ink)/70 underline decoration-(--color-ink)/20 underline-offset-4 transition-colors hover:text-(--color-ink) hover:decoration-(--color-accent)"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			<!-- RO e-commerce: the trader identification + ANPC/SOL links must be
			     visible on every page — rendered from /admin/settings, never hardcoded. -->
			<div class="mt-8 text-sm text-(--color-ink)/70">
				<LegalIdentity settings={data.publicSettings} />
			</div>
			<p class="mt-8 text-xs tracking-[0.18em] text-(--color-ink)/50 uppercase">
				© {data.site.name}
			</p>
		</div>
	</div>
</footer>

{#if data.site.chatWidget}
	<ChatWidget />
{/if}

<CookieConsent initial={data.cookieConsent} onchange={(value) => (localDecision = value)} />
<AnalyticsLoader config={data.analytics} decision={consentDecision} />
