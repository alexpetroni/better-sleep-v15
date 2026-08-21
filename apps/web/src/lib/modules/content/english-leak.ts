// Cheap English-leak heuristic for the content regeneration scripts (L-12).
//
// The exact-match guards catch a verbatim copy of the English working copy
// (topics.json titles/excerpts, zenyth blurbs) but not a lifted sentence. This
// heuristic flags a sentence that reads as English: three or more DISTINCT
// English function words that are not also Romanian words. Romanian shares
// spellings with several English stopwords ("a", "are", "in", "an", "to"
// (t,o)), so the list holds only unambiguous ones — loanword phrases like
// "wired and tired" (one hit) stay under the threshold.

const ENGLISH_STOPWORDS = [
	'the',
	'of',
	'and',
	'with',
	'your',
	'from',
	'that',
	'this',
	'what',
	'when',
	'how',
	'why',
	'you',
	'for',
	'but',
	'not',
	'sleep',
	'night',
	'is',
	'it',
	'can',
	'will',
	'have',
	'has',
	'more',
	'most'
] as const;

// Romanian letters (both comma-below and legacy cedilla forms) stay inside a
// token — otherwise "sforăit" would split into "sfor" + a fake English "it".
const WORD_RE = /[a-zA-ZăâîșțşţĂÂÎȘȚŞŢ]+/g;
const DISTINCT_HITS_THRESHOLD = 3;

/** The first sentence that reads as English, or null when the text is clean. */
export function findEnglishSentence(text: string): string | null {
	for (const sentence of text.split(/[.!?\n]+/)) {
		const hits = new Set<string>();
		for (const word of sentence.match(WORD_RE) ?? []) {
			const lower = word.toLowerCase();
			if ((ENGLISH_STOPWORDS as readonly string[]).includes(lower)) hits.add(lower);
		}
		if (hits.size >= DISTINCT_HITS_THRESHOLD) return sentence.trim();
	}
	return null;
}
