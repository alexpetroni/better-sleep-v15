import type { ArchetypeId } from './patterns.ts';

/**
 * Editorial mapping: which of the 40 seeded articles (content/sleep bundles,
 * slugs from `.initialData/topics.json`) speak to each archetype's mechanism.
 * Assigned by subject matter — e.g. the hypervigilant Străjer gets the
 * hyperarousal and cortisol pieces, the stimulation-seeking Fugar gets
 * bedtime procrastination and ADHD. An article may serve several archetypes;
 * every archetype gets at least three. Consumed by the archetype pages
 * (`/tipuri/[archetype]`) to build their reading list.
 */
export const ARCHETYPE_ARTICLES: Record<ArchetypeId, readonly string[]> = {
	// Guard never comes off duty: hyperarousal, the cortisol rhythm, the bed
	// re-learned as an alert place, pressure as a safety signal.
	ST: [
		'obosit-dar-alert-hyperarousal',
		'raspunsul-cortizolului-la-trezire',
		'insomnia-conditionata',
		'patura-ponderata'
	],
	// The evening planning loop: conditioned wakefulness in bed and the two
	// behavioural levers that give the planning brain an off switch.
	MN: [
		'insomnia-conditionata',
		'terapia-restrictiei-de-somn',
		'obosit-dar-alert-hyperarousal',
		'ashwagandha-theanina-valeriana'
	],
	// Replaying scenes at night: misperceived sleep, dream-time emotional
	// processing, calming the looping mind.
	RU: [
		'insomnia-paradoxala',
		'vise-cosmaruri-calitatea-somnului',
		'ashwagandha-theanina-valeriana',
		'terapia-restrictiei-de-somn'
	],
	// Held-in tension keeps the fight system on: hyperarousal, the missing
	// nocturnal blood-pressure dip, unfinished emotional processing.
	VU: [
		'obosit-dar-alert-hyperarousal',
		'somnul-si-tensiunea-arteriala',
		'vise-cosmaruri-calitatea-somnului',
		'ashwagandha-theanina-valeriana'
	],
	// Sleeps last in the household: the people (and pets) whose nights the
	// caretaker carries.
	SA: [
		'copiii-care-nu-dorm',
		'somnul-in-cuplu',
		'partenerul-lucreaza-noaptea',
		'somnul-in-sarcina',
		'animale-de-companie-in-dormitor'
	],
	// Monitors sleep instead of sleeping: orthosomnia, misperceived sleep,
	// and the treatment that replaces control with structure.
	PE: [
		'tracker-de-somn-ajuta-sau-strica',
		'insomnia-paradoxala',
		'terapia-restrictiei-de-somn',
		'suplimentele-de-melatonina'
	],
	// Low sensory threshold: the stimuli in the bedroom, deep pressure, and
	// the seasonal light signal a sensitive system registers first.
	AN: [
		'animale-de-companie-in-dormitor',
		'somnul-in-cuplu',
		'patura-ponderata',
		'schimbarile-sezoniere-somn'
	],
	// Stimulation over stillness: revenge bedtime procrastination, the ADHD
	// dopamine link, chronotype reality, cannabis as evening stimulation.
	FU: [
		'procrastinarea-somnului-din-razbunare',
		'adhd-si-somnul',
		'cronotipurile-sunt-reale',
		'canabis-cbd-si-somnul'
	],
	// The drained HPA axis: the morning cortisol signal, brutal wake-ups,
	// wired-but-tired, and the immune bill the body is presenting.
	EP: [
		'raspunsul-cortizolului-la-trezire',
		'inertia-somnului',
		'obosit-dar-alert-hyperarousal',
		'somnul-si-sistemul-imunitar'
	]
};
