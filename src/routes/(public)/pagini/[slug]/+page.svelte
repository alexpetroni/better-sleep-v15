<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { ConsentManager, CookieTable } from '$lib/modules/gdpr';
	import { COOKIE_PAGE_SLUG, LEGAL_PAGE_SLUGS } from '$lib/modules/pages';
	import { LegalIdentity } from '$lib/modules/settings';

	let { data } = $props();

	// Legal pages carry the trader identification rendered from settings —
	// never pasted into the markdown body, so it cannot drift from what the
	// operator saved in /admin/settings. The lawyer-editable prose stays in
	// /admin/pages.
	const isLegalPage = $derived(LEGAL_PAGE_SLUGS.includes(data.page.slug));
	const isCookiePolicy = $derived(data.page.slug === COOKIE_PAGE_SLUG);
</script>

<Seo
	title={`${data.page.title} · ${data.site.name}`}
	description={data.page.seoDescription ?? ''}
	canonical={data.canonical}
	siteName={data.site.name}
/>

<article data-testid="simple-page">
	<h1 class="mb-8 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{data.page.title}</h1>
	{#if isLegalPage}
		<div data-testid="legal-page-identity" class="mb-8 rounded-2xl bg-white p-5 shadow-paper">
			<LegalIdentity settings={data.publicSettings} />
		</div>
	{/if}
	<div class="prose max-w-none" data-testid="simple-page-body">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side by the markdown pipeline -->
		{@html data.page.html}
	</div>
	{#if isCookiePolicy}
		<CookieTable />
		<ConsentManager
			initial={data.cookieConsent}
			analyticsCookieNames={data.analytics?.cookieNames ?? []}
		/>
	{/if}
</article>
