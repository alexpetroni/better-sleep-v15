import type { FormConfig } from 'formcomp';
import type { ArchetypeDefinition, ScoringConfig } from './scoring.ts';
import type { ArchetypeId } from './patterns.ts';

/**
 * The archetype quiz (`/quiz/arhetip-somn`): 12 Romanian questions across 3
 * steps, scored in `archetype` mode into the nine sleep archetypes from the
 * vendored source material (.initialData/archetypes.ts + archetype-copy/).
 * The copy names the visitor's lived nightly experience — no clinical-
 * instrument register, per the landing copy deck. The result is shown
 * WITHOUT requiring an email (deliberate product decision from the deck).
 */

export const ARCHETYPE_QUIZ_FORM: FormConfig = {
	version: 1,
	steps: [
		{
			id: 'seara',
			label: 'Seara',
			intro: 'Gândește-te la o seară obișnuită din ultimele săptămâni.',
			groups: [
				{
					id: 'g-seara',
					label: 'Înainte de culcare',
					questions: [
						{
							id: 'seara_in_pat',
							uuid: 'q-arhetip-seara-in-pat',
							type: 'single-select',
							label: 'Stingi lumina. Ce se întâmplă în capul tău?',
							required: true,
							options: [
								{
									value: 'lista',
									label: 'Pornește lista: ce am de făcut mâine, ce n-am terminat azi'
								},
								{ value: 'reluari', label: 'Reiau scene și conversații din ziua care a trecut' },
								{
									value: 'garda',
									label: 'Rămân în gardă: aud casa, orice sunet mă ține atent(ă)'
								},
								{
									value: 'telefon',
									label: 'Întind mâna după telefon — încă puțin scroll, încă un episod'
								}
							]
						},
						{
							id: 'seara_corp',
							uuid: 'q-arhetip-seara-corp',
							type: 'single-select',
							label: 'Ce simți în corp seara, când ar trebui să te relaxezi?',
							required: true,
							options: [
								{
									value: 'incordare',
									label: 'Maxilar încleștat, umeri ridicați, tensiune peste tot'
								},
								{
									value: 'alerta',
									label: 'Inimă alertă, corp gata de acțiune — deși sunt obosit(ă)'
								},
								{
									value: 'gol',
									label: 'Un gol de energie: obosit(ă) până în oase, dar fără somn'
								},
								{
									value: 'neliniste',
									label: 'Neliniște — nu pot sta locului fără ceva care să mă țină ocupat(ă)'
								}
							]
						},
						{
							id: 'seara_ganduri',
							uuid: 'q-arhetip-seara-ganduri',
							type: 'single-select',
							label: 'Care gânduri revin cel mai des înainte de culcare?',
							required: true,
							options: [
								{ value: 'sarcini', label: 'Sarcini, planuri, lucruri de organizat' },
								{
									value: 'discutii',
									label: 'Discuții încheiate prost și replici pe care nu le-am spus'
								},
								{ value: 'standard', label: 'Ce n-am făcut destul de bine azi' },
								{
									value: 'ceilalti',
									label: 'Dacă cei din jur sunt bine și ce au nevoie mâine de la mine'
								}
							]
						},
						{
							id: 'seara_amanare',
							uuid: 'q-arhetip-seara-amanare',
							type: 'single-select',
							label: 'Cum arată drumul tău spre pat?',
							required: true,
							options: [
								{ value: 'aman', label: 'Amân culcarea — seara e singurul timp doar al meu' },
								{
									value: 'devreme',
									label: 'Mă culc devreme tocmai pentru că sunt epuizat(ă) — și tot nu adorm'
								},
								{
									value: 'lucrez',
									label: 'Mai rămân „doar 10 minute” să închei ce am început — se fac 40'
								},
								{
									value: 'ritual',
									label:
										'Am nevoie ca totul să fie pregătit perfect: liniște, întuneric, fără surprize'
								}
							]
						}
					]
				}
			]
		},
		{
			id: 'noaptea',
			label: 'Noaptea',
			groups: [
				{
					id: 'g-noaptea',
					label: 'Ce se întâmplă noaptea',
					questions: [
						{
							id: 'noapte_treziri',
							uuid: 'q-arhetip-noapte-treziri',
							type: 'single-select',
							label: 'Cum arată trezirile tale din timpul nopții?',
							required: true,
							options: [
								{
									value: 'zgomot',
									label: 'Mă trezește orice: un zgomot mic, o mișcare, o lumină'
								},
								{ value: 'trei', label: 'Mă trezesc în jur de 3 și mintea pornește imediat' },
								{ value: 'epuizat', label: 'Mă trezesc stors/stoarsă, dar nu mai pot readormi' },
								{
									value: 'tensionat',
									label: 'Mă trezesc încordat(ă), cu nervii întinși, uneori cu pumnii strânși'
								}
							]
						},
						{
							id: 'noapte_cauza',
							uuid: 'q-arhetip-noapte-cauza',
							type: 'single-select',
							label: 'Când te trezești noaptea, ce pare să te fi trezit?',
							required: true,
							options: [
								{
									value: 'stimuli',
									label: 'Un stimul concret: lumină, sunet, partenerul care se mișcă'
								},
								{
									value: 'grija',
									label:
										'Un radar pentru ceilalți: copiii, cineva care ar putea avea nevoie de mine'
								},
								{
									value: 'alarma',
									label: 'O alarmă interioară fără motiv: inima bate tare, corpul e treaz'
								},
								{
									value: 'greseli',
									label: 'Un gând despre o greșeală sau ceva ce trebuia făcut mai bine'
								}
							]
						},
						{
							id: 'noapte_reactie',
							uuid: 'q-arhetip-noapte-reactie',
							type: 'single-select',
							label: 'Ești treaz(ă) la 3 dimineața. Ce faci?',
							required: true,
							options: [
								{ value: 'scroll', label: 'Iau telefonul — măcar să fie ceva de văzut' },
								{ value: 'planuri', label: 'Îmi organizez ziua de mâine în minte' },
								{ value: 'reiau', label: 'Reiau ziua de ieri, scenă cu scenă' },
								{
									value: 'ascult',
									label: 'Stau nemișcat(ă) și ascult — casa, strada, respirația celorlalți'
								}
							]
						},
						{
							id: 'dimineata',
							uuid: 'q-arhetip-dimineata',
							type: 'single-select',
							label: 'Primul gând dimineața este cel mai des…',
							required: true,
							options: [
								{
									value: 'de-facut',
									label: '„Ce am de făcut azi” — lista pornește înainte să cobor din pat'
								},
								{ value: 'nota', label: '„Cum m-am descurcat ieri” — îmi dau singur(ă) note' },
								{ value: 'ceilalti', label: '„Cine are nevoie de mine azi”' },
								{
									value: 'rezervor',
									label: '„Cum trec prin ziua asta” — rezervorul e gol de la start'
								}
							]
						}
					]
				}
			]
		},
		{
			id: 'ziua',
			label: 'Ziua și tu',
			groups: [
				{
					id: 'g-ziua',
					label: 'Cum îți trăiești ziua',
					questions: [
						{
							id: 'zi_tipar',
							uuid: 'q-arhetip-zi-tipar',
							type: 'single-select',
							label: 'În timpul zilei te recunoști cel mai mult în…',
							required: true,
							options: [
								{
									value: 'fara-pauza',
									label: 'Am grijă de toți, fără pauze — pauza vine cu vinovăție'
								},
								{
									value: 'stimulare',
									label: 'Nu pot sta degeaba: mereu un ecran, un sunet, ceva de făcut'
								},
								{ value: 'inghit', label: 'Mă irită multe, dar înghit și merg mai departe' },
								{
									value: 'garda-zi',
									label: 'Sunt mereu cu garda sus — greu să mă simt complet în siguranță'
								}
							]
						},
						{
							id: 'zi_odihna',
							uuid: 'q-arhetip-zi-odihna',
							type: 'single-select',
							label: 'Ce relație ai cu odihna?',
							required: true,
							options: [
								{
									value: 'vinovatie',
									label: 'Odihna vine la pachet cu vinovăția — simt că ar trebui să fac ceva'
								},
								{
									value: 'plictiseala',
									label: 'Odihna mă neliniștește — fără stimulare mă simt gol/goală'
								},
								{
									value: 'nu-pot',
									label: 'Aș vrea să mă odihnesc, dar corpul nu mai știe cum să se oprească'
								},
								{
									value: 'organizata',
									label: 'Odihna e o rubrică în program — și rar apuc să o bifez'
								}
							]
						},
						{
							id: 'semne_corp',
							uuid: 'q-arhetip-semne-corp',
							type: 'multi-select',
							label: 'Care dintre acestea ți se potrivesc? Poți alege mai multe.',
							required: true,
							options: [
								{ value: 'maxilar', label: 'Îmi încleștez maxilarul sau scrâșnesc din dinți' },
								{
									value: 'sensibil',
									label: 'Simt lumina, sunetele sau textura hainelor mai intens decât ceilalți'
								},
								{ value: 'standarde', label: 'Îmi setez standarde pe care rar le ating' },
								{ value: 'sleit', label: 'Simt că nu mai am din ce să dau' },
								{ value: 'replici', label: 'Port în minte conversații vechi zile întregi' },
								{ value: 'niciuna', label: 'Niciuna dintre acestea', exclusive: true }
							]
						},
						{
							id: 'fraza',
							uuid: 'q-arhetip-fraza',
							type: 'single-select',
							label: 'La final: care frază te descrie cel mai bine seara?',
							required: true,
							options: [
								{ value: 'st', label: '„Nu e sigur să las garda jos.”' },
								{ value: 'mn', label: '„Mai am de făcut.”' },
								{ value: 'ru', label: '„Nu pot lăsa ce s-a întâmplat.”' },
								{ value: 'vu', label: '„Țin totul în mine.”' },
								{ value: 'sa', label: '„Nu am voie să mă opresc.”' },
								{ value: 'pe', label: '„Nu e suficient de bine.”' },
								{ value: 'an', label: '„Simt tot ce alții nu simt.”' },
								{ value: 'fu', label: '„Nu pot sta fără ceva pornit.”' },
								{ value: 'ep', label: '„Nu mai am din ce.”' }
							]
						}
					]
				}
			]
		}
	]
};

