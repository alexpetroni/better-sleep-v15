/**
 * The four public sleep patterns from the landing copy deck (block 3,
 * "Recunoaște-te") mapped to the archetype ids scored by the seeded
 * `arhetip-somn` quiz. A pattern is a lived nightly symptom; several
 * archetypes can produce it, so the mapping is deliberately many-to-many —
 * together the four patterns cover all nine archetypes. Consumed by the
 * landing page (BS-5) and the archetype pages (BS-4).
 */

/** The nine archetype ids, as in the vendored source material (EP is a stage, not a "type"). */
export type ArchetypeId = 'ST' | 'MN' | 'RU' | 'VU' | 'SA' | 'PE' | 'AN' | 'FU' | 'EP';

export const ARCHETYPE_IDS: readonly ArchetypeId[] = [
	'ST',
	'MN',
	'RU',
	'VU',
	'SA',
	'PE',
	'AN',
	'FU',
	'EP'
] as const;

export interface SleepPattern {
	slug: string;
	/** Archetypes whose mechanism produces this lived pattern. */
	archetypeIds: readonly ArchetypeId[];
}

/**
 * Card copy (title/symptom/mechanism) lives in Paraglide (`home_pattern_*`),
 * not here (L-10) — this list is the slug + archetype mapping only.
 * `satisfies` keeps the slugs as LITERAL types so `PatternSlug` below is a
 * union: a copy map keyed on it fails to COMPILE when a slug is renamed
 * (review M-14), instead of shipping a half-empty card.
 */
export const SLEEP_PATTERNS = [
	{
		// "Corpul e obosit, capul nu se oprește" — evening activation:
		// guard up (ST), running lists (MN), replays (RU), self-evaluation (PE).
		slug: 'adormitul-imposibil',
		archetypeIds: ['ST', 'MN', 'RU', 'PE']
	},
	{
		// The 3 AM wake — maintenance: nocturnal cortisol spikes from held-in
		// tension (VU), a dysregulated HPA axis (EP), or a mind that reopens
		// the day's files the moment it surfaces (RU).
		slug: 'trezirea-de-la-3',
		archetypeIds: ['RU', 'VU', 'EP']
	},
	{
		// Non-restorative sleep — depth: fragmentation by stimuli (AN), a body
		// that never got permission to stop (SA), exhausted reserves (EP).
		slug: 'somnul-care-nu-odihneste',
		archetypeIds: ['AN', 'SA', 'EP']
	},
	{
		// Displaced circadian clock — synchronisation: late-night stimulation
		// (FU) and "just one more task" evenings that push the whole schedule (MN).
		slug: 'ritmul-dat-peste-cap',
		archetypeIds: ['FU', 'MN']
	}
] as const satisfies readonly SleepPattern[];

/** The four pattern slugs as a literal union — see SLEEP_PATTERNS. */
export type PatternSlug = (typeof SLEEP_PATTERNS)[number]['slug'];
