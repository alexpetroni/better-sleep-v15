import { describe, expect, it } from 'vitest';
import type { FormConfig } from 'formcomp';
import {
	answersFromSubmitAnswers,
	flattenStepResponses,
	pickBand,
	scoreQuiz,
	validateScoringConfig,
	type ScoringBand,
	type ScoringConfig
} from './scoring.ts';

// A small two-step schema exercising every scored question kind.
const FORM: FormConfig = {
	steps: [
		{
			id: 'noapte',
			label: 'Noaptea',
			groups: [
				{
					id: 'g1',
					label: 'Adormire',
					questions: [
						{
							id: 'adormire',
							type: 'single-select',
							label: 'Cât durează să adormi?',
							options: [
								{ value: 'sub-15', label: 'Sub 15 minute' },
								{ value: '15-30', label: '15–30 minute' },
								{ value: 'peste-30', label: 'Peste 30 de minute' }
							]
						},
						{
							id: 'factori',
							type: 'multi-select',
							label: 'Ce te ține treaz?',
							options: [
								{ value: 'ganduri', label: 'Gânduri' },
								{ value: 'zgomot', label: 'Zgomot' },
								{ value: 'nimic', label: 'Nimic', exclusive: true }
							]
						}
					]
				}
			]
		},
		{
			id: 'zi',
			label: 'Ziua',
			groups: [
				{
					id: 'g2',
					label: 'Impact',
					questions: [
						{ id: 'oboseala', type: 'scale', label: 'Oboseală', min: 1, max: 5 },
						{ id: 'cafele', type: 'number-input', label: 'Cafele pe zi', min: 0 }
					]
				}
			]
		}
	]
};

const BANDS: ScoringBand[] = [
	{ key: 'bun', min: 0, label: 'Somn bun', advice: 'Continuă așa.' },
	{ key: 'atentie', min: 5, label: 'Semne de atenție', advice: 'Corectează obiceiurile.' },
	{ key: 'risc', min: 10, label: 'Risc ridicat', advice: 'Vorbește cu un specialist.' }
];

const SCORING: ScoringConfig = {
	questions: {
		adormire: {
			kind: 'map',
			dimension: 'adormire',
			map: { 'sub-15': 0, '15-30': 2, 'peste-30': 4 }
		},
		factori: { kind: 'map', dimension: 'adormire', map: { ganduri: 2, zgomot: 1, nimic: 0 } },
		oboseala: { kind: 'numeric', dimension: 'zi' },
		cafele: { kind: 'numeric', dimension: 'zi', multiplier: 2, cap: 6 }
	},
	// Deliberately the LEGACY record shape: band-mode configs stored before
	// BS-9 keep scoring (order is cosmetic there); archetype mode requires the
	// ordered array — see the H-1 cases below.
	dimensions: {
		adormire: { label: 'Adormire' },
		zi: { label: 'Impact în timpul zilei' }
	},
	bands: BANDS
};

describe('pickBand', () => {
	const bands = BANDS;

	it('a score exactly on a threshold belongs to the higher band', () => {
		expect(pickBand(bands, 5).key).toBe('atentie');
		expect(pickBand(bands, 10).key).toBe('risc');
	});

	it('scores between thresholds fall in the lower band', () => {
		expect(pickBand(bands, 0).key).toBe('bun');
		expect(pickBand(bands, 4).key).toBe('bun');
		expect(pickBand(bands, 9).key).toBe('atentie');
		expect(pickBand(bands, 40).key).toBe('risc');
	});

	it('a score below every threshold falls into the first band', () => {
		expect(pickBand(bands, -3).key).toBe('bun');
	});

	it('throws on an empty band list', () => {
		expect(() => pickBand([], 1)).toThrow();
	});
});

