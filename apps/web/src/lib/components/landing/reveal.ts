/**
 * Scroll-entry reveal for landing blocks: adds `reveal-hidden` on mount and
 * `reveal-shown` when the element enters the viewport (see layout.css).
 * Progressive enhancement — without JS the classes are never added, and the
 * motion rules sit behind prefers-reduced-motion, so content is never stuck
 * invisible. Animates transform/opacity only.
 */
export function reveal(node: HTMLElement, options: { delay?: number } = {}) {
	if (typeof IntersectionObserver === 'undefined') return;
	// Hydration must never blink content the visitor is already reading
	// (L-10): on a slow connection the server-rendered page is visible before
	// JS arrives, and hiding an in-viewport element here would fade it out and
	// back in. Only elements still below/above the fold get the entry reveal.
	const rect = node.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	if (rect.top < viewportHeight && rect.bottom > 0) return;
	node.style.setProperty('--reveal-delay', `${options.delay ?? 0}ms`);
	node.classList.add('reveal-hidden');
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				node.classList.add('reveal-shown');
				observer.disconnect();
			}
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}
