import { centsToDecimal } from '../../util/money.ts';

/**
 * Product-page SEO derivations (review M-6): a per-product meta description
 * from `descriptionMd` and the Product/Offer JSON-LD. Pure and universal —
 * the page server feeds them row data.
 */

/**
 * The price-source citation appended by `products-from-initialdata.ts`
 * ("Sursă preț: [zenyth.ro](…), date") — supplier bookkeeping, never search
 * copy.
 */
const PRICE_SOURCE_PREFIX = 'Sursă preț:';

export const PRODUCT_META_DESCRIPTION_MAX = 160;

/**
 * First sentences of the product description as a plain-text meta
 * description: the Sursă-preț line is dropped, markdown syntax stripped, and
 * the text cut at a sentence boundary under the limit (word boundary + '…'
 * when the first sentence alone is too long). Empty description → ''; the
 * page falls back to the shop tagline.
 */
export function productMetaDescription(descriptionMd: string): string {
	const text = descriptionMd
		.split('\n')
		.filter((line) => !line.trimStart().startsWith(PRICE_SOURCE_PREFIX))
		.join(' ')
		// Images before links, so the link rule cannot half-match `![…](…)`.
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[*_`#>]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	// Code points, not UTF-16 units — diacritics count as one character.
	const chars = [...text];
	if (chars.length <= PRODUCT_META_DESCRIPTION_MAX) return text;
	const head = chars.slice(0, PRODUCT_META_DESCRIPTION_MAX).join('');
	const sentenceEnd = Math.max(
		head.lastIndexOf('. '),
		head.lastIndexOf('! '),
		head.lastIndexOf('? ')
	);
	// A boundary unreasonably early would gut the description — prefer a clean
	// word cut then.
	if (sentenceEnd >= 60) return head.slice(0, sentenceEnd + 1);
	const wordEnd = head.lastIndexOf(' ');
	return (wordEnd > 0 ? head.slice(0, wordEnd) : head).trimEnd() + '…';
}

/**
 * schema.org Product/Offer JSON-LD. Valid without an image (all catalogue
 * bundles ship `coverMediaId: null` for now); `price` is a decimal string
 * derived from integer bani via the money module — bani never meet strings
 * anywhere else.
 */
export function productJsonLd(input: {
	name: string;
	description: string;
	/** Canonical absolute URL of the product page. */
	url: string;
	priceCents: number;
	/** Lowercase ISO code as stored ('ron'); emitted uppercase per schema.org. */
	currency: string;
	outOfStock: boolean;
	/** Absolute social-card URL, when the product has a cover. */
	image?: string | null;
}): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: input.name,
		description: input.description,
		...(input.image ? { image: [input.image] } : {}),
		offers: {
			'@type': 'Offer',
			price: centsToDecimal(input.priceCents),
			priceCurrency: input.currency.toUpperCase(),
			availability: input.outOfStock
				? 'https://schema.org/OutOfStock'
				: 'https://schema.org/InStock',
			url: input.url
		}
	};
}