describe('scoreQuiz', () => {
	it('sums per-answer points across map, multi-select and numeric questions', () => {
		const profile = scoreQuiz(FORM, SCORING, {
			adormire: 'peste-30', // 4
			factori: ['ganduri', 'zgomot'], // 2 + 1
			oboseala: 3, // 3
			cafele: 2 // 2 * 2
		});
		expect(profile.score).toBe(14);
		expect(profile.band.key).toBe('risc');
	});

	it('missing answers score 0 and still produce a band', () => {
		const profile = scoreQuiz(FORM, SCORING, {});
		expect(profile.score).toBe(0);
		expect(profile.band.key).toBe('bun');
		expect(profile.band.label).toBe('Somn bun');
	});

	it('unknown option values and non-numeric answers score 0', () => {
		const profile = scoreQuiz(FORM, SCORING, {
			adormire: 'inexistent',
			factori: ['altceva'],
			oboseala: 'multa',
			cafele: Number.NaN
		});
		expect(profile.score).toBe(0);
	});

	it('clamps numeric answers to the question min/max and applies cap', () => {
		const profile = scoreQuiz(FORM, SCORING, {
			oboseala: 99, // clamped to max 5
			cafele: 100 // 100*2 capped at 6
		});
		expect(profile.score).toBe(5 + 6);
	});

	it('negative numeric answers clamp to the question min', () => {
		const profile = scoreQuiz(FORM, SCORING, { cafele: -4 });
		expect(profile.score).toBe(0);
	});

	it('breaks the score down per dimension with ro labels', () => {
		const profile = scoreQuiz(FORM, SCORING, {
			adormire: '15-30',
			factori: ['ganduri'],
			oboseala: 2,
			cafele: 1
		});
		const adormire = profile.dimensions.find((d) => d.key === 'adormire');
		const zi = profile.dimensions.find((d) => d.key === 'zi');
		expect(adormire).toMatchObject({ label: 'Adormire', score: 4 });
		expect(zi).toMatchObject({ label: 'Impact în timpul zilei', score: 4 });
	});

	it('computes the maximum reachable score overall and per dimension', () => {
		const profile = scoreQuiz(FORM, SCORING, {});
		// adormire: max 4; factori: 2+1 (exclusive "nimic" scores 0); oboseala: 5; cafele: cap 6
		expect(profile.maxScore).toBe(4 + 3 + 5 + 6);
		expect(profile.dimensions.find((d) => d.key === 'adormire')?.maxScore).toBe(7);
		expect(profile.dimensions.find((d) => d.key === 'zi')?.maxScore).toBe(11);
	});

	it('reports a null maxScore when a numeric question is unbounded', () => {
		const scoring: ScoringConfig = {
			questions: { cafele: { kind: 'numeric' } }, // no question.max, no cap
			bands: BANDS
		};
		const profile = scoreQuiz(FORM, scoring, { cafele: 3 });
		expect(profile.score).toBe(3);
		expect(profile.maxScore).toBeNull();
	});
});

// A weights-kind config on the archetype form: which OPTION you pick decides
// which dimension(s) score.
function weightsScoring(): ScoringConfig {
	return {
		resultMode: 'archetype',
		questions: {
			ganduri: {
				kind: 'weights',
				weights: { lista: { MN: 2 }, scene: { RU: 2 }, garda: { ST: 2, MN: 1 } }
			},
			semne: {
				kind: 'weights',
				weights: { liste: { MN: 2 }, scenarii: { RU: 1, MN: 1 }, niciuna: {} }
			},
			fraza: { kind: 'weights', weights: { mn: { MN: 3 }, ru: { RU: 3 }, st: { ST: 3 } } }
		},
		dimensions: [
			{ key: 'MN', label: 'Managerul' },
			{ key: 'RU', label: 'Ruminatorul' },
			{ key: 'ST', label: 'Străjerul' }
		],
		archetypes: {
			MN: { label: 'Managerul', essence: 'Mintea rulează liste', advice: 'Copie MN.' },
			RU: { label: 'Ruminatorul', essence: 'Reia scene', advice: 'Copie RU.' },
			ST: { label: 'Străjerul', essence: 'Nu lasă garda jos', advice: 'Copie ST.' }
		},
		bands: [{ key: 'arhetip', min: 0, label: 'Tiparul tău', advice: 'Vezi rezultatul.' }]
	};
}

// Archetype mode: two single-selects scored into three archetype dimensions.
const ARCH_FORM: FormConfig = {
	steps: [
		{
			id: 'seara',
			label: 'Seara',
			groups: [
				{
					id: 'g1',
					label: 'Tipare',
					questions: [
						{
							id: 'ganduri',
							type: 'single-select',
							label: 'Ce se întâmplă în capul tău seara?',
							options: [
								{ value: 'lista', label: 'Lista de mâine' },
								{ value: 'scene', label: 'Scene din ziua trecută' },
								{ value: 'garda', label: 'Ascult casa' }
							]
						},
						{
							id: 'semne',
							type: 'multi-select',
							label: 'Ce ți se potrivește?',
							options: [
								{ value: 'liste', label: 'Fac liste în minte' },
								{ value: 'scenarii', label: 'Derulez scenarii' },
								{ value: 'niciuna', label: 'Niciuna', exclusive: true }
							]
						},
						{
							id: 'fraza',
							type: 'single-select',
							label: 'Care frază te descrie?',
							options: [
								{ value: 'mn', label: 'Mai am de făcut' },
								{ value: 'ru', label: 'Nu pot lăsa ce s-a întâmplat' },
								{ value: 'st', label: 'Nu e sigur să las garda jos' }
							]
						}
					]
				}
			]
		}
	]
};