/**
 * "What it means" result copy per archetype, adapted (condensed, site voice)
 * from the vendored long-form copy in `.initialData/archetype-copy/`.
 * Paragraphs are separated by blank lines; the result page splits on them.
 */
const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
	ST: {
		label: 'Străjerul',
		essence: 'Hipervigilent, scanează pericole, nu poate lăsa garda jos',
		advice:
			'Ești persoana care aude casa noaptea. Verificările, urechea mereu atentă, corpul care nu se lasă complet — nu e ceva greșit la tine. Ai un sistem nervos foarte competent, antrenat să te protejeze, care nu a primit niciodată semnalul clar că poate ieși din tură.\n\nÎn spate e un sistem de alertă care rămâne pornit seara: cortizolul — hormonul de alertă — nu coboară când ar trebui, iar „frâna” de relaxare a corpului e slăbită. Vestea bună: frâna asta se antrenează, iar ritmul de cortizol se recalibrează. Nu e permanent — e un dezechilibru funcțional care răspunde bine la semnale de siguranță repetate, nu la tehnici agresive de relaxare.'
	},
	MN: {
		label: 'Managerul',
		essence: 'Mintea rulează proiecte, planuri, liste',
		advice:
			'Stingi lumina și, în loc de liniște, auzi lista de mâine. Planifici, anticipezi, verifici — și o faci excelent ziua. Problema nu e dezorganizarea, ci exact opusul: o minte atât de competentă în a gestiona încât nu știe să se oprească din gestionat.\n\nZona din creier care planifică și decide rămâne „aprinsă” seara, pentru că nu primește un semnal clar de program încheiat, iar cortizolul o susține exact cât să te țină în modul „gata de acțiune”. Vestea bună: acest circuit răspunde foarte bine la ritualuri de închidere. Nu trebuie să-ți schimbi felul de a fi — trebuie doar să-i dai creierului un buton de oprire pe care încă nu-l are.'
	},
	RU: {
		label: 'Ruminatorul',
		essence: 'Reia scene, conversații, replici nespuse',
		advice:
			'Ești persoana care reface conversații în minte, care găsește replica perfectă cu ore întârziere, care nu poate lăsa un subiect nerezolvat neanalizat. Nu ești „prea” nimic: ai un creier cu o capacitate analitică remarcabilă, care nu a învățat încă unde e comutatorul de oprit.\n\nCeea ce trăiești noaptea nu e anxietate clasică — e rețeaua din creier care se activează când nu faci nimic concret și care la tine rulează la intensitate prea mare, fix seara, când filtrul care pune ordine în gânduri e obosit după o zi întreagă. Rezultatul: gânduri fără prioritate și fără punct de oprire. Nu e ceva structural — e un dezechilibru funcțional, iar rețeaua asta se poate liniști cu intervenții concrete.'
	},
	VU: {
		label: 'Vulcanul',
		essence: 'Furie și frustrare ținute înăuntru, maxilar încleștat',
		advice:
			'Maxilarul încleștat, umerii ridicați, tensiunea din tot corpul seara — și, dacă te întreabă cineva, „nu ești furios(oasă), doar tensionat(ă)”. Dar corpul spune altceva: frustrarea neexprimată nu dispare, se depozitează în mușchi, în maxilar, în stomac. Noaptea, când nu mai are ce să o distragă, iese la suprafață.\n\nFuria reprimată ține pornit modul „luptă” al corpului: tonus muscular ridicat, cortizol persistent, activare de fond. Somnul cere exact opusul — relaxare musculară profundă. Vestea bună: nu trebuie să „rezolvi” furia ca să dormi. E suficient să-i dai corpului o cale de descărcare sigură seara, iar tensiunea scade destul cât să lase somnul să vină.'
	},
	SA: {
		label: 'Salvatorul',
		essence: 'Are grijă de toți, pe sine se pune ultimul',
		advice:
			'Ești persoana care se asigură că toți ceilalți sunt bine — și care pe sine se pune mereu ultima pe listă. Seara, când rămâi în sfârșit cu tine, în locul odihnei vine inventarul: am făcut destul? am uitat pe cineva? Nu e anxietate clasică — e un sistem nervos condiționat să echivaleze oprirea cu pericolul.\n\nCând ai grijă de cineva, corpul primește hormonul conectării și te simți în siguranță; când te oprești, nivelul lui scade și apare o neliniște pe care o citești ca vinovăție. Somnul cere o stare în care „nu faci nimic pentru nimeni” — iar sistemul tău nu a primit încă permisiunea. Nu e că nu ești obosit(ă); e că oprirea trebuie reînvățată ca stare sigură, în pași mici.'
	},
	PE: {
		label: 'Perfecționistul',
		essence: 'Se evaluează constant, standarde imposibile',
		advice:
			'Nu doar vrei să faci lucrurile bine — simți că trebuie. Iar acum standardul s-a extins și asupra somnului: dormi „corect”? e rutina optimă? Poate ai citit totul despre igiena somnului și aplici totul — și tocmai asta te ține treaz(ă).\n\nZona din creier care detectează erori și monitorizează performanța rulează la tine non-stop, inclusiv seara, iar fiecare „am adormit destul de repede?” e un mic impuls de alertă. Monitorizezi somnul în loc să-l trăiești — și monitorizarea activează exact circuitele care blochează adormirea. Somnul nu e un proiect de optimizat; e un proces care vine când îi permiți. Odată ce vezi paradoxul, devine mult mai ușor de dezamorsat.'
	},
	AN: {
		label: 'Antena',
		essence: 'Hipersensibil la stimuli — sunet, lumină, textură',
		advice:
			'Tu auzi frigiderul. Simți LED-ul de standby prin pleoape. Detectezi când cineva se întoarce în pat lângă tine. Și probabil ți s-a spus toată viața că „exagerezi”. Nu exagerezi: ai un sistem nervos cu un prag senzorial mai jos decât media — procesezi mai mult, mai fin, mai constant. E neurologie, nu caracter.\n\n„Poarta” prin care stimulii ajung la conștiință e la tine mai larg deschisă, așa că primești semnale pe care alte creiere le blochează automat — iar noaptea, pe fundal de liniște, fiecare sunet mic e amplificat. Vestea bună: mediul se poate optimiza serios (previzibilitate, nu liniște absolută), iar echilibrul chimic care „coboară volumul” senzorial se poate susține.'
	},
	FU: {
		label: 'Fugarul',
		essence: 'Caută stimulare, evită liniștea',
		advice:
			'Mereu ceva pornit: un podcast, un serial, telefonul. Și o neliniște specifică atunci când vine momentul să te culci. Nu e lipsă de disciplină: e un sistem nervos care a învățat că stimularea constantă e starea lui normală — iar absența ei o citește ca pe un gol, nu ca pe odihnă.\n\nFiecare scroll, clip sau notificare aduce o doză din neurotransmițătorul recompensei; cu cât vine mai mult din exterior, cu atât produce creierul mai puțin de la sine. Nivelul „de repaus” scade, iar liniștea devine inconfortabilă — exact starea de care somnul are nevoie. Vestea bună: circuitul se recalibrează, nu rapid, dar consistent. Nu e vorba de renunțare, ci de recalibrare graduală.'
	},
	EP: {
		label: 'Epuizatul',
		essence: 'A fost puternic mult timp, acum nu mai poate',
		advice:
			'Ești persoana care împinge de mult: te ridici oricât de greu e, funcționezi, bifezi, „poți” mereu. Iar acum corpul trimite factura — oboseală pe care somnul nu o mai șterge, ceață mentală, dimineți tot mai grele și paradoxul „obosit(ă), dar nu pot dormi”. Nu e „doar o perioadă” și nu e lipsă de voință — e lipsă de resurse.\n\nAxa care îți reglează cortizolul a funcționat pe avarie atât de mult încât și-a pierdut ritmul: prea puțin dimineața (de aceea pornești greu), prea mult noaptea (de aceea ești alert(ă) când vrei să dormi). Vestea bună: axa se recalibrează — dar cu pași mici și constanți, lumină naturală dimineața și, la acest nivel de epuizare, cu o discuție serioasă cu medicul tău, nu cu „mai multă odihnă în weekend”.'
	}
};

