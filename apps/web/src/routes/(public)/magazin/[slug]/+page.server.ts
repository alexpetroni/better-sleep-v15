import { error, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { renderArticleHtml } from '$lib/modules/blog/server';
import type { ImageSources } from '$lib/modules/media';
import { getImageProvider, imgSources, imgUrl } from '$lib/modules/media/server';
import { addToCart, productJsonLd, productMetaDescription } from '$lib/modules/shop';
import { getProductBySlug, isPurchasable } from '$lib/modules/shop/server';
import { canonicalUrl } from '$lib/seo';
import { readCart, writeCart } from '$lib/server/cart';
import { getSite } from '$lib/server/site';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const site = getSite();
	const found = await getProductBySlug({ db: getDb() }, params.slug, {
		sitePillarSlugs: site.pillars
	});
	if (!found) error(404);
	const { product, cover, galleryMedia } = found;

	const gallery: ImageSources[] = galleryMedia
		.filter((row) => row.key)
		.map((row) => imgSources(row, { w: 768 }));

	const canonical = canonicalUrl(`/magazin/${product.slug}`);
	// Zero-priced counts as unavailable too (L-7) — same disabled-button UI.
	const outOfStock = !isPurchasable(product);
	// M-6: per-product search snippet from the description (Sursă-preț line
	// excluded); '' when the description is empty — the page falls back to the
	// shared shop tagline.
	const metaDescription = productMetaDescription(product.descriptionMd);
	// Fixed-size social card through imgproxy, like articles. All catalogue
	// bundles ship coverMediaId null today — Seo.svelte then falls back to the
	// site-wide branded card.
	const ogImage = cover?.key
		? imgUrl(cover.key, { w: 1200, h: 630, fit: 'fill', format: 'jpg' })
		: null;

	return {
		product: {
			id: product.id,
			slug: product.slug,
			name: product.name,
			priceCents: product.priceCents,
			currency: product.currency,
			outOfStock
		},
		cover: cover?.key ? imgSources(cover, { w: 768 }) : null,
		gallery,
		// Same sanitized markdown pipeline as articles (supports media: refs).
		descriptionHtml: await renderArticleHtml(
			{ db: getDb() },
			getImageProvider(),
			product.descriptionMd
		),
		canonical,
		metaDescription,
		ogImage,
		ogImageAlt: cover?.alt ?? '',
		jsonLd: productJsonLd({
			name: product.name,
			description: metaDescription,
			url: canonical,
			priceCents: product.priceCents,
			currency: product.currency,
			outOfStock,
			image: ogImage
		})
	};
};

export const actions: Actions = {
	add: async ({ params, request, cookies }) => {
		const site = getSite();
		const found = await getProductBySlug({ db: getDb() }, params.slug, {
			sitePillarSlugs: site.pillars
		});
		if (!found || !isPurchasable(found.product)) error(400, 'Product unavailable');

		const form = await request.formData();
		const qty = Math.max(1, Number(form.get('qty')) || 1);
		// M-3: never put more in the cart than the tracked stock can ship. The
		// cart page re-checks (and messages) in loadCartDetails — this clamp
		// just keeps the obvious single-add case honest at the source.
		const stock = found.product.stock;
		const capped = stock === null ? qty : Math.min(qty, stock);
		writeCart(cookies, addToCart(readCart(cookies), found.product.id, capped));
		redirect(303, '/cos');
	}
};
