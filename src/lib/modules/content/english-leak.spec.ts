import { describe, expect, it } from 'vitest';
import { findEnglishSentence } from './english-leak.ts';

// Review L-12: beyond the exact-match guards, a lifted English sentence in the
// editorial copy must trip the regeneration scripts' fail path.

describe('findEnglishSentence', () => {
	it('flags a lifted English sentence', () => {
		const text =
			'Somnul profund contează.\n' +
			'Deep sleep is the phase when your brain clears metabolic waste.\n';
		expect(findEnglishSentence(text)).toBe(
			'Deep sleep is the phase when your brain clears metabolic waste'
		);
	});

	it('passes normal Romanian editorial copy', () => {
		expect(
			findEnglishSentence(
				'Ghid practic despre fazele somnului: ce se întâmplă oră cu oră și cum îți afectează energia de a doua zi.'
			)
		).toBeNull();
	});

	it('does not split Romanian words at diacritics into fake English tokens', () => {
		// "sforăit" must not yield a fake "it"; the journal name alone (two
		// unambiguous stopwords) stays under the three-hit threshold.
		expect(
			findEnglishSentence(
				'Studiul publicat în Journal of Clinical Sleep Medicine a testat banda adezivă pe pacienți cu sforăit.'
			)
		).toBeNull();
	});

	it('tolerates isolated loanword phrases', () => {
		expect(findEnglishSentence('Te simți obosit, dar alert — „wired and tired".')).toBeNull();
	});

	it('shares no ambiguous Romanian spellings ("a", "are", "in", "un") as stopwords', () => {
		expect(findEnglishSentence('Corpul are un ritm: in extremis, a dormi e un reflex.')).toBeNull();
	});
});
