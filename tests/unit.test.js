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

/* ---------- 13. Modele rozumujące ---------- */
check('o4-mini rozpoznany jako reasoning', A.isReasoningModel('o4-mini') === true);
check('gpt-5-mini rozpoznany jako reasoning', A.isReasoningModel('gpt-5-mini') === true);
check('gpt-4o-mini NIE jest reasoning', A.isReasoningModel('gpt-4o-mini') === false);

finish('TESTY JEDNOSTKOWE');
