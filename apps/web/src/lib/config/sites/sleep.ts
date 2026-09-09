// Relative on purpose: the plain-node seed script loads this config, and the
// nurture barrel is the universal (node-safe) one.
import { RESULT_URL_TOKEN } from '../../modules/nurture/index.ts';
import type { SiteConfig } from '../types.ts';

export const sleepSite: SiteConfig = {
	id: 'sleep',
	name: 'Better Sleep',
	domain: 'better-sleep-v15.vercel.app',
	// `ro` only until content is localized (FIX-15): drives the subscriber
	// locale and hreflang alternates (none for a single locale).
	locales: ['ro'],
	pillars: ['somn'],
	theme: {
		// Paper & ink (2026-09-09 redesign): a warm cream ground with a fine
		// grain, warm near-black ink for type and primary actions, and ONE
		// coral accent for the pops (eyebrow dots, the serif line, prices).
		// "soft" is the sand that fills placeholders and quiet panels.
		'color-brand': 'oklch(0.22 0.014 55)',
		'color-brand-soft': 'oklch(0.935 0.02 78)',
		'color-accent': 'oklch(0.64 0.17 38)',
		'color-surface': 'oklch(0.975 0.008 82)',
		'color-ink': 'oklch(0.2 0.012 55)',
		// The dark sections (night map, final CTA): warm charcoal, never blue.
		// "moon" is the apricot highlight that carries CTAs and time marks on
		// dark ground.
		'color-night': 'oklch(0.2 0.012 55)',
		'color-night-ink': 'oklch(0.965 0.01 82)',
		'color-night-muted': 'oklch(0.74 0.018 72)',
		'color-moon': 'oklch(0.88 0.08 72)'
	},
	nav: [
		{ label: 'Acasă', href: '/' },
		{ label: 'Somn', href: '/sanatate/somn' },
		{ label: 'Testul de somn', href: '/quiz/arhetip-somn' },
		{ label: 'Blog', href: '/blog' },
		{ label: 'Magazin', href: '/magazin' },
		{ label: 'Asistent', href: '/asistent' }
	],
	footerLinks: [
		{ label: 'Politica de confidențialitate', href: '/pagini/politica-de-confidentialitate' },
		{ label: 'Termeni și condiții', href: '/pagini/termeni-si-conditii' },
		{ label: 'Politica de cookie-uri', href: '/pagini/politica-de-cookie-uri' }
	],
	chatPersonaKey: 'sleep-coach',
	chatWidget: true,
	// Committed branded card (static/, regenerate with
	// scripts/og-default-image.sh) — the site-wide og:image fallback (M-6).
	ogImage: '/og-default.png',
	email: {
		from: 'salut@bettersleep.ro',
		replyTo: 'salut@bettersleep.ro'
	},
	nurture: [
		{
			key: 'bun-venit',
			name: 'Bun venit la newsletter',
			trigger: { kind: 'consent-confirmed' },
			consentKey: 'newsletter',
			steps: [
				{
					offsetDays: 0,
					templateKey: 'nurture',
					subject: 'Bine ai venit la Better Sleep',
					paragraphs: [
						'Îți mulțumim că te-ai abonat! De aici înainte îți trimitem, din când în când, sfaturi practice pentru un somn mai bun — fără spam, fără zgomot.',
						'Un prim pas bun: evaluează-ți somnul cu testul nostru de 3 minute.'
					],
					cta: { label: 'Fă testul de somn', url: '/quiz/evaluare-somn' }
				},
				{
					offsetDays: 3,
					hourLocal: 9,
					templateKey: 'nurture',
					subject: '3 obiceiuri simple pentru un somn mai bun',
					paragraphs: [
						'Ora de culcare constantă, lumină redusă cu o oră înainte de somn și dormitorul răcoros — cele trei obiceiuri cu cel mai bun raport efort/rezultat.',
						'Alege unul singur săptămâna aceasta. Consecvența bate perfecțiunea.'
					]
				}
			]
		},
		{
			key: 'dupa-evaluare-somn',
			name: 'După testul de somn',
			trigger: { kind: 'quiz-completed', quizSlug: 'evaluare-somn' },
			consentKey: 'newsletter',
			steps: [
				{
					offsetDays: 1,
					hourLocal: 9,
					templateKey: 'nurture',
					subject: 'Primul pas după evaluarea somnului',
					paragraphs: [
						'Ai făcut testul — acum contează ce faci cu rezultatul. Începe cu zona în care ai avut scorul cel mai mic: acolo e cel mai mult de câștigat.',
						'Pe blog găsești ghiduri scurte pentru fiecare dimensiune a somnului.'
					],
					cta: { label: 'Citește ghidurile', url: '/blog' }
				},
				{
					offsetDays: 4,
					hourLocal: 9,
					templateKey: 'nurture',
					subject: 'Cum îți construiești o rutină de seară',
					paragraphs: [
						'O rutină de seară bună are trei ingrediente: aceeași oră, aceleași gesturi, fără ecrane în ultimele 30 de minute.',
						'Repet-o 10 zile la rând și urmărește cum se schimbă cât de repede adormi.'
					]
				}
			]
		},
		{
			// The deck's block-5 promise ("îți trimitem protocolul complet"):
			// captured on the archetype quiz result, delivered here. Step 0's CTA
			// resolves per subscriber to their own result page at send time.
			key: 'protocol-arhetip-somn',
			name: 'Protocolul după testul de somn',
			trigger: { kind: 'quiz-completed', quizSlug: 'arhetip-somn' },
			consentKey: 'newsletter',
			steps: [
				{
					offsetDays: 0,
					templateKey: 'nurture',
					subject: 'Protocolul tău de somn',
					paragraphs: [
						'Ai făcut testul și ți-ai văzut tiparul. De aici începe partea utilă: protocolul — ce schimbi în rutina de seară, în ce ordine, și la ce să fii atent în primele săptămâni.',
						'Începe cu primul pas recomandat pentru tiparul tău, de pe pagina rezultatului. Un singur obicei, ținut zilnic, mută mai mult decât cinci începute și abandonate.'
					],
					cta: { label: 'Vezi rezultatul și protocolul tău', url: RESULT_URL_TOKEN }
				},
				{
					offsetDays: 3,
					hourLocal: 9,
					templateKey: 'nurture',
					subject: 'Trei zile de protocol: ce ar trebui să simți',
					paragraphs: [
						'Trei zile nu schimbă un somn, dar arată o direcție: adormi puțin mai ușor, sau măcar serile au aceeași structură. Dacă n-ai început încă, alege un singur pas din protocol și ține-te de el o săptămână.',
						'După 3 săptămâni reevaluăm. Dacă tiparul s-a schimbat, se schimbă și protocolul — poți reface testul oricând.'
					],
					cta: { label: 'Refă testul de somn', url: '/quiz/arhetip-somn' }
				}
			]
		},
		{
			key: 'dupa-prima-comanda',
			name: 'După prima comandă',
			trigger: { kind: 'order-paid' },
			consentKey: 'newsletter',
			steps: [
				{
					offsetDays: 7,
					hourLocal: 10,
					templateKey: 'nurture',
					subject: 'Cum îți merge cu noua rutină?',
					paragraphs: [
						'A trecut o săptămână de la comanda ta. Schimbările de somn au nevoie de câteva săptămâni de consecvență — nu te descuraja dacă efectul nu e încă vizibil.',
						'Dacă ai întrebări despre produs, răspundem cu drag la adresa din footer.'
					]
				}
			]
		}
	]
};