const ARCH_SCORING: ScoringConfig = {
	resultMode: 'archetype',
	questions: {
		ganduri: { kind: 'map', dimension: 'MN', map: { lista: 2 } },
		fraza: { kind: 'map', dimension: 'RU', map: { ru: 3 } }
	},
	// Ordered array — position is the tie-break priority (H-1).
	dimensions: [
		{ key: 'MN', label: 'Managerul' },
		{ key: 'RU', label: 'Ruminatorul' },
		{ key: 'ST', label: 'Străjerul' }
	],
	archetypes: {
		MN: { label: 'Managerul', essence: 'Mintea rulează liste', advice: 'Copie MN.' },
		RU: { label: 'Ruminatorul', essence: 'Reia scene', advice: 'Copie RU.' },
		ST: { label: 'Străjerul', essence: 'Nu lasă garda jos', advice: 'Copie ST.' }
	},
	bands: [{ key: 'arhetip', min: 0, label: 'Tiparul tău', advice: 'Vezi rezultatul.' }]
};

// Same form, but RU and ST each get exactly 2 points → a deliberate tie.
const ARCH_TIE_SCORING: ScoringConfig = {
	...ARCH_SCORING,
	questions: {
		ganduri: { kind: 'map', dimension: 'RU', map: { scene: 2 } },
		fraza: { kind: 'map', dimension: 'ST', map: { st: 2 } }
	}
};

describe('scoreQuiz — archetype mode', () => {
	it('band mode profiles carry no archetype fields', () => {
		const profile = scoreQuiz(FORM, SCORING, { adormire: 'sub-15' });
		expect(profile.resultMode).toBeUndefined();
		expect(profile.winner).toBeUndefined();
		expect(profile.runnerUp).toBeUndefined();
	});

	it('picks the highest-scoring archetype as winner and the second as runnerUp', () => {
		const profile = scoreQuiz(ARCH_FORM, ARCH_SCORING, { ganduri: 'lista', fraza: 'ru' });
		expect(profile.resultMode).toBe('archetype');
		expect(profile.winner).toMatchObject({
			key: 'RU',
			score: 3,
			label: 'Ruminatorul',
			essence: 'Reia scene',
			advice: 'Copie RU.'
		});
		expect(profile.runnerUp).toMatchObject({ key: 'MN', score: 2, label: 'Managerul' });
		// The band path still works underneath (single catch-all band).
		expect(profile.band.key).toBe('arhetip');
	});

	it('breaks ties by declaration order in dimensions (documented tie-break)', () => {
		// RU and ST both score 2; MN scores 0. Declaration order: MN, RU, ST →
		// RU (earlier than ST) wins, ST is runner-up.
		const profile = scoreQuiz(ARCH_FORM, ARCH_TIE_SCORING, { ganduri: 'scene', fraza: 'st' });
		expect(profile.winner?.key).toBe('RU');
		expect(profile.runnerUp?.key).toBe('ST');
	});

	it('an all-zero submission still yields a winner, by declaration order', () => {
		const profile = scoreQuiz(ARCH_FORM, ARCH_SCORING, {});
		expect(profile.winner?.key).toBe('MN');
		expect(profile.runnerUp?.key).toBe('RU');
	});
});

