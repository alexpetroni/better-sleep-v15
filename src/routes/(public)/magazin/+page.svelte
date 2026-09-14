<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import Seo from '$lib/components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { Img } from '$lib/modules/media';
	import { formatCents } from '$lib/util/money';

	let { data } = $props();

	// A resolved pathname plus a query string is still a resolved destination.
	function filterHref(slug: string | null): ResolvedPathname {
		const base = resolve('/(public)/magazin');
		return (slug ? `${base}?pilon=${slug}` : base) as ResolvedPathname;
	}
</script>

<Seo
	title={`${m.shop_heading()} · ${data.site.name}`}
	description={m.shop_tagline()}
	canonical={data.canonical}
	siteName={data.site.name}
/>

<h1 class="mb-3 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{m.shop_heading()}</h1>
<p class="mb-12 max-w-2xl font-serif text-xl leading-snug text-(--color-ink)/80 sm:text-2xl">
	{m.shop_tagline()}
</p>

{#if data.pillarFilters.length > 0}
	<nav data-testid="shop-pillar-filter" class="mb-8 flex flex-wrap gap-2">
		<a
			href={filterHref(null)}
			class="rounded-full px-3.5 py-1.5 text-sm {data.activeFilter === null
				? 'bg-(--color-brand) font-semibold text-(--color-night-ink)'
				: 'bg-white shadow-pill hover:bg-(--color-brand-soft)/60'}"
		>
			{m.shop_filter_all()}
		</a>
		{#each data.pillarFilters as pillar (pillar.slug)}
			<a
				href={filterHref(pillar.slug)}
				class="rounded-full px-3.5 py-1.5 text-sm {data.activeFilter === pillar.slug
					? 'bg-(--color-brand) font-semibold text-(--color-night-ink)'
					: 'bg-white shadow-pill hover:bg-(--color-brand-soft)/60'}"
			>
				{pillar.name}
			</a>
		{/each}
	</nav>
{/if}

{#if data.cards.length === 0}
	<p data-testid="shop-empty" class="rounded-2xl bg-white p-5 shadow-paper">
		{m.shop_empty()}
	</p>
{:else}
	<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.cards as card (card.slug)}
			<li
				data-testid="product-card"
				data-slug={card.slug}
				class="overflow-hidden rounded-[1.25rem] bg-white shadow-paper transition-[transform,box-shadow] duration-500 ease-glide hover:-translate-y-1 hover:shadow-paper-lg"
			>
				<a href={resolve('/(public)/magazin/[slug]', { slug: card.slug })} class="group block">
					{#if card.cover}
						<Img
							image={card.cover}
							sizes="(min-width: 64rem) 17rem, (min-width: 40rem) 45vw, calc(100vw - 2rem)"
							class="aspect-[4/3] w-full bg-(--color-brand-soft)/20 object-cover"
						/>
					{:else}
						<div
							class="aspect-[4/3] w-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand-soft)_80%,white),color-mix(in_oklab,var(--color-moon)_45%,white))]"
						></div>
					{/if}
					<div class="p-5">
						<h2
							class="mb-1 text-[17px] leading-snug font-bold tracking-tight group-hover:underline"
						>
							{card.name}
						</h2>
						<p class="flex items-center gap-2">
							<span
								data-testid="product-price"
								class="font-semibold text-(--color-accent) tabular-nums"
							>
								{formatCents(card.priceCents, card.currency)}
							</span>
							{#if card.outOfStock}
								<span
									data-testid="product-out-of-stock"
									class="rounded bg-(--color-brand-soft) px-2 py-0.5 text-xs"
								>
									{m.shop_out_of_stock()}
								</span>
							{/if}
						</p>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
