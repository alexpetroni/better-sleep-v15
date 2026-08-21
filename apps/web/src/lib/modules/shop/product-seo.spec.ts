import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
	PRODUCT_META_DESCRIPTION_MAX,
	productJsonLd,
	productMetaDescription
} from './product-seo.ts';

// Review M-6: product pages derive a per-product meta description from
// `descriptionMd` (Sursă-preț line excluded) and ship Product/Offer JSON-LD.

describe('productMetaDescription', () => {
	it('drops the Sursă-preț line and markdown syntax', () => {
		const md =
			'**Magneziu** cu absorbție bună, [studiat](https://example.org) pentru somn.\n\n' +
			'Sursă preț: [zenyth.ro](https://zenyth.ro/produse/x/), 2026-08-20\n';
		const out = productMetaDescription(md);
		expect(out).toBe('Magneziu cu absorbție bună, studiat pentru somn.');
		expect(out).not.toContain('Sursă');
		expect(out).not.toContain('zenyth');
		expect(out).not.toContain('[');
	});

	it('cuts long descriptions at a sentence boundary under the limit', () => {
		const first = 'Prima propoziție are exact conținutul care contează pentru căutare.';
		const md = `${first} ${'A doua propoziție continuă mult prea departe ca să încapă în snippetul de căutare afișat de Google.'}`;
		const out = productMetaDescription(md);
		expect(out).toBe(first);
		expect([...out].length).toBeLessThanOrEqual(PRODUCT_META_DESCRIPTION_MAX);
	});

	it('falls back to a word cut with ellipsis when the first sentence is too long', () => {
		const md = 'cuvânt '.repeat(60).trim() + '.';
		const out = productMetaDescription(md);
		expect(out.endsWith('…')).toBe(true);
		expect([...out].length).toBeLessThanOrEqual(PRODUCT_META_DESCRIPTION_MAX);
		expect(out).not.toContain('  ');
	});

	it('empty description → empty string (the page falls back to the tagline)', () => {
		expect(productMetaDescription('')).toBe('');
		expect(productMetaDescription('Sursă preț: [zenyth.ro](https://x/), 2026-08-20\n')).toBe('');
	});

	it('a real committed bundle yields Romanian text without the price-source line', async () => {
		const file = path.resolve(
			import.meta.dirname,
			'../../../../../../content/sleep/1030-magtein-magneziu-treonat-90-capsule.json'
		);
		const bundle = JSON.parse(await readFile(file, 'utf8')) as {
			product: { descriptionMd: string };
		};
		const out = productMetaDescription(bundle.product.descriptionMd);
		expect(out.length).toBeGreaterThan(40);
		expect([...out].length).toBeLessThanOrEqual(PRODUCT_META_DESCRIPTION_MAX);
		expect(out).toMatch(/[ăâîșț]/);
		expect(out).not.toContain('Sursă preț');
		expect(out).not.toContain('zenyth');
	});
});

describe('productJsonLd', () => {
	it('emits Product/Offer with decimal price, RON and availability from stock', () => {
		const jsonLd = productJsonLd({
			name: 'Magtein Magneziu Treonat',
			description: 'Magneziu care trece bariera hematoencefalică.',
			url: 'https://bettersleep.ro/magazin/magtein-magneziu-treonat-90-capsule',
			priceCents: 21600,
			currency: 'ron',
			outOfStock: false
		});
		expect(jsonLd).toEqual({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Magtein Magneziu Treonat',
			description: 'Magneziu care trece bariera hematoencefalică.',
			offers: {
				'@type': 'Offer',
				price: '216.00',
				priceCurrency: 'RON',
				availability: 'https://schema.org/InStock',
				url: 'https://bettersleep.ro/magazin/magtein-magneziu-treonat-90-capsule'
			}
		});
		// No image key at all when there is no cover — schema.org allows it.
		expect('image' in jsonLd).toBe(false);
	});

	it('flips availability when out of stock and carries the cover image', () => {
		const jsonLd = productJsonLd({
			name: 'X',
			description: 'Y',
			url: 'https://bettersleep.ro/magazin/x',
			priceCents: 4990,
			currency: 'ron',
			outOfStock: true,
			image: 'https://img.example/card.jpg'
		});
		expect(jsonLd.image).toEqual(['https://img.example/card.jpg']);
		expect((jsonLd.offers as Record<string, unknown>).availability).toBe(
			'https://schema.org/OutOfStock'
		);
		expect((jsonLd.offers as Record<string, unknown>).price).toBe('49.90');
	});
});