/**
 * Per-answer archetype points (`weights`: which option you pick decides which
 * archetype scores). Each option names a lived experience and pushes the
 * archetype whose mechanism produces it — main signal +2, secondary signal
 * +1. The closing key-phrase question is the strongest single signal (+3),
 * which keeps every archetype reachable by an honest answer set.
 */
export const ARCHETYPE_QUIZ_SCORING: ScoringConfig = {
	resultMode: 'archetype',
	questions: {
		seara_in_pat: {
			kind: 'weights',
			weights: {
				lista: { MN: 2 },
				reluari: { RU: 2 },
				garda: { ST: 2 },
				telefon: { FU: 2 }
			}
		},
		seara_corp: {
			kind: 'weights',
			weights: {
				incordare: { VU: 2 },
				alerta: { ST: 2 },
				gol: { EP: 2 },
				neliniste: { FU: 2 }
			}
		},
		seara_ganduri: {
			kind: 'weights',
			weights: {
				sarcini: { MN: 2 },
				discutii: { RU: 2 },
				standard: { PE: 2 },
				ceilalti: { SA: 2 }
			}
		},
		seara_amanare: {
			kind: 'weights',
			weights: {
				aman: { FU: 2, SA: 1 },
				devreme: { EP: 2 },
				lucrez: { MN: 2 },
				ritual: { AN: 2, PE: 1 }
			}
		},
		noapte_treziri: {
			kind: 'weights',
			weights: {
				zgomot: { AN: 2, ST: 1 },
				trei: { RU: 2, MN: 1 },
				epuizat: { EP: 2 },
				tensionat: { VU: 2 }
			}
		},
		noapte_cauza: {
			kind: 'weights',
			weights: {
				stimuli: { AN: 3 },
				grija: { SA: 2, ST: 1 },
				alarma: { ST: 2, EP: 1 },
				greseli: { PE: 2, RU: 1 }
			}
		},
		noapte_reactie: {
			kind: 'weights',
			weights: {
				scroll: { FU: 2 },
				planuri: { MN: 2 },
				reiau: { RU: 2 },
				ascult: { ST: 2, AN: 1 }
			}
		},
		dimineata: {
			kind: 'weights',
			weights: {
				'de-facut': { MN: 2 },
				nota: { PE: 2 },
				ceilalti: { SA: 2 },
				rezervor: { EP: 3 }
			}
		},
		zi_tipar: {
			kind: 'weights',
			weights: {
				'fara-pauza': { SA: 2 },
				stimulare: { FU: 2 },
				inghit: { VU: 2 },
				'garda-zi': { ST: 2 }
			}
		},
		zi_odihna: {
			kind: 'weights',
			weights: {
				vinovatie: { SA: 2, PE: 1 },
				plictiseala: { FU: 2 },
				'nu-pot': { EP: 2 },
				organizata: { MN: 2 }
			}
		},
		semne_corp: {
			kind: 'weights',
			weights: {
				maxilar: { VU: 2 },
				sensibil: { AN: 2 },
				standarde: { PE: 2 },
				sleit: { EP: 2 },
				replici: { RU: 2 },
				niciuna: {}
			}
		},
		fraza: {
			kind: 'weights',
			weights: {
				st: { ST: 3 },
				mn: { MN: 3 },
				ru: { RU: 3 },
				vu: { VU: 3 },
				sa: { SA: 3 },
				pe: { PE: 3 },
				an: { AN: 3 },
				fu: { FU: 3 },
				ep: { EP: 3 }
			}
		}
	},
	// Ordered array (not a record): the position here IS the tie-break priority
	// — equal scores resolve to the earlier entry — and only an array keeps its
	// order through the jsonb `scoring` column (H-1). A record shape shipped
	// AN, EP, FU, … in production and made "Antena" win every sparse tie.
	dimensions: [
		{ key: 'ST', label: 'Străjerul' },
		{ key: 'MN', label: 'Managerul' },
		{ key: 'RU', label: 'Ruminatorul' },
		{ key: 'VU', label: 'Vulcanul' },
		{ key: 'SA', label: 'Salvatorul' },
		{ key: 'PE', label: 'Perfecționistul' },
		{ key: 'AN', label: 'Antena' },
		{ key: 'FU', label: 'Fugarul' },
		{ key: 'EP', label: 'Epuizatul' }
	],
	archetypes: ARCHETYPES,
	// Archetype mode still carries one catch-all band: it feeds band consumers
	// (the transactional result email, admin listings) a sensible fallback.
	bands: [
		{
			key: 'arhetip',
			min: 0,
			label: 'Tiparul tău de somn',
			advice:
				'Deschide pagina rezultatului ca să vezi ce înseamnă tiparul tău și de unde poți începe.'
		}
	]
};

export const ARCHETYPE_QUIZ_SEED = {
	id: 'seed-quiz-arhetip-somn',
	slug: 'arhetip-somn',
	title: 'Testul de somn',
	introMd:
		'Nu toate insomniile sunt la fel. A ta are o cauză.\n\n**12 întrebări, 3 minute** despre cum arată de fapt noaptea ta. Vezi rezultatul pe loc — fără cont, fără email obligatoriu.',
	pillarSlug: 'somn',
	resultTemplateKey: 'quiz-result',
	formSchema: ARCHETYPE_QUIZ_FORM,
	scoring: ARCHETYPE_QUIZ_SCORING
} as const;
