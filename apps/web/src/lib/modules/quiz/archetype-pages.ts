import type { ArchetypeId } from './patterns.ts';

/**
 * The public archetype pages (`/tipuri/[slug]`): name, essence, key phrase
 * and long-form copy per archetype, adapted to the site voice from the
 * vendored source material in `.initialData/archetype-copy/` (the general
 * ALARMA-stage text — the phase-specific variants stay quiz territory).
 * "Adapted" means: second person kept, the narrating-doctor persona removed,
 * items condensed. Pure data, exported through the universal barrel.
 */
export interface ArchetypePage {
	id: ArchetypeId;
	/** URL slug under /tipuri/, matching the vendored source filenames. */
	slug: string;
	name: string;
	essence: string;
	/** The archetype's inner sentence, quoted on the page. */
	keyPhrase: string;
	/** Recognition + mechanism, one string per paragraph. */
	intro: readonly string[];
	/** "Ce să eviți" — the counterproductive reflexes. */
	avoid: readonly string[];
	/** "De unde începi" — the first concrete moves. */
	start: readonly string[];
}

export const ARCHETYPE_PAGES: readonly ArchetypePage[] = [
	{
		id: 'ST',
		slug: 'strajerul',
		name: 'Străjerul',
		essence: 'Hipervigilent, scanează pericole, nu poate lăsa garda jos',
		keyPhrase: 'Nu e sigur să mă opresc',
		intro: [
			'Vigilența permanentă, verificările, urechea mereu atentă la ce se întâmplă în casă — nu e ceva greșit la tine. Ai un sistem nervos foarte competent care face exact ce a fost antrenat să facă: te protejează. Problema nu ești tu. Problema e că acest sistem nu a primit niciodată semnalul clar că poate să se oprească.',
			'În corp, asta arată așa: sistemul de alertă funcționează la o intensitate prea mare, în special seara. Cortizolul — hormonul de alertă — rămâne ridicat când ar trebui să coboare, iar „frâna” de relaxare a corpului e slăbită. E ca și cum ai avea un accelerator foarte sensibil și o frână uzată. Vestea bună: frâna se poate antrena, iar ritmul de cortizol se poate recalibra. Nu e permanent — e un dezechilibru funcțional care răspunde bine la semnale de siguranță repetate.'
		],
		avoid: [
			'Tehnicile agresive de relaxare — meditații lungi, exerciții de respirație complicate. Un sistem nervos în alertă interpretează „relaxează-te acum!” ca pe o nouă amenințare; orice intervenție trebuie să fie blândă și graduală.',
			'Liniștea și întunericul absolute, dacă observi că îți amplifică vigilența. Pentru un sistem nervos în gardă, absența completă a stimulilor e citită ca pericol, nu ca siguranță.',
			'Încă un lucru de monitorizat seara — aplicații de somn, trackere, dispozitive. Fiecare element de urmărit e o sarcină în plus pentru un creier deja suprasolicitat.'
		],
		start: [
			'Începe cu expirul prelungit: inspiră pe 4 secunde, expiră pe 7-8 secunde, timp de 3-5 minute, seara, la aceeași oră. Nu e o tehnică de relaxare — e un semnal fiziologic direct că nu există pericol iminent.',
			'Creează un ritual scurt de „predare a gărzii”: 2-3 minute în care verifici ce ai de verificat (ușă, telefon, copii), apoi spui cu voce tare „Am verificat. Tura s-a încheiat.” Sistemul tău nervos are nevoie de un semnal clar de final, nu de o estompare treptată.',
			'Ține extremitățile calde, în special picioarele — temperatura periferică e un semnal puternic de siguranță pentru sistemul nervos autonom.',
			'Un fond sonor constant și neutru (zgomot alb, ventilator, ploaie) dă sistemului nervos ceva previzibil de monitorizat. Previzibilitatea dezactivează vigilența — nu liniștea.',
			'Dacă simți nevoia, discută cu medicul tău despre magneziu glicinat seara — forma cea mai bine tolerată, cu efect calmant asupra sistemului nervos.'
		]
	},
	{
		id: 'MN',
		slug: 'managerul',
		name: 'Managerul',
		essence: 'Mintea rulează proiecte, planuri, liste',
		keyPhrase: 'Mai am de făcut',
		intro: [
			'Ești persoana care stinge lumina și, în loc de liniște, aude lista de mâine. Planifici, anticipezi, verifici — și o faci excelent ziua. Problema nu e dezorganizarea, ci exact opusul: o minte atât de competentă în a gestiona încât nu știe să se oprească din gestionat. Seara, creierul tău pur și simplu nu primește semnalul de „program încheiat”.',
			'Zona din creier care planifică și decide rămâne „aprinsă” seara, pentru că nu a primit un semnal clar de final, iar cortizolul o susține exact cât să te țină în modul „gata de acțiune”. Vestea bună: acest circuit răspunde foarte bine la ritualuri de închidere. Nu trebuie să-ți schimbi felul de a fi — trebuie doar să-i dai creierului un buton de oprire pe care încă nu-l are.'
		],
		avoid: [
			'Verificările de „ultim moment” pe telefon, din pat. Fiecare email sau notificare e o sarcină nou deschisă pentru creierul care planifică — și o micro-eliberare de cortizol.',
			'Somnul tratat ca proiect, cu obiective și metrici. Somnul vine prin abandon, nu prin control — cu cât îl optimizezi, cu atât activezi exact sistemul care trebuie să se oprească.',
			'Statul treaz „până termini tot”. Lista nu se termină niciodată — asta e natura listelor, nu un eșec de organizare. Dimineața ai resurse mai bune pentru aceleași sarcini.'
		],
		start: [
			'Fă un „brain dump” cu două ore înainte de culcare: 5 minute în care scrii pe hârtie tot ce ai pe cap, de la sarcini de lucru la „de cumpărat detergent”. Mintea se eliberează când vede că informația e stocată undeva sigur.',
			'Creează un ritual de închidere a zilei — ceva scurt, fix, repetabil: o propoziție („Ziua de lucru s-a încheiat”), un gest (închizi laptopul, stingi lumina din birou). Creierul tău are nevoie de un semnal clar de tranziție.',
			'Ține un caiet lângă pat. Când vine un gând „urgent” noaptea, scrie-l în 10 secunde, fără lumină puternică — sarcina e înregistrată și poate fi eliberată.',
			'Seara, alege o activitate care ocupă mintea ușor dar neproductiv: ficțiune, muzică instrumentală, un puzzle simplu. Mintea de manager are nevoie de o rampă de coborâre, nu de o oprire bruscă.',
			'Dacă neliniștea mentală persistă, 3-5 minute de respirație cu expir prelungit (4 secunde inspir, 7 expir) activează direct „frâna” de care creierul are nevoie ca să cedeze controlul.'
		]
	},
	{
		id: 'RU',
		slug: 'ruminatorul',
		name: 'Ruminatorul',
		essence: 'Reia scene, conversații, replici nespuse',
		keyPhrase: 'Nu pot lăsa ce s-a întâmplat',
		intro: [
			'Ești persoana care reface conversații în minte, care găsește replica perfectă cu ore întârziere, care nu poate lăsa un subiect nerezolvat fără să-l fi analizat din toate unghiurile. Nu ești „prea” nimic: ai un creier cu o capacitate analitică remarcabilă, care nu a învățat încă unde e comutatorul de oprit.',
			'Ceea ce trăiești noaptea nu e anxietate în sensul clasic. E rețeaua din creier care se activează când nu faci nimic concret — și care la tine rulează la intensitate mult prea mare, fix seara, când filtrul care pune ordine în gânduri e obosit după o zi întreagă. Rezultatul: gânduri care circulă liber, fără prioritate, fără punct de oprire. Nu e ceva structural — e un dezechilibru funcțional, iar rețeaua asta se poate liniști cu intervenții concrete.'
		],
		avoid: [
			'Lupta cu gândurile. Orice efort de a „nu te gândi” activează exact circuitele pe care încerci să le oprești — e neuroștiință, nu lipsă de voință.',
			'Analiza de seară: ce ai de făcut mâine, ce a mers prost azi, ce ai fi putut spune altfel. Seara, tot ce obții e ruminare deghizată în planificare.',
			'Statul în pat treaz mai mult de 20-25 de minute. Creierul asociază repede patul cu „locul unde gândesc” — și asocierea se consolidează cu fiecare noapte.'
		],
		start: [
			'Transferă gândurile din minte pe hârtie: 10 minute, seara, fără filtru. Nu jurnal frumos — descărcare brută. Mintea simte că gândul a fost „depozitat” și se eliberează de obligația de a-l repeta.',
			'Înainte de somn, ocupă-ți mintea cu o narațiune care nu ești tu — un audiobook, un podcast cu poveste (nu informativ, nu motivațional).',
			'Când prinzi gândul în buclă, numește-l cu detașare: „Asta e ruminare.” Simpla etichetare îi scade intensitatea — nu îl oprește, dar îl slăbește destul cât să nu te mai controleze.',
			'Dacă te trezești noaptea cu mintea în plin proces, nu rămâne în pat: mută-te într-un spațiu cu lumină foarte slabă și fă ceva ușor cu mâinile. Activitățile manuale întrerup buclele mai eficient decât orice strategie mentală.',
			'Mișcă-te ziua — chiar și 20 de minute de mers alert scad măsurabil activitatea rețelei de ruminare seara. Ideal, în prima parte a zilei.'
		]
	},
	{
		id: 'VU',
		slug: 'vulcanul',
		name: 'Vulcanul',
		essence: 'Furie și frustrare ținute înăuntru, maxilar încleștat',
		keyPhrase: 'Țin totul în mine',
		intro: [
			'Maxilarul încleștat, umerii ridicați, tensiunea din tot corpul seara — și, dacă te întreabă cineva, „nu ești furios(oasă), doar tensionat(ă)”. Dar corpul spune altceva: furia neexprimată nu dispare, se depozitează în mușchi, în maxilar, în stomac. Noaptea, când nu mai are ce să o distragă, iese la suprafață.',
			'Furia reprimată ține pornit modul „luptă” al corpului: tonus muscular ridicat, cortizol persistent, activare de fond. Somnul cere exact opusul — relaxare musculară profundă. Vestea bună: nu trebuie să „rezolvi” furia ca să dormi. E suficient să-i dai corpului o cale de descărcare sigură seara, iar tensiunea scade destul cât să lase somnul să vină.'
		],
		avoid: [
			'Încercarea de a „uita” ce te-a deranjat. Suprimarea emoțională are un cost fiziologic măsurabil — crește cortizolul și tensiunea musculară. E mai sănătos să recunoști furia decât să o ignori.',
			'Alcoolul ca „destindere”. Relaxează superficial mușchii, dar strică arhitectura somnului, taie din somnul REM și amplifică reactivitatea emoțională a doua zi.',
			'Antrenamentul intens după ora 19. Furia are nevoie de descărcare, dar nu prin adrenalină suplimentară exact când sistemul ar trebui să coboare.'
		],
		start: [
			'Relaxare musculară progresivă pe grupele care „țin” furia: maxilar, umeri, pumni, abdomen. Strânge fiecare 5 secunde cât de tare poți, apoi eliberează complet; repetă de 3 ori.',
			'Maxilarul e zona numărul unu: deschide gura ușor, pune vârful limbii în spatele dinților de sus și lasă maxilarul să cadă sub propria greutate, 2-3 minute. Mulți oameni cu furie reținută strâng din maxilar nonstop fără să știe.',
			'Scrie 5 minute seara ce te-a enervat azi, complet sincer — nimeni nu citește. Nu analiza, nu căuta soluții; scrierea expresivă e o descărcare reală, nu simbolică.',
			'Expirul lung pe gură cu sunet — un „haaa” deliberat, ca un oftat conștient, de 5-6 ori. Vibrația activează una dintre cele mai rapide căi de calmare pe care le are corpul.',
			'Aplică căldură locală pe maxilar și gât înainte de somn — un prosop cald, o pernuță cu sâmburi. Căldura relaxează mușchii tensionați și dă un semnal puternic de siguranță.'
		]
	},
	{
		id: 'SA',
		slug: 'salvatorul',
		name: 'Salvatorul',
		essence: 'Are grijă de toți, pe sine se pune ultimul',
		keyPhrase: 'Nu am voie să mă opresc',
		intro: [
			'Ești persoana care se asigură că toți din jur sunt bine — dar care pe sine se pune mereu ultima pe listă. Seara, când rămâi în sfârșit cu tine, în locul odihnei vine inventarul: am făcut destul? am uitat pe cineva? e cineva supărat pe mine? Nu e anxietate în sens clasic — e un sistem nervos condiționat să echivaleze oprirea cu pericolul.',
			'Circuitul e concret: când ajuți, creierul eliberează hormonul conectării și te simți în siguranță; când te oprești, nivelul lui scade, cortizolul crește și apare o neliniște pe care o citești ca vinovăție. Somnul cere o stare în care „nu faci nimic pentru nimeni” — iar sistemul tău nervos nu a primit încă permisiunea. Nu e că nu ești obosit(ă); e că oprirea trebuie reînvățată ca stare sigură, în pași mici.'
		],
		avoid: [
			'Mesajele verificate „o ultimă dată” înainte de somn. Fiecare mesaj citit e un potențial declanșator — altcineva are nevoie, iar sistemul tău nu se poate opri până nu răspunzi. Mută telefonul în alt loc fizic cu o oră înainte de culcare.',
			'„Doar un lucru mic” rezolvat pentru altcineva seara — chiar și un email scurt reactivează întregul circuit și resetează ceasul de adormire.',
			'Compensarea prin somn mai puțin, ca „să faci mai multe” pentru alții ziua. Mai puțin somn înseamnă mai mult cortizol — și o nevoie și mai mare de a „face” ca să te simți în siguranță.'
		],
		start: [
			'Începe cu o propoziție spusă cu voce tare seara: „Am făcut suficient pentru azi.” Nu trebuie să o crezi — repetiția construiește circuite noi. E antrenament, nu exercițiu de convingere.',
			'Introdu un act de auto-îngrijire intenționat seara — ceva mic, doar pentru tine: un ceai pe care tu îl alegi, o baie, 10 pagini dintr-o carte pe care tu o vrei.',
			'Pune telefonul pe „Nu deranja” de la o oră fixă. Dacă neliniștea e prea mare, lasă 1-2 contacte ca excepții — dar doar atât. Cadrul clar reduce ambiguitatea, iar ambiguitatea e combustibilul neliniștii de seară.',
			'Scrie seara 3 lucruri pe care le-ai făcut azi pentru alții, citește lista, apoi spune: „Tura s-a terminat.” Creierul tău are nevoie de dovadă concretă, nu de permisiune abstractă.',
			'Discută cu medicul tău despre magneziu și vitamina B6 — ambele susțin reglarea cortizolului și producția de melatonină. Nu e soluția, dar oferă o bază biochimică.'
		]
	},
	{
		id: 'PE',
		slug: 'perfectionistul',
		name: 'Perfecționistul',
		essence: 'Se evaluează constant, standarde imposibile',
		keyPhrase: 'Nu e suficient de bine',
		intro: [
			'Nu doar vrei să faci lucrurile bine — simți că trebuie. Iar acum standardul s-a extins și asupra somnului: dormi „corect”? e rutina optimă? Poate ai citit totul despre igiena somnului și aplici totul — și tocmai asta te ține treaz(ă). Somnul nu e un proiect de optimizat; e un proces biologic care vine când îi permiți, nu când îl perfecționezi.',
			'Zona din creier care detectează erori și monitorizează performanța rulează la tine non-stop, inclusiv seara: „Am adormit destul de repede? Somnul ăsta e de calitate? Mâine voi funcționa?” Fiecare întrebare e un mic impuls de alertă. Monitorizezi somnul în loc să-l trăiești — iar monitorizarea activează exact circuitele care blochează adormirea. E un paradox neurobiologic clasic, și odată ce îl vezi, devine mult mai ușor de dezamorsat.'
		],
		avoid: [
			'Măsurarea somnului cu aplicații sau trackere. Fiecare cifră devine un nou standard de evaluat — există oameni care dorm obiectiv bine, dar se simt rău pentru că aplicația le spune altfel.',
			'Rutina de seară „optimizată” până la rigiditate. Dacă un element lipsește, mintea o citește ca eșec, iar eșecul activează stresul.',
			'Comparația cu standarde externe — „8 ore”, „adormit în 15 minute”. Variabilitatea biologică e normală; corpul tău are propriul ritm și nu trebuie să semene cu al nimănui.'
		],
		start: [
			'Primul pas, cel mai important: renunță la orice formă de măsurare a somnului pentru minimum 2 săptămâni — ceas inteligent, aplicație, număratul orelor. Monitorul intern se calmează când nu mai are ce evalua.',
			'Dă-ți permisiunea explicită ca seara să fie „suficient de bună”, nu perfectă. Spune cu voce tare: „Asta e ok pentru diseară.” Vocea proprie dezamorsează monitorul critic altfel decât gândul intern.',
			'Un singur element relaxant seara — nu un protocol complet. Un ceai, o respirație lentă, câteva pagini de carte. Simplitatea e terapeutică pentru o minte care vrea să controleze totul.',
			'Când apare gândul „nu a fost suficient de bine”, numește-l: „Asta e monitorul meu. Face ce face de obicei.” Etichetarea îi scade măsurabil intensitatea.',
			'Dacă te preocupă ziua de mâine: cortizolul de dimineață compensează natural o noapte imperfectă. Nu depinzi de o noapte „ideală” ca să funcționezi — depinzi de un sistem nervos care nu e în alertă permanentă.'
		]
	},
	{
		id: 'AN',
		slug: 'antena',
		name: 'Antena',
		essence: 'Hipersensibil la stimuli — sunet, lumină, textură',
		keyPhrase: 'Simt tot ce alții nu simt',
		intro: [
			'Tu auzi frigiderul. Simți LED-ul de standby prin pleoape. Detectezi când cineva se întoarce în pat lângă tine. Și probabil ți s-a spus toată viața că „exagerezi”. Nu exagerezi: ai un sistem nervos cu un prag senzorial mai jos decât media — procesezi mai mult, mai fin, mai constant. E neurologie, nu caracter.',
			'„Poarta” prin care stimulii ajung la conștiință e la tine mai larg deschisă, așa că primești semnale pe care alte creiere le blochează automat. Seara, pe fundal de liniște, sensibilitatea devine paradoxal mai problematică — orice sunet mic, orice variație de lumină sau temperatură e amplificată. Vestea bună: mediul se poate optimiza serios, iar echilibrul chimic care „coboară volumul” senzorial se poate susține.'
		],
		avoid: [
			'Televizorul sau muzica pornite ca să „acopere” zgomotele — adaugi stimulare peste stimulare, iar creierul tău le procesează pe toate simultan.',
			'Minimalizarea („toți aud aceleași lucruri”). Nu e adevărat: pragul tău senzorial e diferit — o variație neurobiologică reală. A o ignora înseamnă a nu-ți oferi protecția de care ai nevoie.',
			'Schimbarea a tot dintr-o dată — saltea nouă, perdele noi, parfum nou. Fiecare noutate e un stimul suplimentar; sistemul tău are nevoie de predictibilitate, nu de noutate.'
		],
		start: [
			'Optimizează dormitorul ca pe un sanctuar senzorial — metodic, câte un element pe săptămână. Prioritatea: întuneric complet (blackout, LED-uri de standby eliminate), apoi sunet, apoi temperatură stabilă la 18-20°C.',
			'Preferă zgomotul alb sau roz tăcerii totale: un sunet uniform și previzibil dă creierului un fond stabil pe care îl poate ignora, în timp ce în tăcere orice micro-sunet devine eveniment. Un ventilator simplu e adesea suficient.',
			'Construiește o „rampă senzorială” cu 30-40 de minute înainte de somn: lumină progresiv mai slabă și caldă, stimuli auditivi în scădere, interacțiuni verbale la minimum. Sistemul tău are nevoie de tranziție lentă, nu de comutator brusc.',
			'Materialele contează: lenjerie din fibre naturale, mască de somn moale, eventual o pătură cu greutate (5-7 kg) — presiunea uniformă reduce activarea senzorială.',
			'Discută cu medicul tău despre magneziu glicinat seara — susține sistemul care „coboară volumul” senzorial, fără efecte secundare semnificative.'
		]
	},
	{
		id: 'FU',
		slug: 'fugarul',
		name: 'Fugarul',
		essence: 'Caută stimulare, evită liniștea',
		keyPhrase: 'Nu pot sta fără ceva',
		intro: [
			'Mereu ceva pornit: un podcast, un serial, telefonul. Și o neliniște specifică atunci când vine momentul să te culci. Nu e lipsă de disciplină și nu e dependență în sensul clasic: e un sistem nervos care a învățat că stimularea constantă e starea lui normală — iar absența ei o citește ca pe un gol, nu ca pe odihnă. Golul acela e biologic, nu doar psihologic.',
			'Fiecare scroll, clip sau notificare aduce o doză din neurotransmițătorul recompensei; cu cât vine mai mult din exterior, cu atât produce creierul mai puțin de la sine. Nivelul „de repaus” scade, iar liniștea devine inconfortabilă — exact starea de care somnul are nevoie. Vestea bună: circuitul se recalibrează, nu rapid, dar consistent. Nu e vorba de renunțare, ci de recalibrare graduală.'
		],
		avoid: [
			'Tăierea bruscă a stimulării („de mâine, fără telefon de la 9 seara”). Sevrajul e real și poate agrava insomnia în primele nopți; reduci gradual, nu radical.',
			'Culcatul în liniște totală, dacă îți produce anxietate. E mai bine să adormi cu un audiobook blând decât să stai treaz trei ore luptându-te cu impulsul de a căuta stimulare.',
			'Auto-judecata („nu am voință”). Voința are nevoie de dopamină ca să funcționeze; când nivelul de bază e scăzut, ea e ultima resursă disponibilă. Nu e caracter — e biochimie.'
		],
		start: [
			'Redu gradual: săptămâna 1 — ecranele se opresc cu 30 de minute înainte de culcare, înlocuite cu un stimul mai blând (audiobook, muzică ambientală); săptămâna 2 — 45 de minute; săptămâna 3 — o oră.',
			'Folosește activități-punte care satisfac parțial nevoia de stimulare fără să aprindă circuitul recompensei: puzzle-uri fizice, colorat, tricotat, aranjarea unui sertar. Mâinile ocupate liniștesc mintea.',
			'Mișcă-te în prima parte a zilei — 20-30 de minute de mers alert sau exerciții moderate ridică natural nivelul de bază al dopaminei și reduc nevoia de stimulare seara.',
			'Pune telefonul fizic în altă cameră cu 30 de minute înainte de somn. Distanța e mai eficientă decât voința — reduce tentația fără să consume resursele pe care seara oricum nu le mai ai.',
			'Dacă disconfortul e intens, discută cu medicul tău despre susținerea dopaminei de bază — și redu zahărul rafinat seara, care produce vârfuri urmate de prăbușiri.'
		]
	},
	{
		id: 'EP',
		slug: 'epuizatul',
		name: 'Epuizatul',
		essence: 'A fost puternic mult timp, acum nu mai poate',
		keyPhrase: 'Nu mai am din ce',
		intro: [
			'Ești persoana care împinge de mult: te ridici oricât de greu e, funcționezi, bifezi, „poți” mereu. Iar acum corpul trimite factura — oboseală pe care somnul nu o mai șterge, ceață mentală, dimineți tot mai grele. Dacă ai ajuns să nu mai poți dormi deși ești epuizat(ă), nu mai e „doar o perioadă”: e sistemul tău nervos spunând, în singurul mod pe care îl mai are, oprește-te.',
			'Axa care îți reglează cortizolul a funcționat pe avarie atât de mult încât și-a pierdut ritmul: prea puțin dimineața (de aceea pornești greu), prea mult seara (de aceea ești alert(ă) când vrei să dormi). Nu e insomnie clasică — e un dezechilibru neuroendocrin funcțional. Vestea bună: axa se recalibrează. Dar cere o schimbare reală de abordare, nu „mai multă odihnă în weekend”.'
		],
		avoid: [
			'Compensarea cu cafea și voință. Cafeina stimulează exact hormonul care e deja dezreglat — fiecare cafea după ora 12 e un pas înapoi în recalibrare.',
			'Responsabilitățile noi acceptate cu „e doar temporar”. Dacă ai ajuns la insomnie pe fond de epuizare, temporarul a durat deja prea mult.',
			'Recuperarea somnului „în weekend”. Ritmul se reglează prin consistență zilnică, nu prin compensare periodică.'
		],
		start: [
			'Primul și cel mai important lucru: dă-ți permisiunea să te oprești înainte de a fi complet terminat(ă). Nu la 23:00 — la 21:30. Nu „când termin tot” — când corpul spune „ajunge”. Nu e lene, e prevenție.',
			'Lumină naturală în primele 30 de minute după trezire — cel mai puternic semnal de recalibrare a ritmului pe care îl ai la dispoziție. Cortizolul de dimineață are nevoie de lumină ca să pornească corect.',
			'Seara, fă ceva deliberat neproductiv: stai pe canapea fără telefon, privește pe fereastră, ascultă o melodie știută pe de rost. Sistemul tău nu are nevoie de relaxare activă — are nevoie de absența efortului.',
			'Mănâncă la ore regulate; seara, o masă ușoară cu proteine și grăsimi bune cu 3 ore înainte de culcare stabilizează glicemia nocturnă și reduce trezirile.',
			'Discută cu medicul tău despre un profil de cortizol pe parcursul zilei — dacă curba e inversată, există intervenții specifice care susțin recalibrarea în mod real.'
		]
	}
];

export const ARCHETYPE_PAGES_BY_SLUG: ReadonlyMap<string, ArchetypePage> = new Map(
	ARCHETYPE_PAGES.map((page) => [page.slug, page])
);
