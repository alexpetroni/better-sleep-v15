<script lang="ts">
	import { formatDate } from '$lib/util/date';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { Img } from '$lib/modules/media';

	let { data } = $props();
</script>

<Seo
	title={`${data.pillar.name} · ${data.site.name}`}
	description={data.pillar.description}
	canonical={data.canonical}
	siteName={data.site.name}
/>

<h1 class="mb-3 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl" data-testid="pillar-title">
	{data.pillar.name}
</h1>
<p class="mb-12 max-w-2xl font-serif text-xl leading-snug text-(--color-ink)/80 sm:text-2xl">
	{data.pillar.description}
</p>

<section>
	<div class="mb-4 flex items-baseline justify-between">
		<h2 class="text-xl font-semibold">{m.pillar_articles_heading()}</h2>
		<a
			href={resolve('/(public)/blog')}
			class="text-sm font-semibold text-(--color-accent) hover:underline"
		>
			{m.pillar_articles_all()} →
		</a>
	</div>

	{#if data.articles.length === 0}
		<p data-testid="pillar-articles-empty" class="rounded-2xl bg-white p-5 text-sm shadow-paper">
			{m.blog_empty()}
		</p>
	{:else}
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.articles as card (card.slug)}
				<li
					data-testid="pillar-article-card"
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
							<h3 class="mb-1 font-semibold group-hover:underline">{card.title}</h3>
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
	{/if}
</section>
