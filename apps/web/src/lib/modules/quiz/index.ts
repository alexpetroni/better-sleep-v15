// Universal barrel: the pure scoring engine, validation and types — usable
// from client code (admin editor preview) and unit tests. Db-bound services
// live in ./server.
export type { QuizResultRow, QuizRow, QuizStatus, StoredAnswer } from './schema.ts';
export {
	answersFromSubmitAnswers,
	pickBand,
	scoreQuiz,
	validateScoringConfig,
	type ArchetypeDefinition,
	type ArchetypeResult,
	type DimensionScore,
	type QuestionScoring,
	type QuizAnswers,
	type QuizProfile,
	type ScoringBand,
	type ScoringConfig
} from './scoring.ts';
export { countQuestions, validateForPublish, validateFormSchema } from './validate.ts';
export { ARCHETYPE_IDS, SLEEP_PATTERNS, type ArchetypeId, type SleepPattern } from './patterns.ts';
export { ARCHETYPE_ARTICLES } from './archetype-articles.ts';
export {
	ARCHETYPE_PAGES,
	ARCHETYPE_PAGES_BY_SLUG,
	ARCHETYPE_QUIZ_SLUG,
	type ArchetypePage
} from './archetype-pages.ts';
