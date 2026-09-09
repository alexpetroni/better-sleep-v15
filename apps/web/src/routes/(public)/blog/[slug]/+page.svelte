<script lang="ts">
	import { formatDate } from '$lib/util/date';
	import Seo from '$lib/components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { Img } from '$lib/modules/media';

	let { data } = $props();
</script>

<Seo
	title={data.article.seoTitle || `${data.article.title} · ${data.site.name}`}
	description={data.article.seoDescription || data.article.excerpt}
	canonical={data.canonical}
	siteName={data.site.name}
	ogType="article"
	ogImage={data.ogImage}
	ogImageAlt={data.ogImageAlt}
	jsonLd={data.jsonLd}
/>

<article data-testid="article-page">
	<header class="mb-10">
		<h1
			class="mb-4 max-w-3xl text-4xl leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl"
			data-testid="article-title"
		>
			{data.article.title}
		</h1>
		{#if data.article.publishedAt}
			<p class="text-sm text-(--color-ink)/70">
				{m.blog_published_on({ date: formatDate(data.article.publishedAt, 'long') })}
			</p>
		{/if}
		{#if data.cover}
			<Img
				image={data.cover}
				sizes="(min-width: 56rem) 54rem, calc(100vw - 2rem)"
				class="mt-8 w-full rounded-[1.5rem] bg-(--color-brand-soft)/20 shadow-paper"
				loading="eager"
			/>
		{/if}
	</header>

	<div
		class="prose prose-lg max-w-none prose-headings:tracking-tight prose-a:text-(--color-accent) prose-blockquote:font-serif prose-blockquote:text-2xl prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:border-(--color-accent)"
		data-testid="article-body"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side by the markdown pipeline -->
		{@html data.html}
	</div>
</article>
