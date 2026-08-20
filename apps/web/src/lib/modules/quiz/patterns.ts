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
	/** Deck-verbatim card title. */
	title: string;
	/** Archetypes whose mechanism produces this lived pattern. */
	archetypeIds: readonly ArchetypeId[];
}

export const SLEEP_PATTERNS: readonly SleepPattern[] = [
	{
		// "Corpul e obosit, capul nu se oprește" — evening activation:
		// guard up (ST), running lists (MN), replays (RU), self-evaluation (PE).
		slug: 'adormitul-imposibil',
		title: 'ADORMITUL IMPOSIBIL',
		archetypeIds: ['ST', 'MN', 'RU', 'PE']
	},
	{
		// The 3 AM wake — maintenance: nocturnal cortisol spikes from held-in
		// tension (VU), a dysregulated HPA axis (EP), or a mind that reopens
		// the day's files the moment it surfaces (RU).
		slug: 'trezirea-de-la-3',
		title: 'TREZIREA DE LA 3',
		archetypeIds: ['RU', 'VU', 'EP']
	},
	{
		// Non-restorative sleep — depth: fragmentation by stimuli (AN), a body
		// that never got permission to stop (SA), exhausted reserves (EP).
		slug: 'somnul-care-nu-odihneste',
		title: 'SOMNUL CARE NU ODIHNEȘTE',
		archetypeIds: ['AN', 'SA', 'EP']
	},
	{
		// Displaced circadian clock — synchronisation: late-night stimulation
		// (FU) and "just one more task" evenings that push the whole schedule (MN).
		slug: 'ritmul-dat-peste-cap',
		title: 'RITMUL DAT PESTE CAP',
		archetypeIds: ['FU', 'MN']
	}
] as const;
