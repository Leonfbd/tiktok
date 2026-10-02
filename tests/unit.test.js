/**
 * Testy jednostkowe silnika lokalnego, parsera, eksportów i zgodności.
 * Uruchomienie: node tests/unit.test.js
 */
const fs = require('fs');
const path = require('path');
const { makeChecker, stubEnv } = require('./_helpers');

const code = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
  .match(/<script>([\s\S]*)<\/script>/)[1];
const A = stubEnv(code);
const { check, finish } = makeChecker();

/* ---------- Brief bazowy ---------- */
const baseBrief = {
  mode:'manual', industry:'kosmetyki naturalne', product:'serum z witaminą C 30 ml',
  price:'89 zł', audience:'kobiety 25–40 dbające o skórę', problem:'nierówny koloryt i wypryski po zimie',
  promise:'prosta rutyna pielęgnacji w 3 krokach', tone:'viralowy', proof:'4 300 opinii, skład INCI',
  offer:'druga sztuka -50%, wysyłka 24h', objection:'pewnie znowu nie zadziała',
  brand:'@twojamarka', campaign:'Serum C – test hooków',
  length:30, style:'UGC', platform:'TikTok Feed (In-Feed Ads)', lang:'pl', variants:3,
  sellMode:'auto', engine:'local', strategy:'performance', calloutType:'wartosc', punch:'3',
  modules: A.MODULES.map(m => m.id)
};

/* ---------- 1. Pakiet lokalny ---------- */
const p = A.generateLocalPackage(baseBrief);
check('3 warianty', p.variants.length === 3, p.variants.length);
check('wszystkie moduły obecne', p.variants.every(v => Object.keys(v.sections).length === A.MODULES.length));
check('różne kąty', new Set(p.variants.map(v => v.angleId)).size === 3, p.variants.map(v => v.angleId).join(','));
check('brak nieuzupełnionych slotów', !JSON.stringify(p.variants).includes('{P}'));
check('sekcja hook ma 3 hooki', (p.variants[0].sections.hook.body.match(/^HOOK [ABC] \(0–3 s\)$/gm) || []).length === 3);
check('scenariusz trzyma przedziały 30 s', p.variants[0].sections.script.body.includes('[27–30 s]'));
check('shot list ma ujęcia', (p.variants[0].sections.shots.body.match(/UJĘCIE \d+/g) || []).length >= 7);
check('napisy w formacie SRT', /\d+\s*\n00:00:\d\d,\d\d\d --> 00:00:\d\d,\d\d\d/.test(p.variants[0].sections.subtitles.body));
check('hashtagi 8-12', (p.variants[0].sections.description.body.match(/#/g) || []).length >= 8);
check('notatka A/B z KPI', /KPI DO OCENY/.test(p.variants[0].sections.ab.body));
check('plan A/B zbudowany', /FAZA 1/.test(p.abPlan));
check('checklista 10 punktów', p.checklist.split('\n').length === 10);
check('disclaimery obecne', p.disclaimers.length >= 1);
check('compliance bez błędów struktury', p.compliance && Array.isArray(p.compliance.issues));

/* ---------- 2. Moduły wybiórcze ---------- */
const p2 = A.generateLocalPackage(Object.assign({}, baseBrief, { modules:['hook','cta'] }));
check('tylko 2 sekcje', p2.variants.every(v => Object.keys(v.sections).length === 2));

/* ---------- 3. Długości, języki, kąty ---------- */
[7,15,30,45].forEach(L => {
  const pp = A.generateLocalPackage(Object.assign({}, baseBrief, { length:L, variants:1, modules:['script','subtitles','shots'] }));
  const last = A.LENGTHS[L].beats[A.LENGTHS[L].beats.length - 1];
  check(`${L}s – ostatni beat ${last[1]}–${last[2]}s`, pp.variants[0].sections.script.body.includes(`[${last[1]}–${last[2]} s]`));
});
['pl','en','de','uk','ja'].forEach(lang => {
  const pp = A.generateLocalPackage(Object.assign({}, baseBrief, { lang, variants:1 }));
  check('język ' + lang + ' – niepusty pakiet', pp.variants[0].sections.hook.body.length > 40);
});
const de = A.generateLocalPackage(Object.assign({}, baseBrief, { lang:'de', variants:1 }));
check('lokalne CTA DE doklejone', /Profil|Bio|INFO|Angebot/.test(de.variants[0].sections.cta.body));
const p10 = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:10 }));
check('10 unikalnych kątów', new Set(p10.variants.map(v => v.angleId)).size === 10);

