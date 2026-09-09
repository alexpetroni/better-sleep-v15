<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { singleSubmit } from '$lib/components/single-submit';
	import { m } from '$lib/paraglide/messages';
	import { Img } from '$lib/modules/media';
	import { formatCents } from '$lib/util/money';

	let { data } = $props();
</script>

<Seo
	title={`${data.product.name} · ${data.site.name}`}
	description={data.metaDescription || m.shop_tagline()}
	canonical={data.canonical}
	siteName={data.site.name}
	ogImage={data.ogImage}
	ogImageAlt={data.ogImageAlt}
	jsonLd={data.jsonLd}
/>

<article data-testid="product-page" class="grid gap-8 md:grid-cols-2">
	<div>
		{#if data.cover}
			<Img
				image={data.cover}
				sizes="(min-width: 48rem) 26rem, calc(100vw - 2rem)"
				class="w-full rounded-[1.5rem] bg-(--color-brand-soft)/20 shadow-paper"
				loading="eager"
			/>
		{:else}
			<div
				class="aspect-[4/3] w-full rounded-[1.5rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand-soft)_80%,white),color-mix(in_oklab,var(--color-moon)_45%,white))] shadow-paper"
			></div>
		{/if}
		{#if data.gallery.length > 0}
			<ul data-testid="product-gallery" class="mt-4 grid grid-cols-3 gap-3">
				{#each data.gallery as image, i (image.src)}
					<li>
						<Img
							{image}
							alt={image.alt || `${data.product.name} ${i + 1}`}
							sizes="(min-width: 48rem) 8rem, calc((100vw - 3.5rem) / 3)"
							class="aspect-square w-full rounded bg-(--color-brand-soft)/20 object-cover"
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div>
		<h1
			class="mb-3 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl"
			data-testid="product-title"
		>
			{data.product.name}
		</h1>
		<p
			data-testid="product-price"
			class="mb-8 font-serif text-3xl text-(--color-accent) tabular-nums"
		>
			{formatCents(data.product.priceCents, data.product.currency)}
		</p>

		<form method="POST" action="?/add" use:singleSubmit class="mb-8 flex items-end gap-3">
			<label class="block text-sm">
				<span class="mb-1 block text-(--color-ink)/70">{m.shop_qty_label()}</span>
				<input
					type="number"
					name="qty"
					value="1"
					min="1"
					max="99"
					data-testid="product-qty"
					disabled={data.product.outOfStock}
					class="w-20 rounded-full bg-white px-4 py-2.5 shadow-pill"
				/>
			</label>
			<button
				type="submit"
				data-testid="product-add-to-cart"
				disabled={data.product.outOfStock}
				class="rounded-full bg-(--color-brand) px-6 py-2.5 font-semibold text-(--color-night-ink) transition-transform duration-500 ease-glide hover:scale-[1.02] active:scale-[0.98]
					disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
			>
				{data.product.outOfStock ? m.shop_out_of_stock() : m.shop_add_to_cart()}
			</button>
		</form>

		{#if data.descriptionHtml}
			<div class="prose max-w-none" data-testid="product-description">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side by the markdown pipeline -->
				{@html data.descriptionHtml}
			</div>
		{/if}
	</div>
</article>
