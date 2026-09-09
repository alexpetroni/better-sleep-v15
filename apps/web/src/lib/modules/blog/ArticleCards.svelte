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
			class="overflow-hidden rounded-[1.25rem] bg-white shadow-paper transition-[transform,box-shadow] duration-500 ease-glide hover:-translate-y-1 hover:shadow-paper-lg"
		>
			<a href={resolve('/(public)/blog/[slug]', { slug: card.slug })} class="group block">
				{#if card.cover}
					<Img
						image={card.cover}
						sizes="(min-width: 64rem) 17rem, (min-width: 40rem) 45vw, calc(100vw - 2rem)"
						class="aspect-[8/5] w-full bg-(--color-brand-soft)/20 object-cover"
					/>
				{:else}
					<div
						class="aspect-[8/5] w-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand-soft)_80%,white),color-mix(in_oklab,var(--color-moon)_45%,white))]"
					></div>
				{/if}
				<div class="p-5">
					<h2 class="mb-1 text-[17px] leading-snug font-bold tracking-tight group-hover:underline">
						{card.title}
					</h2>
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