/* ---------- 4. Budżet słów ---------- */
[7,15,30,45].forEach(L => {
  const pp = A.generateLocalPackage(Object.assign({}, baseBrief, { length:L, variants:1, modules:['script'] }));
  const words = Number((pp.variants[0].sections.script.body.match(/BUDŻET SŁÓW: (\d+)/) || [])[1]);
  check(`${L}s – scenariusz mieści się w budżecie (${words} słów)`, words > 0 && words <= L * 2.6 * 1.15, words);
});

/* ---------- 5. Pola zaawansowane briefu ---------- */
const pAdv = A.generateLocalPackage(Object.assign({}, baseBrief, {
  variants:1, proof:'', benefits:'oszczędza 20 minut dziennie\njedna butelka na 2 miesiące',
  proofPoints:'12 000 sprzedanych sztuk\n4,8 średniej oceny',
  hashtags:'#mojserum #test1', kpis:'CTR, CPA, ROAS', disclaimers:'Moje własne zastrzeżenie.'
}));
check('korzyści z briefu w scenariuszu', /oszczędza 20 minut dziennie|jedna butelka na 2 miesiące/.test(pAdv.variants[0].sections.script.body));
check('dowody z briefu w scenariuszu', /12 000 sprzedanych sztuk|4,8 średniej oceny/.test(pAdv.variants[0].sections.script.body));
check('hashtagi z briefu w opisie', /#mojserum/.test(pAdv.variants[0].sections.description.body));
check('KPI z briefu', pAdv.kpis.join(',') === 'CTR,CPA,ROAS', pAdv.kpis.join(','));
check('disclaimery z briefu', pAdv.disclaimers.includes('Moje własne zastrzeżenie.'));

/* ---------- 6. Eksporty ---------- */
const txt = A.projectToTxt(p), md = A.projectToMd(p), js = A.projectToJson(p, true);
check('TXT zawiera warianty', /WARIANT A/.test(txt) && /PLAN TESTÓW A\/B/.test(txt));
check('MD ma tabelę i bloki', /^\| Pole \| Wartość \|/m.test(md) && /```/.test(md));
check('JSON pełny parsowalny', (() => { try { const o = JSON.parse(js); return o.variants.length === 3; } catch(e){ return false; } })());

/* ---------- 7. CSV ---------- */
const csv = A.projectsToCsv([p]);
const csvLines = csv.split('\r\n');
check('CSV: nagłówek kolumn', csvLines[0].split(';')[0] === 'Kampania' && csvLines[0].includes('Hashtagi'));
check('CSV: liczba wierszy = warianty + nagłówek', csvLines.length === p.variants.length + 1, csvLines.length);
check('CSV: treść wiersza zawiera hook', /HOOK A/.test(csvLines[1]));
const csvFields = csvLines.map(l => l.split(';').length);
check('CSV: każde pole oddzielone średnikiem, bez surowych nowych linii',
  csvFields.every(n => n === csvFields[0]) && csv.split('\r\n').length === csvLines.length, csvFields.join(','));

/* ---------- 8. Parser linii partii ---------- */
check('partia: pełna linia', JSON.stringify(A.parseBatchLine('kosmetyki | serum | 89 zł | pl | 15')) === JSON.stringify({ industry:'kosmetyki', product:'serum', price:'89 zł', lang:'pl', length:15 }));
check('partia: minimalna linia', (() => { const r = A.parseBatchLine('fitness'); return r && r.industry === 'fitness' && r.product === 'fitness'; })());
check('partia: nieznany język ignorowany', A.parseBatchLine('a | b | | xx | 15').lang === '');
check('partia: nieznana długość ignorowana', A.parseBatchLine('a | b | | | 99').length === 0);
check('partia: pusta linia → null', A.parseBatchLine('   ') === null);

/* ---------- 9. Presety: CRUD + rozpoznawanie ---------- */
A.savePresets([{ id:'np_1', label:'Kosmetyki premium', kw:['serum','krem'], audience:'kobiety 30+', problem:'P', promise:'O', proof:'D', offer:'F', objection:'B', benefits:['b1'], proofPoints:['d1'], hashtags:['#x'], kpis:['CTR'], disclaimers:['disclaimer testowy'], custom:true }]);
check('preset zapisany', A.getPresets().length === 1);
check('preset widoczny w profilach', A.allNiches().length === A.NICHES.length + 1);
const detected = A.detectNiche('serum z kwasem', '');
check('preset wygrywa z profilem wbudowanym', detected.custom === true && detected.label === 'Kosmetyki premium', detected.label);
const pCustom = A.generateLocalPackage(Object.assign({}, baseBrief, { industry:'serum', variants:1 }));
check('preset zasila silnik (nazwa profilu w pakiecie)', pCustom.niche === 'Kosmetyki premium', pCustom.niche);
check('preset zasila disclaimery', pCustom.disclaimers.includes('disclaimer testowy'));

/* ---------- 10. Pamięć: rozmiar i guard ---------- */
check('approxSize liczbą', typeof A.approxSize() === 'number' && A.approxSize() > 0);
check('fmtBytes formatuje KB', /KB|B/.test(A.fmtBytes(2048)));
// symulacja braku miejsca: localStorage.setItem rzuca dla dużych danych
const realSet = global.localStorage.setItem;
global.localStorage.setItem = (k, v) => { if(String(v).length > 2000) throw new Error('QuotaExceededError'); realSet(k, v); };
const big = Array.from({ length: 50 }, (_, i) => ({ id:'p' + i, name:'Kampania ' + i, data:'x'.repeat(200) }));
const ok = A.storeSet('tiktok_pro_history_v1', big);
const saved = JSON.parse(global.localStorage.getItem('tiktok_pro_history_v1') || '[]');
global.localStorage.setItem = realSet;
check('guard pamięci: zapis nie rzuca wyjątku', ok === true, ok);
check('guard pamięci: tablica przycięta', saved.length < 50 && saved.length >= 1, saved.length);

/* ---------- 11. Parser odpowiedzi modelu ---------- */
const modelAnswer = `### WARIANT A
KĄT: Problem → Rozwiązanie | HIPOTEZA: Test bólu vs produktu
#### HOOK
HOOK A: Znasz to uczucie?
#### SCENARIUSZ
[0–3 s] Ujęcie: zbliżenie
#### HASHTAGI
#test #fyp

### WARIANT B
KĄT: Dowód społeczny
#### HOOK
HOOK A: 4 300 opinii później`;
const parsed = A.parseApiAnswer(modelAnswer, Object.assign({}, baseBrief, { modules:['hook','script','hashtags','ab'] }));
check('parser: 2 warianty', parsed.length === 2, parsed.length);
check('parser: hipoteza z linii z kątem', /Test bólu/.test(parsed[0].hypothesis), parsed[0].hypothesis);
check('parser: filtr modułów', !parsed[0].sections.subtitles && !!parsed[0].sections.hook);
check('parser: hookLine', parsed[1].hookLine.includes('4 300'), parsed[1].hookLine);

/* ---------- 12. Compliance ---------- */
const bad = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:1, modules:['cta'] }));
bad.variants[0].sections.cta.body = 'Gwarantujemy 100% efekt i natychmiastowe efekty, ostatnia szansa, zarobisz szybko. Leczy trądzik.';
const scan = A.complianceScan(bad);
check('compliance wykrywa frazy', scan.issues.length >= 4, scan.issues.length);
check('auto-fix zamienia frazy', scan.replaced >= 4 && !/Gwarantujemy 100%/.test(bad.variants[0].sections.cta.body));

/* ---------- 13. Import listy kampanii (CSV / JSON) ---------- */
const csvA = A.batchListFromCsv('branza;produkt;cena;jezyk;dlugosc\nkosmetyki naturalne;serum;89 zł;pl;15\nfitness;plan treningowy;59 zł;pl;30');
check('CSV: wykryty nagłówek i 2 kampanie', csvA.header === true && csvA.lines.length === 2, JSON.stringify(csvA));
check('CSV: linia znormalizowana do formatu z kreskami', csvA.lines[0] === 'kosmetyki naturalne | serum | 89 zł | pl | 15', csvA.lines[0]);
const csvNoHead = A.batchListFromCsv('moda, kurtka zimowa, 299 zł, pl, 15\ndziecko, klocki edukacyjne');
check('CSV: przecinek jako separator, bez nagłówka', csvNoHead.header === false && csvNoHead.lines.length === 2, JSON.stringify(csvNoHead));
check('CSV: brakujące kolumny uzupełnione pustymi', csvNoHead.lines[1].split(' | ').length === 5, csvNoHead.lines[1]);
const csvQuoted = A.batchListFromCsv('branza;produkt\n"gadżety, domowe";"organizer; kuchenny; 2 szt"');
check('CSV: cudzysłowy i separator w polu', csvQuoted.lines[0] === 'gadżety, domowe | organizer; kuchenny; 2 szt |  |  | ', csvQuoted.lines[0]);
const csvSkip = A.batchListFromCsv('# komentarz\n;;;\nfitness;plan');
check('CSV: komentarze ignorowane, puste wiersze liczone jako pominięte',
  csvSkip.lines.length === 1 && csvSkip.skipped === 1 &&
  csvSkip.lines[0].startsWith('fitness') && !/#/.test(csvSkip.lines[0]), JSON.stringify(csvSkip));
const jsonA = A.batchListFromJson([{ branza:'moda', produkt:'kurtka', cena:'299 zł', jezyk:'pl', dlugosc:'15' }, { industry:'gry', product:'aplikacja', length:30 }]);
check('JSON: obiekty z kluczami PL i EN', jsonA.lines.length === 2 && jsonA.lines[0].startsWith('moda | kurtka | 299 zł | pl | 15'), JSON.stringify(jsonA.lines));
const jsonB = A.batchListFromJson({ lines:['fitness | plan | | pl | 30'] });
check('JSON: obiekt z kluczem lines', jsonB.lines.length === 1 && jsonB.lines[0].includes('fitness'));
const jsonC = A.batchListFromJson('nie-listа');
check('JSON: nieprawidłowa struktura → komunikat', !!jsonC.error && jsonC.lines.length === 0);
check('CSV: szablon ma nagłówek i 3 przykłady', A.csvTemplate().split('\n').length === 4);

/* ---------- 14. Nowe profile branżowe (21 łącznie) ---------- */
check('21 profili branż', A.NICHES.length === 21, A.NICHES.length);
[['powerbank 20 000 mAh','', 'Elektronika'], ['suplement z witaminą D','', 'Zdrowie'],
 ['fotograf ślubny','', 'Śluby'], ['handmade świece sojowe','', 'Rękodzieło'],
 ['dostawca komponentów dla firm','', 'B2B']].forEach(([ind, prod, expected]) => {
  const n = A.detectNiche(ind, prod);
  check(`nowa branża: ${expected}`, n.label.startsWith(expected), n.label);
});
const pHealth = A.generateLocalPackage(Object.assign({}, baseBrief, { industry:'suplement diety', product:'magnez', variants:1, modules:['callout','script'] }));
check('profil zdrowie: disclaimer o suplemencie', /Suplement diety nie zastępuje/.test(pHealth.disclaimers.join(' ')), pHealth.disclaimers.join(' ').slice(0, 120));
check('profil zdrowie: brak obietnic medycznych w pakiecie', A.complianceScan(pHealth).issues.length === 0);

/* ---------- 15. Kopia zapasowa workspace ---------- */
A.savePresets([{ id:'np_x', label:'Preset X', kw:['x'], audience:'A', problem:'P', promise:'O', proof:'D', offer:'F', objection:'B', benefits:[], proofPoints:[], hashtags:[], kpis:[], disclaimers:[], custom:true }]);
A.storeSet('tiktok_pro_history_v1', [{ id:'p1', name:'Kampania testowa', variants:[] }]);
const payload = A.workspacePayload(false);
check('kopia: typ i wersja', payload.type === 'workspace-backup' && payload.version === 2);
check('kopia: bez klucza API', payload.settings.key === undefined, JSON.stringify(Object.keys(payload.settings)));
check('kopia: zawiera historię i presety', payload.history.length === 1 && payload.presets.length === 1);
check('kopia: liczniki zgodne', payload.counts.history === 1 && payload.counts.presets === 1);
A.storeSet('tiktok_pro_history_v1', []);
A.savePresets([]);
const keptKey = JSON.parse(global.localStorage.getItem('tiktok_pro_settings_v1') || '{}');
const res = A.applyWorkspace(payload);
check('przywracanie: historia i presety wróciły', res.history === 1 && res.presets === 1 && A.getPresets().length === 1);
check('przywracanie: klucz API nie został nadpisany', JSON.parse(global.localStorage.getItem('tiktok_pro_settings_v1')).key === keptKey.key);
let threw = false;
try{ A.applyWorkspace({ type:'cos-innego' }); }catch(e){ threw = true; }
check('przywracanie: odrzuca obcy plik', threw);

/* ---------- 16. Własne kąty reklamowe ---------- */
A.saveAngles([
  { id:'na_1', label:'Koszt alternatywy', hookStyle:'price', ctaStyle:'hard',
    angleNote:'Wejście od kosztu obecnego rozwiązania.', hypothesis:'Test: framing kosztu podnosi CTR.', custom:true },
  { id:'na_2', label:'Moja obiekcja', hookStyle:'objection', ctaStyle:'soft',
    angleNote:'Mówimy wprost obiekcję klienta.', hypothesis:'Test: czy obiekcja na wejściu obniża wątpliwości.', custom:true }
]);
check('kąty: zapis i odczyt', A.getAngles().length === 2, A.getAngles().length);
check('kąty: etykiety banków hooków', A.hookStyleLabel('price') === 'Cena / wartość za efekt', A.hookStyleLabel('price'));
check('kąty: 12 banków hooków w słowniku', A.HOOK_STYLES.length === 12, A.HOOK_STYLES.length);

const anglesPicked = A.pickAngles('performance', 4);
check('kąty: własne startują pierwsze', anglesPicked[0].label === 'Koszt alternatywy' && anglesPicked[1].label === 'Moja obiekcja', anglesPicked.map(a => a.label).join(' | '));
check('kąty: dopełnienie wbudowanymi', anglesPicked.length === 4 && anglesPicked[2].id === 'pain', anglesPicked.map(a => a.id).join(','));
check('kąty: forceId działa dla własnego kąta', A.pickAngles('performance', 3, 'na_2')[0].label === 'Moja obiekcja');

const pAngles = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:2 }));
check('kąty: wariant A używa własnego kąta', pAngles.variants[0].angleId === 'na_1' && pAngles.variants[0].angle === 'Koszt alternatywy', pAngles.variants[0].angleId);
check('kąty: hipoteza z definicji kąta', /framing kosztu podnosi CTR/.test(pAngles.variants[0].hypothesis), pAngles.variants[0].hypothesis);
check('kąty: styl CTA kąta użyty w wariancie A (hard sell)', /Zamów|Zamów dziś|Wejdź w link|Kliknij|Sprawdź dostępność|Decyzja w 30 sekund/.test(pAngles.variants[0].sections.cta.body), pAngles.variants[0].sections.cta.body.slice(0, 220));
check('kąty: styl CTA kąta B (soft sell)', /Zapisz|Zobacz szczegóły|Obserwuj|Napisz/.test(pAngles.variants[1].sections.cta.body), pAngles.variants[1].sections.cta.body.slice(0, 160));
check('kąty: bank hooków price → konkret o koszcie', /koszt|płacisz|licz|Cena|zapłacisz|Policz/i.test(pAngles.variants[0].sections.hook.body), pAngles.variants[0].sections.hook.body.slice(0, 160));
check('kąty: „dlaczego tak” z banku price', /kosztu alternatywy|Framing kosztu/i.test(pAngles.variants[0].sections.script.body), pAngles.variants[0].sections.script.body.slice(-260));
check('kąty: brief auto (sellMode=auto) respektuje styl kąta', A.generateLocalPackage(Object.assign({}, baseBrief, { variants:1, sellMode:'auto' })).variants[0].angleId === 'na_1');
const pExplicitSoft = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:1, sellMode:'soft' }));
check('kąty: jawny sellMode w briefie wygrywa nad stylem kąta', /Zapisz|Zobacz szczegóły|Obserwuj|Napisz/.test(pExplicitSoft.variants[0].sections.cta.body), pExplicitSoft.variants[0].sections.cta.body.slice(0, 160));

/* ---------- 17. Tracker wyników testu ---------- */
const pTrack = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:3, modules:['hook','ab'] }));
pTrack.results = { metric:'ctr', rows:{
  A:{ views:'50000', hook:'31', ctr:'1.1', cvr:'2.0', spend:'1200' },
  B:{ views:'48000', hook:'28', ctr:'2.2', cvr:'3.0', spend:'1100' },
  C:{ views:'900',  hook:'40', ctr:'5.0', cvr:'1.0', spend:'50' }
}, winner:null, computedAt:null };
const resTrack = A.computeResults(pTrack);
const rA = resTrack.rows.find(r => r.label === 'A');
check('tracker: kliknięcia liczone z CTR', Math.round(rA.clicks) === 550, rA.clicks);
check('tracker: konwersje liczone z CVR', Math.round(rA.conv) === 11, rA.conv);
check('tracker: CPA z budżetu i konwersji', Math.abs(rA.cpa - 109.09) < 0.5, rA.cpa);
check('tracker: zwycięzca wg CTR (wyżej = lepiej)', resTrack.winner.label === 'B', resTrack.winner && resTrack.winner.label);
check('tracker: metryka domyślna to CTR', resTrack.metric.id === 'ctr', resTrack.metric.id);
pTrack.results.metric = 'cpa';
const resCpa = A.computeResults(pTrack);
check('tracker: zwycięzca wg CPA (niżej = lepiej)', resCpa.winner.label === 'B', resCpa.winner && resCpa.winner.label);
pTrack.results.metric = 'hook';
const resHook = A.computeResults(pTrack);
check('tracker: zwycięzca wg hook rate (wśród prób ≥2000 wyśw.),', resHook.winner.label === 'A', resHook.winner && resHook.winner.label);
check('tracker: wariant C pominięty przy wyborze zwycięzcy (900 wyśw.)', resHook.poolFromEnough === true && resHook.belowThreshold.join(',') === 'C', JSON.stringify(resHook.belowThreshold));
check('tracker: oznaczenie za małej próby (<2000 wyświetleń)', resHook.rows.find(r => r.label === 'C').enough === false);
// gdy WSZYSTKIE warianty są poniżej progu – zwycięzca wybierany, ale z ostrzeżeniem
const pSmall = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:2, modules:['hook'] }));
pSmall.results = { metric:'ctr', rows:{ A:{ views:'800', ctr:'3.0' }, B:{ views:'600', ctr:'1.5' } }, winner:null, computedAt:null };
const resSmall = A.computeResults(pSmall);
check('tracker: brak prób ≥2000 → wynik wstępny z ostrzeżeniem', resSmall.poolFromEnough === false && resSmall.winner.label === 'A', JSON.stringify({ pool:resSmall.poolFromEnough, w:resSmall.winner && resSmall.winner.label }));
pTrack.results.metric = 'cvr'; pTrack.results.winner = 'B'; pTrack.results.computedAt = new Date().toISOString();
const csvRes = A.resultsToCsv(pTrack);
check('tracker: CSV ma nagłówek i 4 wiersze', csvRes.split('\r\n').length === 4 && /Zwycięzca/.test(csvRes.split('\r\n')[0]), csvRes.split('\r\n').length);
check('tracker: CSV oznacza zwycięzcę', /;TAK/.test(csvRes), csvRes.split('\r\n')[2]);
check('tracker: TXT zawiera sekcję wyników i zwycięzcę', /WYNIKI TESTU/.test(A.projectToTxt(pTrack)) && /ZWYCIĘZCA: Wariant B/.test(A.projectToTxt(pTrack)));
check('tracker: MD ma tabelę wyników', /## Wyniki testu/.test(A.projectToMd(pTrack)) && /🏆 TAK/.test(A.projectToMd(pTrack)));
check('tracker: JSON zawiera wyniki', (() => { try { return !!JSON.parse(A.projectToJson(pTrack, true)).results; } catch(e){ return false; } })());

/* ---------- 18. Kopia zapasowa zawiera własne kąty ---------- */
const wsAngles = A.workspacePayload(false);
check('workspace: kąty w kopii', Array.isArray(wsAngles.angles) && wsAngles.angles.length === 2, JSON.stringify(wsAngles.counts));
A.saveAngles([]);
const restored = A.applyWorkspace(wsAngles);
check('workspace: kąty przywrócone', restored.angles === 2 && A.getAngles().length === 2, JSON.stringify(restored));

/* ---------- 19. Walidacja i normalizacja projektów (audyt A1) ---------- */
check('normalizacja: odrzuca null/string/tablicę', A.normalizeProject(null) === null && A.normalizeProject('x') === null && A.normalizeProject([]) === null);
check('normalizacja: odrzuca brak wariantów', A.normalizeProject({ name:'X', brief:{} }) === null);
check('normalizacja: odrzuca variants jako string', A.normalizeProject({ variants:'nie-tablica' }) === null);
check('normalizacja: odrzuca warianty bez sekcji', A.normalizeProject({ variants:[{ label:'A' }] }) === null);
const junkMixed = A.normalizeProject({
  name:'Mieszany', variants:[
    { label:'A', sections:{ hook:{ body:'HOOK A\ntreść' } } },
    { label:'B' },                       // bez sekcji → odpada
    null,                                // śmieć → odpada
    { label:'C', sections:'zły typ' }    // sekcje nie-obiekt → pusty obiekt → odpada
  ], brief:'nie-obiekt'
});
check('normalizacja: zachowuje tylko zdrowe warianty', junkMixed && junkMixed.variants.length === 1, junkMixed && junkMixed.variants.length);
check('normalizacja: naprawia brief', junkMixed && typeof junkMixed.brief === 'object');
check('normalizacja: uzupełnia metadane sekcji', junkMixed && junkMixed.variants[0].sections.hook.title === 'Hooki 0–3 s', junkMixed && junkMixed.variants[0].sections.hook.title);
check('normalizacja: domyślna nazwa projektu', A.normalizeProject({ variants:[{ label:'A', sections:{ hook:{ body:'x' } } }] }).name === 'Projekt bez nazwy');
check('walidacja: komunikat – brak wariantów', /nie ma listy wariantów/.test(A.projectShapeError({ name:'X' })), A.projectShapeError({ name:'X' }));
check('walidacja: komunikat – zły typ', /nie jest listą/.test(A.projectShapeError({ variants:'x' })));
check('walidacja: komunikat – pusta lista', /jest pusta/.test(A.projectShapeError({ variants:[] })));
check('walidacja: brak błędu dla poprawnego', A.projectShapeError({ variants:[{ label:'A' }] }) === null);

/* ---------- 20. Ocena kreacji (scoring) ---------- */
const pGood = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:2 }));
const scGood = A.scoreVariant(pGood, pGood.variants[0]);
check('scoring: zwraca ocenę 0–100', scGood.score >= 0 && scGood.score <= 100, scGood.score);
check('scoring: 5 składników oceny', scGood.parts.length === 5 && scGood.parts.reduce((a, x) => a + x.max, 0) === 100, scGood.parts.map(x => x.max).join('+'));
check('scoring: części nie przekraczają maksimów', scGood.parts.every(x => x.score <= x.max), JSON.stringify(scGood.parts));
check('scoring: pakiet lokalny ocenia się przyzwoicie (>=60)', scGood.score >= 60, scGood.score);
check('scoring: klasa oceny', A.scoreClass(90) === 'ok' && A.scoreClass(70) === 'warn' && A.scoreClass(30) === 'err');
check('scoring: średnia pakietu', A.averageScore(pGood) > 0 && A.averageScore(pGood) <= 100, A.averageScore(pGood));
check('scoring: werdykt słowny', /gotowe do publikacji|dobre|wymaga pracy|słabe/.test(scGood.grade), scGood.grade);

// wariant celowo zepsuty: długi hook bez konkretu, hype, brak CTA i opisu
const pBad = A.generateLocalPackage(Object.assign({}, baseBrief, { variants:1, modules:['hook','script'] }));
pBad.variants[0].sections.hook.body = 'HOOK A (0–3 s)\nGwarantujemy najlepszy na rynku efekt natychmiastowy, który zmieni Twoje życie raz na zawsze i już nigdy nie będziesz miał problemu z niczym';
pBad.variants[0].sections.script.body = '[0–3 s] Coś się dzieje\nBez przedziałów i bez liczb';
const scBad = A.scoreVariant(pBad, pBad.variants[0]);
check('scoring: zepsuty wariant oceniony niżej', scBad.score < scGood.score, `${scBad.score} vs ${scGood.score}`);
check('scoring: wykryty hype obniża hook', scBad.parts.find(x => x.key === 'hook').score <= 20, scBad.parts.find(x => x.key === 'hook').score);
check('scoring: wskazówki dla słabego wariantu', scBad.tips.length >= 3, scBad.tips.length);
check('scoring: wskazówka o CTA', scBad.tips.some(t => /CTA/i.test(t)), JSON.stringify(scBad.tips));
check('scoring: wskazówka o konkret/stronie', scBad.tips.some(t => /liczb|konkret|obietnic|gwarancj/i.test(t)), JSON.stringify(scBad.tips));
check('scoring: brak sekcji tylko jako wskazówka, nie wyjątek', (() => { try { A.scoreVariant({ brief:{length:15}, variants:[] }, { sections:{} }); return true; } catch(e){ return false; } })());

/* ---------- 21. Wersja aplikacji ---------- */
check('wersja: stała APP_VERSION', A.APP_VERSION === '2.3', A.APP_VERSION);

/* ---------- 22. Modele rozumujące ---------- */
check('o4-mini rozpoznany jako reasoning', A.isReasoningModel('o4-mini') === true);
check('gpt-5-mini rozpoznany jako reasoning', A.isReasoningModel('gpt-5-mini') === true);
check('gpt-4o-mini NIE jest reasoning', A.isReasoningModel('gpt-4o-mini') === false);

finish('TESTY JEDNOSTKOWE');