describe('scoreQuiz — weights kind', () => {
	it('attributes points to the dimensions of the PICKED option', () => {
		const profile = scoreQuiz(ARCH_FORM, weightsScoring(), {
			ganduri: 'garda', // ST 2, MN 1
			semne: ['niciuna'],
			fraza: 'st' // ST 3
		});
		expect(profile.score).toBe(6);
		expect(profile.winner).toMatchObject({ key: 'ST', score: 5 });
		expect(profile.runnerUp).toMatchObject({ key: 'MN', score: 1 });
	});

	it('multi-select weights sum every selected value', () => {
		const profile = scoreQuiz(ARCH_FORM, weightsScoring(), {
			ganduri: 'scene', // RU 2
			semne: ['liste', 'scenarii'], // MN 2+1, RU 1
			fraza: 'ru' // RU 3
		});
		expect(profile.dimensions.find((d) => d.key === 'RU')?.score).toBe(6);
		expect(profile.dimensions.find((d) => d.key === 'MN')?.score).toBe(3);
		expect(profile.winner?.key).toBe('RU');
	});

	it('unknown and missing answers score 0', () => {
		const profile = scoreQuiz(ARCH_FORM, weightsScoring(), { ganduri: 'inexistent' });
		expect(profile.score).toBe(0);
	});

	it('computes the maximum reachable score overall and per dimension', () => {
		const profile = scoreQuiz(ARCH_FORM, weightsScoring(), {});
		// ganduri best option totals 3; semne positive totals 2+2; fraza 3.
		expect(profile.maxScore).toBe(3 + 4 + 3);
		// MN: best single option 2 (ganduri) + 2+1 (semne) + 3 (fraza).
		expect(profile.dimensions.find((d) => d.key === 'MN')?.maxScore).toBe(8);
		// ST: 2 (ganduri) + 0 (semne) + 3 (fraza).
		expect(profile.dimensions.find((d) => d.key === 'ST')?.maxScore).toBe(5);
	});
});

describe('validateScoringConfig — weights kind', () => {
	it('accepts the reference weights config', () => {
		expect(validateScoringConfig(ARCH_FORM, weightsScoring())).toEqual([]);
	});

	it('rejects weight values that are not options of the question', () => {
		const bad = weightsScoring();
		bad.questions.ganduri = { kind: 'weights', weights: { 'nu-exista': { MN: 2 } } };
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('nu-exista');
	});

	it('rejects weights that reference undeclared dimensions', () => {
		const bad = weightsScoring();
		bad.questions.ganduri = { kind: 'weights', weights: { lista: { XX: 2 } } };
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('"XX"');
	});

	it('rejects non-numeric weight points', () => {
		const bad = weightsScoring();
		bad.questions.ganduri = {
			kind: 'weights',
			// @ts-expect-error — deliberately malformed untrusted JSON
			weights: { lista: { MN: 'două' } }
		};
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('număr');
	});
});

describe('validateScoringConfig — archetype mode', () => {
	it('accepts the reference archetype config', () => {
		expect(validateScoringConfig(ARCH_FORM, ARCH_SCORING)).toEqual([]);
	});

	it('rejects an unknown resultMode', () => {
		const bad = { ...ARCH_SCORING, resultMode: 'winner' };
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('resultMode');
	});

	it('rejects a dimension with no matching archetypes entry', () => {
		const bad = {
			...ARCH_SCORING,
			archetypes: { MN: ARCH_SCORING.archetypes!.MN, RU: ARCH_SCORING.archetypes!.RU }
		};
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('"ST"');
	});

	it('rejects an archetypes entry with no matching dimension', () => {
		const bad = {
			...ARCH_SCORING,
			archetypes: {
				...ARCH_SCORING.archetypes,
				EP: { label: 'Epuizatul', essence: 'Nu mai are din ce', advice: 'Copie EP.' }
			}
		};
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('"EP"');
	});

	it('rejects archetype mode without archetypes or with malformed entries', () => {
		const withoutArchetypes = { ...ARCH_SCORING, archetypes: undefined };
		expect(validateScoringConfig(ARCH_FORM, withoutArchetypes).join(' ')).toContain('archetypes');
		const malformed = {
			...ARCH_SCORING,
			archetypes: { ...ARCH_SCORING.archetypes, MN: { label: 'Managerul' } }
		};
		expect(validateScoringConfig(ARCH_FORM, malformed).join(' ')).toContain('"MN"');
	});

	it('rejects archetype mode with fewer than two dimensions', () => {
		const bad = {
			...ARCH_SCORING,
			questions: { ganduri: { kind: 'map', dimension: 'MN', map: { lista: 2 } } },
			dimensions: [{ key: 'MN', label: 'Managerul' }],
			archetypes: { MN: ARCH_SCORING.archetypes!.MN }
		};
		expect(validateScoringConfig(ARCH_FORM, bad).join(' ')).toContain('două dimensiuni');
	});
});

