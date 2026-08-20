export type ArchetypeId = 'ST' | 'MN' | 'RU' | 'VU' | 'SA' | 'PE' | 'AN' | 'FU' | 'EP';

export type FlagId = 'F-HORM' | 'F-META' | 'F-INFL' | 'F-SEDE' | 'F-NOCT' | 'F-DUR' | 'F-RESP' | 'F-RLS';

export type SelyePhase = 'ALARMA' | 'REZISTENTA' | 'EPUIZARE';

export type Branch = 'MINTE' | 'CORP' | 'EMOTII' | 'EXTERIOR';

export type Phase = 'legatura' | 'profunzime' | 'context' | 'precizie' | 'inchidere';

export type QuestionType = 'single' | 'multi' | 'demographic';

export type OnsetContext = 'INVATAT' | 'GRADUAL' | 'MEREU';

export interface Option {
  label: string;
  value: string;
  scoring?: Partial<Record<ArchetypeId, number>>;
  flags?: FlagId[];
  setSelye?: SelyePhase;
  setBranch?: Branch;
  setOnset?: OnsetContext;
  setState?: Record<string, boolean | string>;
}

export interface Question {
  id: string;
  phase: Phase;
  phaseLabel?: string;
  text: string;
  subtext?: string;
  type: QuestionType;
  options: Option[];
  condition?: (state: QuestionnaireState) => boolean;
}

export interface DemographicAnswer {
  age: 'sub25' | '25-40' | '40-55' | 'peste55';
  gender: 'F' | 'M';
}

export interface QuestionnaireState {
  answers: Record<string, string | string[]>;
  scores: Record<ArchetypeId, number>;
  flags: Set<FlagId>;
  branch: Branch | null;
  selye: SelyePhase | null;
  onset: OnsetContext | null;
  demographic: DemographicAnswer | null;
  adormireGrea: boolean;
  treziri: boolean;
  trezirePrecoce: boolean;
  neodihnitor: boolean;
  flagIncert: boolean;
  externalFactors: string[];
}

export interface ArchetypeInfo {
  id: ArchetypeId;
  name: string;
  essence: string;
  keyPhrase: string;
}

export interface FlagInfo {
  id: FlagId;
  name: string;
  description: string;
}

export interface Result {
  dominant: ArchetypeId;
  dominantScore: number;
  secondary: ArchetypeId | null;
  secondaryScore: number;
  selye: SelyePhase;
  onset: OnsetContext;
  flags: FlagId[];
  allScores: Record<ArchetypeId, number>;
}

export interface ArchetypeResult {
  recognition: string;
  mechanism: string;
  doNot: string[];
  safeToDoList: string[];
}

export interface ArchetypePhaseTexts {
  ALARMA: ArchetypeResult;
  REZISTENTA: ArchetypeResult;
  EPUIZARE: ArchetypeResult;
}
