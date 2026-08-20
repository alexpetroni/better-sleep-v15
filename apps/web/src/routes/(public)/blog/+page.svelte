<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import Seo from '$lib/components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ArticleCards } from '$lib/modules/blog';
	import { NewsletterSignup } from '$lib/modules/crm';

	let { data } = $props();

	// A resolved pathname plus a query string is still a resolved destination.
	function pageHref(page: number): ResolvedPathname {
		return `${resolve('/(public)/blog')}?page=${page}` as ResolvedPathname;
	}
</script>

<Seo
	title={`${m.blog_heading()} · ${data.site.name}`}
	description={m.blog_tagline()}
	canonical={data.canonical}
	siteName={data.site.name}
/>

<h1 class="mb-2 text-3xl font-bold">{m.blog_heading()}</h1>
<p class="mb-8 text-lg text-(--color-ink)/80">{m.blog_tagline()}</p>

{#if data.cards.length === 0}
	<p data-testid="blog-empty" class="rounded-lg border border-(--color-brand-soft) bg-white p-4">
		{m.blog_empty()}
	</p>
{:else}
	<ArticleCards cards={data.cards} />

	{#if data.pageCount > 1}
		<nav data-testid="blog-pagination" class="mt-8 flex items-center justify-center gap-4">
			{#if data.page > 1}
				<a href={pageHref(data.page - 1)} class="text-(--color-brand) hover:underline">
					← {m.blog_page_prev()}
				</a>
			{/if}
			<span class="text-sm text-(--color-ink)/70">
				{m.blog_page_of({ page: data.page, pageCount: data.pageCount })}
			</span>
			{#if data.page < data.pageCount}
				<a href={pageHref(data.page + 1)} class="text-(--color-brand) hover:underline">
					{m.blog_page_next()} →
				</a>
			{/if}
		</nav>
	{/if}
{/if}

<div class="mt-12 rounded-xl border border-(--color-brand-soft) bg-(--color-brand-soft)/20 p-6">
	<NewsletterSignup source="blog" />
</div>