describe('answer flattening', () => {
	it('flattens formcomp step responses to a questionId map', () => {
		expect(flattenStepResponses({ noapte: { adormire: 'sub-15' }, zi: { oboseala: 2 } })).toEqual({
			adormire: 'sub-15',
			oboseala: 2
		});
	});

	it('maps a formcomp submit payload answers array by questionId', () => {
		expect(
			answersFromSubmitAnswers([
				{ questionId: 'adormire', value: 'sub-15' },
				{ questionId: 'oboseala', value: 4 }
			])
		).toEqual({ adormire: 'sub-15', oboseala: 4 });
	});
});

describe('validateScoringConfig', () => {
	it('accepts the reference scoring config', () => {
		expect(validateScoringConfig(FORM, SCORING)).toEqual([]);
	});

	it('rejects non-object input and missing pieces', () => {
		expect(validateScoringConfig(FORM, null).length).toBeGreaterThan(0);
		expect(validateScoringConfig(FORM, { questions: {} }).length).toBeGreaterThan(0);
		expect(validateScoringConfig(FORM, { bands: BANDS }).length).toBeGreaterThan(0);
	});

	it('rejects empty or non-increasing bands', () => {
		expect(validateScoringConfig(FORM, { questions: {}, bands: [] }).join(' ')).toContain('band');
		const unordered = {
			questions: {},
			bands: [
				{ key: 'a', min: 5, label: 'A', advice: 'a' },
				{ key: 'b', min: 5, label: 'B', advice: 'b' }
			]
		};
		expect(validateScoringConfig(FORM, unordered).join(' ')).toContain('crescătoare');
	});

	it('rejects scored questions that do not exist in the form schema', () => {
		const scoring = { questions: { fantoma: { kind: 'map', map: { a: 1 } } }, bands: BANDS };
		expect(validateScoringConfig(FORM, scoring).join(' ')).toContain('fantoma');
	});

	it('rejects map keys that are not options of the question', () => {
		const scoring = {
			questions: { adormire: { kind: 'map', map: { 'nu-exista': 3 } } },
			bands: BANDS
		};
		expect(validateScoringConfig(FORM, scoring).join(' ')).toContain('nu-exista');
	});

	it('rejects references to undeclared dimensions', () => {
		const scoring = {
			questions: { oboseala: { kind: 'numeric', dimension: 'necunoscut' } },
			bands: BANDS
		};
		expect(validateScoringConfig(FORM, scoring).join(' ')).toContain('necunoscut');
	});

	// H-1: the ordered-array dimensions shape is canonical; the legacy record
	// shape stays readable but archetype mode refuses it (its order would be
	// jsonb's key sort, not the author's tie-break intent).
	it('accepts ordered-array dimensions and rejects duplicate keys in it', () => {
		const ok = {
			...SCORING,
			dimensions: [
				{ key: 'adormire', label: 'Adormire' },
				{ key: 'zi', label: 'Impact în timpul zilei' }
			]
		};
		expect(validateScoringConfig(FORM, ok)).toEqual([]);
		const dup = {
			...ok,
			dimensions: [
				{ key: 'zi', label: 'A' },
				{ key: 'zi', label: 'B' }
			]
		};
		expect(validateScoringConfig(FORM, dup).join(' ')).toContain('de două ori');
	});

	it('archetype mode refuses record-shaped dimensions (order would not survive jsonb)', () => {
		const legacyShape = {
			resultMode: 'archetype',
			questions: {},
			dimensions: { MN: { label: 'Managerul' }, RU: { label: 'Ruminatorul' } },
			archetypes: {
				MN: { label: 'Managerul', essence: 'x', advice: 'x' },
				RU: { label: 'Ruminatorul', essence: 'x', advice: 'x' }
			},
			bands: BANDS
		};
		expect(validateScoringConfig(FORM, legacyShape).join(' ')).toContain('listă ordonată');
	});

	it('band mode still scores a legacy record-shaped config (backward compatibility)', () => {
		expect(validateScoringConfig(FORM, SCORING)).toEqual([]);
		const profile = scoreQuiz(FORM, SCORING, { adormire: 'peste-30', oboseala: 2 });
		expect(profile.dimensions.find((d) => d.key === 'adormire')?.score).toBe(4);
		expect(profile.dimensions.find((d) => d.key === 'zi')?.score).toBe(2);
	});
});
