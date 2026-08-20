<script module lang="ts">
	import type { ImageSources } from '$lib/modules/media';

	/** One card of a public article listing (the /blog grid shape). */
	export interface ArticleCardData {
		slug: string;
		title: string;
		excerpt: string;
		publishedAt: Date | null;
		cover: ImageSources | null;
	}
</script>

<script lang="ts">
	import { formatDate } from '$lib/util/date';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { Img } from '$lib/modules/media';

	let { cards, testid = 'blog-card' }: { cards: ArticleCardData[]; testid?: string } = $props();
</script>

<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each cards as card (card.slug)}
		<li
			data-testid={testid}
			data-slug={card.slug}
			class="overflow-hidden rounded-lg border border-(--color-brand-soft) bg-white"
		>
			<a href={resolve('/(public)/blog/[slug]', { slug: card.slug })} class="group block">
				{#if card.cover}
					<Img
						image={card.cover}
						sizes="(min-width: 64rem) 17rem, (min-width: 40rem) 45vw, calc(100vw - 2rem)"
						class="aspect-[8/5] w-full bg-(--color-brand-soft)/20 object-cover"
					/>
				{:else}
					<div class="aspect-[8/5] w-full bg-(--color-brand-soft)/40"></div>
				{/if}
				<div class="p-4">
					<h2 class="mb-1 font-semibold group-hover:underline">{card.title}</h2>
					{#if card.publishedAt}
						<p class="mb-2 text-xs text-(--color-ink)/70">
							{m.blog_published_on({ date: formatDate(card.publishedAt, 'long') })}
						</p>
					{/if}
					{#if card.excerpt}
						<p class="text-sm text-(--color-ink)/80">{card.excerpt}</p>
					{/if}
				</div>
			</a>
		</li>
	{/each}
</ul>
