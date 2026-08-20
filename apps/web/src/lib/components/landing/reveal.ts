/**
 * Scroll-entry reveal for landing blocks: adds `reveal-hidden` on mount and
 * `reveal-shown` when the element enters the viewport (see layout.css).
 * Progressive enhancement — without JS the classes are never added, and the
 * motion rules sit behind prefers-reduced-motion, so content is never stuck
 * invisible. Animates transform/opacity only.
 */
export function reveal(node: HTMLElement, options: { delay?: number } = {}) {
	if (typeof IntersectionObserver === 'undefined') return;
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
