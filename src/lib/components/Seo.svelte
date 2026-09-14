<script lang="ts">
	import { page } from '$app/state';
	import { canonicalUrl, jsonLdString } from '$lib/seo';

	let {
		title,
		description,
		canonical,
		siteName,
		ogType = 'website',
		ogImage = null,
		ogImageAlt = '',
		jsonLd = null
	}: {
		title: string;
		description: string;
		canonical: string;
		siteName: string;
		ogType?: 'website' | 'article';
		ogImage?: string | null;
		ogImageAlt?: string;
		jsonLd?: Record<string, unknown> | null;
	} = $props();

	// Site-wide branded fallback card (review M-6): pages that pass no ogImage
	// emit the static card from site config (root layout data). Root-relative
	// paths are absolutized — crawlers require absolute og:image URLs.
	const siteFallback = $derived.by(() => {
		const path = (page.data as { site?: { ogImage?: string } }).site?.ogImage;
		if (!path) return null;
		return path.startsWith('/') ? canonicalUrl(path) : path;
	});
	const resolvedOgImage = $derived(ogImage ?? siteFallback);
	// The branded card's honest alt is the site name, not the page's alt text.
	const resolvedOgImageAlt = $derived(ogImage ? ogImageAlt : siteName);

	// Assembled in pieces: literal script tags inside the string would open or
	// terminate this component's own script block during parsing.
	const openTag = '<' + 'script type="application/ld+json">';
	const closeTag = '</' + 'script>';
	const jsonLdTag = $derived(jsonLd ? `${openTag}${jsonLdString(jsonLd)}${closeTag}` : null);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content={siteName} />
	{#if resolvedOgImage}
		<meta property="og:image" content={resolvedOgImage} />
		{#if resolvedOgImageAlt}
			<meta property="og:image:alt" content={resolvedOgImageAlt} />
		{/if}
	{/if}

	<meta name="twitter:card" content={resolvedOgImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if resolvedOgImage}
		<meta name="twitter:image" content={resolvedOgImage} />
	{/if}

	{#if jsonLdTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized with < escaped, see jsonLdString -->
		{@html jsonLdTag}
	{/if}
</svelte:head>
