import type { ArchetypeId, ArchetypeInfo, FlagId, FlagInfo, SelyePhase } from '$lib/types';

export const archetypes: Record<ArchetypeId, ArchetypeInfo> = {
  ST: {
    id: 'ST',
    name: 'Străjerul',
    essence: 'Hipervigilent, scanează pericole, nu poate lăsa garda',
    keyPhrase: 'Nu e sigur să mă opresc'
  },
  MN: {
    id: 'MN',
    name: 'Managerul',
    essence: 'Mintea rulează proiecte, planuri, liste',
    keyPhrase: 'Mai am de făcut'
  },
  RU: {
    id: 'RU',
    name: 'Ruminatorul',
    essence: 'Reia scene, conversații, replici nespuse',
    keyPhrase: 'Nu pot lăsa ce s-a întâmplat'
  },
  VU: {
    id: 'VU',
    name: 'Vulcanul',
    essence: 'Furie, frustrare ținute înăuntru, maxilar strâns',
    keyPhrase: 'Țin totul în mine'
  },
  SA: {
    id: 'SA',
    name: 'Salvatorul',
    essence: 'Are grijă de toți, se pune ultimul, vinovăție la oprire',
    keyPhrase: 'Nu am voie să mă opresc'
  },
  PE: {
    id: 'PE',
    name: 'Perfecționistul',
    essence: 'Se evaluează constant, standarde imposibile',
    keyPhrase: 'Nu e suficient de bine'
  },
  AN: {
    id: 'AN',
    name: 'Antena',
    essence: 'Hipersensibil la stimuli — sunet, lumină, EMF',
    keyPhrase: 'Simt tot ce alții nu simt'
  },
  FU: {
    id: 'FU',
    name: 'Fugarul',
    essence: 'Caută stimulare, evită liniștea, dopamină',
    keyPhrase: 'Nu pot sta fără ceva'
  },
  EP: {
    id: 'EP',
    name: 'Epuizatul',
    essence: 'A fost puternic mult timp, acum nu mai poate',
    keyPhrase: 'Nu mai am din ce'
  }
};

export const flags: Record<FlagId, FlagInfo> = {
  'F-HORM': {
    id: 'F-HORM',
    name: 'Dezechilibru hormonal',
    description: 'Femei cu simptome ciclice/menopauză'
  },
  'F-META': {
    id: 'F-META',
    name: 'Instabilitate metabolică',
    description: 'Treziri cu foame/tremor/palpitații'
  },
  'F-INFL': {
    id: 'F-INFL',
    name: 'Inflamație de fond',
    description: 'Somn neodihnitor + corp greu + ceață'
  },
  'F-SEDE': {
    id: 'F-SEDE',
    name: 'Sedentarism cognitiv',
    description: 'Muncă intelectuală + puțină mișcare'
  },
  'F-NOCT': {
    id: 'F-NOCT',
    name: 'Nocturie',
    description: 'Treziri frecvente pentru baie'
  },
  'F-DUR': {
    id: 'F-DUR',
    name: 'Durere',
    description: 'Dureri care afectează somnul'
  },
  'F-RESP': {
    id: 'F-RESP',
    name: 'Respirator',
    description: 'Sforăit, apnee suspectată'
  },
  'F-RLS': {
    id: 'F-RLS',
    name: 'Picioare neliniștite',
    description: 'Neliniște / nevoia de mișcare în picioare'
  }
};

export const selyeLabels: Record<SelyePhase, { name: string; description: string }> = {
  ALARMA: {
    name: 'Alarmă',
    description: 'Corpul tău este în modul de luptă sau fugă. Funcționezi, dar cu un cost pe care poate nu îl vezi încă. Sistemul tău nervos este hiperactiv și interpretează totul ca pe o urgență — inclusiv somnul.'
  },
  REZISTENTA: {
    name: 'Rezistență',
    description: 'Ai rezistat mult timp, dar costul devine vizibil. Iritarea, oboseala și tensiunea sunt semne că organismul tău consumă mai mult decât regenerează. Încă funcționezi, dar pe rezerve.'
  },
  EPUIZARE: {
    name: 'Epuizare',
    description: 'Resursele tale de adaptare s-au epuizat. Paradoxul "obosit dar nu pot dormi" este semnul clasic al acestei faze. Corpul tău nu mai are energie nici să doarmă, nici să stea treaz cu adevărat. Nu e lipsă de voință — e lipsă de resurse.'
  }
};

export const allArchetypeIds: ArchetypeId[] = ['ST', 'MN', 'RU', 'VU', 'SA', 'PE', 'AN', 'FU', 'EP'];
