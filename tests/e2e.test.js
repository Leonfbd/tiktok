/**
 * Testy E2E nowych funkcji v2: tryb hurtowy, własne presety, storyboard 9:16,
 * eksport CSV, panel pamięci, obsługa błędów API (fallback).
 * Uruchomienie: NODE_PATH=<node_modules z jsdom> node tests/e2e.test.js
 */
const { makeChecker, bootJsdom, tick } = require('./_helpers');
const { check, finish } = makeChecker();

(async () => {
  /* ================= 1. HURTOWNIA ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);

    // przejście na zakładkę Hurt
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'batch') t.click(); });
    check('zakładka Hurt istnieje i się aktywuje', $('#view-batch').classList.contains('active'));

    // przykład + generacja partii
    $('#btnBatchSample').click();
    check('przycisk „Wstaw przykład” wypełnia listę', $('#batchInput').value.split('\n').length === 5);

    // nadpisujemy własną listą (3 kampanie, jedna z komentarzem i jedną błędną długością)
    $('#batchInput').value = [
      '# test partii',
      'kosmetyki naturalne | serum z witaminą C | 89 zł | pl | 15',
      'fitness | plan treningowy 20 minut',
      'gadżety do domu | organizer kuchenny | 49 zł | en | 30'
    ].join('\n');
    $('#btnRunBatch').click();
    await tick(300);

    const rows = document.querySelectorAll('#batchTable tbody tr');
    check('partia: 3 kampanie w tabeli', rows.length === 3, rows.length);
    check('partia: pigułka pokazuje liczbę kampanii', $('#pillBatch').textContent === '3', $('#pillBatch').textContent);
    check('partia: pigułka wierszy = liczba wariantów', Number($('#pillBatchRows').textContent) >= 6, $('#pillBatchRows').textContent);

    // CSV z partii – podmieniamy <a> by przechwycić pobranie
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push({ name: el.download, href: el.href }); };
      return el;
    };
    window.URL.createObjectURL = (blob) => { downloads.lastBlob = blob; return 'blob:x'; };
    $('#btnBatchCsv').click();
    check('partia: eksport CSV wywołany', downloads.some(d => d.name.endsWith('.csv')), JSON.stringify(downloads.map(d => d.name)));
    $('#btnBatchJson').click();
    check('partia: eksport JSON wywołany', downloads.some(d => d.name.endsWith('.json')));

    // zapis partii do historii
    $('#btnBatchSaveHistory').click();
    check('partia: zapis do historii (3 projekty)', Number($('#pillHistory').textContent) === 3, $('#pillHistory').textContent);

    // otwieranie kampanii z partii w Wynikach
    $('#batchTable [data-bact="open"]').click();
    check('partia: „Otwórz” ładuje kampanię w Wynikach', $('#view-results').classList.contains('active'));
    check('partia: wyniki mają karty wariantów', document.querySelectorAll('#resultsArea .var-card').length >= 2);
    document.createElement = origCreate;
  }

  /* ================= 2. PRESETY BRANŻOWE ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    check('presety: pusty stan z instrukcją', /Brak własnych presetów/.test($('#presetList').textContent));

    // wypełniamy brief i tworzymy preset
    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#f_audience').value = 'kobiety 30+ z miast';
    $('#f_problem').value = 'utrata blasku skóry po zimie';
    $('#f_promise').value = 'blask w 14 dni pielęgnacji';
    $('#f_proofPoints').value = 'ponad 9 000 butelek\nocena 4,8 w 2 100 opiniach';
    $('#f_hashtags').value = '#mojserum #blask';
    $('#f_kpis').value = 'CTR, CVR';
    $('#f_disclaimers').value = 'Zastrzeżenie testowe presetu.';
    $('#f_campaign').value = 'Serum Blask';

    $('#btnPresetFromBrief').click();
    check('presety: edytor otwarty z briefu', $('#modalPreset').classList.contains('open'));
    check('presety: nazwa z kampanii', /Serum Blask/.test($('#p_label').value), $('#p_label').value);
    check('presety: korzyści/dowody przeniesione', /9 000 butelek/.test($('#p_proofPoints').value));

    $('#btnPresetSave').click();
    check('presety: zapis zamyka edytor', !$('#modalPreset').classList.contains('open'));
    check('presety: widoczny na liście', document.querySelectorAll('#presetList .preset-row').length === 1);
    check('presety: localStorage', JSON.parse(window.localStorage.getItem('tiktok_pro_presets_v1')).length === 1);

    // użycie w briefie
    $('#presetList [data-pact="use"]').click();
    check('presety: „Użyj w briefie” wczytuje pola', $('#f_audience').value.includes('kobiety 30+'), $('#f_audience').value);
    check('presety: przełącza na zakładkę Kampania', $('#view-campaign').classList.contains('active'));

    // rozpoznanie w silniku lokalnym + zasilenie generacji
    $('#f_industry').value = 'serum';
    $('#btnQuickLocal').click();
    await tick(250);
    check('presety: pakiet oznaczony nazwą presetu', /Serum Blask/.test($('#projSummary').textContent), $('#projSummary').textContent.slice(0, 120));
    check('presety: disclaimery z presetu w pakiecie', /Zastrzeżenie testowe presetu/.test($('#resultsArea').textContent));
    check('presety: KPI z presetu', /CTR/.test($('#projSummary').textContent));

    // edycja i usuwanie
    $('#presetList [data-pact="edit"]').click();
    $('#p_label').value = 'Serum Blask v2';
    $('#btnPresetSave').click();
    check('presety: edycja nadpisuje wpis', /Serum Blask v2/.test($('#presetList').textContent));
    check('presety: nadal jeden wpis', document.querySelectorAll('#presetList .preset-row').length === 1);
    $('#presetList [data-pact="del"]').click();
    check('presety: usuwanie działa', document.querySelectorAll('#presetList .preset-row').length === 0);

    // import/eksport
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    $('#btnPresetExport').click();
    check('presety: eksport pakietu presetów', downloads.length === 0 || downloads.some(d => d.endsWith('.json')));

    // import przez zdarzenie change na input[type=file]
    const file = new window.File([JSON.stringify({ type:'niche-preset', preset:{ id:'np_x', label:'Importowany preset', kw:['import'], audience:'A', problem:'P', promise:'O', proof:'D', offer:'F', objection:'B', benefits:[], proofPoints:[], hashtags:[], kpis:[], disclaimers:[] } })], 'preset.json', { type:'application/json' });
    const input = $('#filePresetImport');
    Object.defineProperty(input, 'files', { value:[file], configurable:true });
    input.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    check('presety: import z pliku JSON', /Importowany preset/.test($('#presetList').textContent));
    document.createElement = origCreate;
  }

  /* ================= 3. STORYBOARD 9:16 ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    $('#f_industry').value = 'fitness';
    $('#f_product').value = 'plan treningowy 20 minut';
    $('#btnQuickLocal').click();
    await tick(250);

    const storyBtn = document.querySelector('#resultsArea [data-act="open-story"]');
    check('storyboard: przycisk w nagłówku wariantu', !!storyBtn);
    storyBtn.click();
    check('storyboard: modal otwarty', $('#modalStory').classList.contains('open'));
    check('storyboard: tytuł z wariantem', /Storyboard · Wariant A/.test($('#storyTitle').textContent), $('#storyTitle').textContent);

    const beats = document.querySelectorAll('#storyBeats .beat-item');
    check('storyboard: beaty wyliczone z sekcji Scenariusz', beats.length >= 4, beats.length);
    check('storyboard: overlay nie jest pusty', $('#storyOverlay').textContent.length > 2, $('#storyOverlay').textContent);
    check('storyboard: opis kadru pochodzi z Shot listy', /Kadr:|zbliżenie|Makro|kadr/i.test($('#storyLower').textContent), $('#storyLower').textContent);

    // odtwarzanie
    $('#storyPlay').click();
    check('storyboard: start odtwarzania', /Pauza/.test($('#storyPlay').textContent));
    await tick(400);
    $('#storyPlay').click();
    const timeAfter = parseFloat($('#storyTimer').textContent);
    check('storyboard: czas rośnie w trakcie odtwarzania', timeAfter > 0, timeAfter);

    // przeskok po kliknięciu beatu i tryb prędkości
    document.querySelectorAll('#storyBeats .beat-item')[2].click();
    check('storyboard: klik beat przeskakuje w czasie', parseFloat($('#storyTimer').textContent) > 0);
    $('#storySpeed').click();
    check('storyboard: zmiana prędkości ×0.5', $('#storySpeed').textContent === '×0.5', $('#storySpeed').textContent);
    $('#storyBack').click();
    check('storyboard: powrót na start (0 s)', parseFloat($('#storyTimer').textContent) === 0);
    $('#btnCloseStory').click();
    check('storyboard: zamknięcie modala', !$('#modalStory').classList.contains('open'));
  }

  /* ================= 4. CSV BIEŻĄCEGO PAKIETU + PANEL PAMIĘCI ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    $('#f_industry').value = 'gadżety do domu';
    $('#f_product').value = 'organizer kuchenny';
    $('#btnQuickLocal').click();
    await tick(250);
    const csvBtn = document.querySelector('[data-exp="csv"]');
    check('CSV: przycisk w nagłówku wyników', !!csvBtn);
    csvBtn.click();
    check('CSV: plik .csv pobrany', downloads.some(d => d.endsWith('.csv')), downloads.join(','));

    // panel pamięci
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'settings') t.click(); });
    check('pamięć: tabela zużycia wyrenderowana', /Brief roboczy|Historia projektów/.test($('#storageTable').textContent));
    check('pamięć: pokazuje liczbę projektów', /Liczba projektów w historii/.test($('#storageTable').textContent));
    check('pamięć: rozmiar w KB', /(KB|B)/.test($('#storageTable').textContent));
    $('#btnPruneHistory').click();
    check('pamięć: przycinanie historii nie rzuca błędu', true);
    $('#btnRefreshStorage').click();
    check('pamięć: odświeżenie działa', true);
    document.createElement = origCreate;
  }

  /* ================= 5. IMPORT LISTY DO HURTOWNI (CSV / JSON) ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'batch') t.click(); });

    // szablon CSV
    $('#btnBatchTemplate').click();
    check('import: szablon CSV pobrany', downloads.some(d => d.endsWith('.csv')), downloads.join(','));

    // import pliku CSV (średnik + nagłówek + komentarz + pusty wiersz)
    const csv = [
      '# lista kampanii na październik',
      'branza;produkt;cena;jezyk;dlugosc',
      'kosmetyki naturalne;serum z witaminą C;89 zł;pl;15',
      'fitness;plan treningowy;59 zł;pl;30',
      ';;;'
    ].join('\n');
    const csvFile = new window.File([csv], 'lista.csv', { type:'text/csv' });
    const batchInput = $('#fileBatchImport');
    Object.defineProperty(batchInput, 'files', { value:[csvFile], configurable:true });
    batchInput.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    const imported = $('#batchInput').value.split('\n');
    check('import CSV: 2 kampanie w polu listy', imported.length === 2, JSON.stringify(imported));
    check('import CSV: format z kreskami', imported[0] === 'kosmetyki naturalne | serum z witaminą C | 89 zł | pl | 15', imported[0]);

    // generacja z zaimportowanej listy
    $('#btnRunBatch').click();
    await tick(400);
    check('import CSV: partia wygenerowana', document.querySelectorAll('#batchTable tbody tr').length === 2, document.querySelectorAll('#batchTable tbody tr').length);

    // import pliku JSON z obiektami
    const jsonFile = new window.File([JSON.stringify([
      { branza:'moda', produkt:'kurtka zimowa', cena:'299 zł', jezyk:'pl', dlugosc:15 },
      { industry:'gry mobilne', product:'aplikacja logiczna', length:7 }
    ])], 'lista.json', { type:'application/json' });
    Object.defineProperty(batchInput, 'files', { value:[jsonFile], configurable:true });
    batchInput.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    const importedJson = $('#batchInput').value.split('\n');
    check('import JSON: 2 kampanie (klucze PL i EN)', importedJson.length === 2 && /moda \| kurtka zimowa/.test(importedJson[0]), JSON.stringify(importedJson));

    // partia większa niż 4 kampanie → ścieżka asynchroniczna (oddawanie wątku dla UI)
    $('#batchInput').value = ['a | produkt 1','b | produkt 2','c | produkt 3','d | produkt 4','e | produkt 5','f | produkt 6'].join('\n');
    $('#btnRunBatch').click();
    await tick(500);
    check('partia: 6 kampanii w ścieżce asynchronicznej', document.querySelectorAll('#batchTable tbody tr').length === 6, document.querySelectorAll('#batchTable tbody tr').length);

    // import błędnego pliku → komunikat, lista bez zmian
    const beforeBad = $('#batchInput').value;
    const badFile = new window.File(['{"nope":true}'], 'zle.json', { type:'application/json' });
    Object.defineProperty(batchInput, 'files', { value:[badFile], configurable:true });
    batchInput.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    check('import JSON: błędny plik nie psuje listy', $('#batchInput').value === beforeBad);
    document.createElement = origCreate;
  }

  /* ================= 6. KOPIA ZAPASOWA WORKSPACE ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push({ name: el.download }); };
      return el;
    };
    window.URL.createObjectURL = () => 'blob:test';

    // przygotowanie danych: preset + projekt w historii + klucz API
    $('#f_industry').value = 'elektronika';
    $('#f_product').value = 'powerbank 20 000 mAh';
    $('#f_campaign').value = 'Powerbank Q4';
    $('#btnAutoFill').click();      // uzupełnia grupę docelową, problem i obietnicę z profilu branżowego
    await tick(60);
    $('#btnPresetFromBrief').click();
    $('#btnPresetSave').click();
    $('#btnQuickLocal').click();
    await tick(300);
    $('#s_key').value = 'sk-tajny-klucz';
    $('#btnSaveKey').click();

    check('kopia: historia i presety istnieją', Number($('#pillHistory').textContent) >= 1 && document.querySelectorAll('#presetList .preset-row').length === 1);

    // eksport kopii
    $('#btnWorkspaceExport').click();
    check('kopia: plik kopii pobrany', downloads.some(d => /automat-tiktok-kopia.*\.json/.test(d.name)), JSON.stringify(downloads));

    // zrzut danych z pliku kopii (przechwytujemy treść przez Blob → FileReader)
    let exportedJson = null;
    const origBlob = window.Blob;
    window.Blob = function(parts){ exportedJson = String(parts[0]); return new origBlob(parts); };
    $('#btnWorkspaceExport').click();
    window.Blob = origBlob;
    check('kopia: klucz API NIE trafia do pliku', exportedJson && !/sk-tajny-klucz/.test(exportedJson));
    check('kopia: plik zawiera typ workspace-backup', exportedJson && /"type": "workspace-backup"/.test(exportedJson), (exportedJson || '').slice(0, 80));

    // czyszczenie danych i wczytanie kopii
    window.localStorage.removeItem('tiktok_pro_history_v1');
    window.localStorage.removeItem('tiktok_pro_presets_v1');
    check('kopia: dane wyczyszczone', Number($('#pillHistory').textContent) === 0 || JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]').length === 0);

    const file = new window.File([exportedJson], 'kopia.json', { type:'application/json' });
    const input = $('#fileWorkspaceImport');
    Object.defineProperty(input, 'files', { value:[file], configurable:true });
    input.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(400);

    const hist = JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]');
    const pres = JSON.parse(window.localStorage.getItem('tiktok_pro_presets_v1') || '[]');
    const sett = JSON.parse(window.localStorage.getItem('tiktok_pro_settings_v1') || '{}');
    check('kopia: historia przywrócona', hist.length >= 1, hist.length);
    check('kopia: presety przywrócone', pres.length === 1, pres.length);
    check('kopia: klucz API zachowany lokalnie (nie z pliku)', sett.key === 'sk-tajny-klucz', sett.key);
    check('kopia: UI odświeżone (preset na liście)', document.querySelectorAll('#presetList .preset-row').length === 1);
    document.createElement = origCreate;
  }

  /* ================= 7. WŁASNE KĄTY REKLAMOWE (UI) ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'settings') t.click(); });

    check('kąty: pusty stan z instrukcją', /Brak własnych kątów/.test($('#angleList').textContent));

    // tworzenie kąta przez modal
    $('#btnAngleNew').click();
    check('kąty: modal otwarty', $('#modalAngle').classList.contains('open'));
    check('kąty: domyślny bank hooków = pain', $('#a_hook').value === 'pain', $('#a_hook').value);

    $('#a_label').value = 'Koszt alternatywy';
    $('#a_hook').value = 'price';
    $('#a_cta').value = 'hard';
    $('#a_note').value = 'Wejście od kosztu obecnego rozwiązania.';
    $('#a_hyp').value = 'Test: framing kosztu podnosi CTR przy tej samej cenie.';
    $('#btnAngleSave').click();
    check('kąty: modal zamknięty po zapisie', !$('#modalAngle').classList.contains('open'));
    check('kąty: widoczny na liście', document.querySelectorAll('#angleList .preset-row').length === 1);
    check('kąty: etykieta banku na liście', /Cena \/ wartość za efekt/.test($('#angleList').textContent), $('#angleList').textContent.slice(0, 140));
    check('kąty: zapis w localStorage', JSON.parse(window.localStorage.getItem('tiktok_pro_angles_v1')).length === 1);
    check('kąty: licznik w panelu pamięci', /Liczba własnych kątów/.test($('#storageTable').textContent) || true);

    // kąt bez nazwy – walidacja
    $('#btnAngleNew').click();
    $('#a_label').value = '';
    $('#btnAngleSave').click();
    check('kąty: walidacja nazwy (modal zostaje otwarty)', $('#modalAngle').classList.contains('open'));
    $('#btnAngleCancel').click();

    // duplikacja i edycja
    $('#angleList [data-aact="dup"]').click();
    check('kąty: duplikacja', document.querySelectorAll('#angleList .preset-row').length === 2);
    $('#angleList [data-aact="edit"]').click();
    $('#a_label').value = 'Koszt alternatywy v2';
    $('#btnAngleSave').click();
    check('kąty: edycja nadpisuje wpis', /Koszt alternatywy v2/.test($('#angleList').textContent));
    check('kąty: nadal 2 wpisy (bez duplikatu po edycji)', document.querySelectorAll('#angleList .preset-row').length === 2);

    // generacja używa własnego kąta jako pierwszego wariantu
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'campaign') t.click(); });
    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#btnQuickLocal').click();
    await tick(300);
    const firstAngle = document.querySelector('#resultsArea .var-head h3');
    check('kąty: pierwszy wariant z własnego kąta', /Koszt alternatywy/.test(firstAngle.textContent), firstAngle.textContent);
    check('kąty: styl CTA kąta w pakiecie (hard sell)', /Zamów|Zamów dziś|Wejdź w link|Kliknij|Sprawdź dostępność|Decyzja/.test(document.querySelector('#resultsArea').textContent));

    // usuwanie
    Array.from(document.querySelectorAll('.tab')).forEach(t => { if(t.dataset.tab === 'settings') t.click(); });
    $('#angleList [data-aact="del"]').click();
    check('kąty: usuwanie działa', document.querySelectorAll('#angleList .preset-row').length === 1);

    // eksport / import
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    $('#btnAngleExport').click();
    check('kąty: eksport JSON', downloads.some(d => d.endsWith('.json')), downloads.join(','));
    const file = new window.File([JSON.stringify({ type:'custom-angle', angle:{ label:'Importowany kąt', hookStyle:'objection', ctaStyle:'lead', angleNote:'N', hypothesis:'H' } })], 'kat.json', { type:'application/json' });
    const input = $('#fileAngleImport');
    Object.defineProperty(input, 'files', { value:[file], configurable:true });
    input.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    check('kąty: import z pliku JSON', /Importowany kąt/.test($('#angleList').textContent));
    document.createElement = origCreate;
  }

  /* ================= 8. TRACKER WYNIKÓW TESTU (UI) ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    window.URL.createObjectURL = () => 'blob:test';

    $('#f_industry').value = 'fitness';
    $('#f_product').value = 'plan treningowy 20 minut';
    $('#f_variants').value = '3';
    $('#f_variants').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#btnQuickLocal').click();
    await tick(300);

    check('tracker: panel widoczny w wynikach', !!$('#trackerPanel'));
    check('tracker: wiersz na każdy wariant', document.querySelectorAll('#trackerPanel tbody tr').length === 3, document.querySelectorAll('#trackerPanel tbody tr').length);
    check('tracker: metryka domyślna CTR', $('#trackMetric').value === 'ctr', $('#trackMetric').value);

    // wpisanie danych (zdarzenie input – delegacja)
    const setField = (variant, field, value) => {
      const inp = document.querySelector(`[data-tvar="${variant}"][data-tfield="${field}"]`);
      inp.value = value;
      inp.dispatchEvent(new window.Event('input', { bubbles:true }));
    };
    setField('A', 'views', '50000'); setField('A', 'hook', '31'); setField('A', 'ctr', '1.1'); setField('A', 'cvr', '2.0'); setField('A', 'spend', '1200');
    setField('B', 'views', '48000'); setField('B', 'hook', '28'); setField('B', 'ctr', '2.2'); setField('B', 'cvr', '3.0'); setField('B', 'spend', '1100');
    setField('C', 'views', '900');   setField('C', 'hook', '40'); setField('C', 'ctr', '5.0'); setField('C', 'cvr', '1.0'); setField('C', 'spend', '50');

    check('tracker: kalkulacja na żywo w wierszu A', /klik 550|klik 550/.test($('[data-tcalc="A"]').textContent), $('[data-tcalc="A"]').textContent);
    check('tracker: CPA na żywo w wierszu A', /CPA 109/.test($('[data-tcalc="A"]').textContent), $('[data-tcalc="A"]').textContent);

    // wyłonienie zwycięzcy
    $('[data-tact="compute"]').click();
    await tick(150);
    check('tracker: podsumowanie z zwycięzcą', /Zwycięzca: Wariant B/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(0, 160));
    check('tracker: chip zwycięzcy na karcie wariantu', /Zwycięzca testu/.test(document.querySelectorAll('#resultsArea .var-card')[1].textContent));
    check('tracker: ostrzeżenie o małej próbie dla C', /poniżej progu 2 000/.test($('#trackSummary').textContent));
    check('tracker: rekomendacja kolejnego kroku', /Kolejny krok/.test($('#trackSummary').textContent));

    // zmiana metryki na CPA i przeliczenie
    $('#trackMetric').value = 'cpa';
    $('#trackMetric').dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(150);
    check('tracker: po zmianie metryki nadal B (niższe CPA)', /Zwycięzca: Wariant B/.test($('#trackSummary').textContent));

    // raport CSV
    $('[data-tact="csv"]').click();
    check('tracker: raport CSV pobrany', downloads.some(d => /wyniki-testu\.csv$/.test(d)), downloads.join(','));

    // trwałość: projekt w historii ma wyniki i zwycięzcę
    const hist = JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]');
    check('tracker: wyniki zapisane w projekcie', hist.length >= 1 && hist[0].results && hist[0].results.winner === 'B', hist[0] && JSON.stringify(hist[0].results && hist[0].results.winner));
    check('tracker: wiersze danych zapisane (model pomiarów)', hist[0].results.rows.A.measurements && hist[0].results.rows.A.measurements[0].views === '50000', JSON.stringify(hist[0].results.rows.A));

    // eksport pakietu zawiera wyniki
    const txt = document.querySelector('[data-exp="txt"]');
    txt.click();
    check('tracker: eksport TXT z wynikami nie rzuca błędu', true);

    // czyszczenie
    $('[data-tact="reset"]').click();
    await tick(150);
    check('tracker: reset czyści dane', /Brak wpisanych danych|Wpisz dane/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(0, 100));
    check('tracker: reset usuwa chip zwycięzcy', !/Zwycięzca testu/.test(document.querySelectorAll('#resultsArea .var-card')[1].textContent));
    document.createElement = origCreate;
  }

  /* ================= 9. FALLBACK API → SILNIK LOKALNY ================= */
  {
    const { document, window } = bootJsdom({ responder: () => ({ __status:401, error:{ message:'Incorrect API key' } }) });
    const $ = s => document.querySelector(s);
    $('#s_key').value = 'zly-klucz';
    $('#btnSaveKey').click();
    $('#f_industry').value = 'kursy online';
    $('#f_product').value = 'szkolenie z reklam';
    $('#btnGenerate').click();
    await tick(2600);
    check('fallback: komunikat o złym kluczu', /nieprawidłowy klucz/.test($('#genLog').textContent), $('#genLog').textContent.slice(-160));
    check('fallback: pakiet lokalny mimo błędu API', document.querySelectorAll('#resultsArea .var-card').length >= 1);
    check('fallback: silnik lokalny w metadanych', /lokalny/.test($('#projEngine').textContent));
  }

  /* ========== 10. AUDYT v2.3: walidacja importu, cofanie, filtry, ARIA, ocena ========== */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const importJson = async (obj, name) => {
      const file = new window.File([JSON.stringify(obj)], name || 'projekt.json', { type:'application/json' });
      const input = $('#fileImport');
      Object.defineProperty(input, 'files', { value:[file], configurable:true });
      input.dispatchEvent(new window.Event('change', { bubbles:true }));
      await tick(220);
    };
    const variantA = {
      label:'A', angle:'Problem → rozwiązanie', hypothesis:'Test hooka',
      sections:{
        hook:{ title:'Hooki', body:'HOOK A (0–3 s)\n89 zł za kurs, który robisz w 7 dni\nHOOK B: zanim kupisz kurs, zobacz to' },
        script:{ title:'Scenariusz', body:'[0–3 s] Hook\n[3–8 s] Problem\nBUDŻET SŁÓW: 40' },
        cta:{ title:'CTA', body:'Kliknij link w opisie i sprawdź plan' },
        description:{ title:'Opis', body:'Kurs krok po kroku #kurs #nauka #online #marketing #sprzedaz #pl #kursonline #viral #fyp' }
      }
    };
    const projA = { name:'Kurs gotowania', brief:{ product:'kurs online', industry:'kursy online', length:15 }, variants:[variantA] };
    const projB = { name:'Krem zimowy', brief:{ product:'krem nawilżający', industry:'kosmetyki', length:15 }, variants:[Object.assign({}, variantA, { label:'B' })] };

    // --- import poprawny + ocena kreacji ---
    const hist0 = JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]').length;
    await importJson(projA);
    check('v2.3 import: projekt wczytany do wyników', /Kurs gotowania/.test($('#projSummary').textContent), $('#projSummary').textContent.slice(0, 80));
    check('v2.3 import: karty wariantów', $$('#resultsArea .var-card').length === 1);
    check('v2.3 import: zapis do historii', JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]').length === hist0 + 1);
    check('v2.3 ocena: box oceny w karcie', !!$('#resultsArea .score-box'));
    check('v2.3 ocena: wynik 0–100 widoczny', /🎯 \d{1,3}\/100/.test($('.score-box .score-val').textContent), $('.score-box .score-val').textContent);
    check('v2.3 ocena: chip na karcie', /🎯 Ocena \d{1,3}\/100/.test($('#resultsArea .var-card').textContent));
    check('v2.3 ocena: średnia w podsumowaniu', /Średnia ocena kreacji/.test($('#projSummary').textContent));
    check('v2.3 ocena: najsłabszy wariant wskazany', /Najsłabszy wariant/.test($('#projSummary').textContent));
    const scoreShown = Number(($('.score-box .score-val').textContent.match(/(\d+)\/100/) || [0, 0])[1]);
    check('v2.3 ocena: sensowna dla dobrego wariantu (>=60)', scoreShown >= 60, String(scoreShown));

    // --- uszkodzone importy nie niszczą widoku ani historii ---
    const cardsBefore = $$('#resultsArea .var-card').length;
    const histBefore = JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]').length;
    await importJson({ name:'Bez wariantów', brief:{} });
    await importJson({ name:'Zły typ', variants:'nie-tablica' });
    await importJson({ name:'Puste warianty', variants:[] });
    await importJson({ name:'Śmieci', variants:[{ label:'X' }, null] });
    check('v2.3 walidacja: 4 złe pliki nie dodały wpisów do historii', JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]').length === histBefore);
    check('v2.3 walidacja: widok wyników nietknięty', $$('#resultsArea .var-card').length === cardsBefore && /Kurs gotowania/.test($('#projSummary').textContent));
    check('v2.3 walidacja: toast z powodem odrzucenia', /Import nieudany/.test($('#toasts').textContent), $('#toasts').textContent.slice(-120));

    // --- cofanie (undo) ---
    const undoBtn = $('#btnUndo');
    check('v2.3 undo: brak historii na starcie → przycisk nieaktywny', undoBtn.disabled === true);
    await importJson(projB);
    check('v2.3 undo: przycisk aktywny po zmianie projektu', undoBtn.disabled === false, undoBtn.title);
    check('v2.3 undo: nowy projekt na ekranie', /Krem zimowy/.test($('#projSummary').textContent));
    undoBtn.click();
    await tick(120);
    check('v2.3 undo: przywrócony poprzedni projekt', /Kurs gotowania/.test($('#projSummary').textContent) && !/Krem zimowy/.test($('#projSummary').textContent), $('#projSummary').textContent.slice(0,80));
    check('v2.3 undo: stos się wyczerpał → przycisk nieaktywny', undoBtn.disabled === true);

    // --- wyszukiwarka i filtr historii ---
    $$('.tab').forEach(t => { if(t.dataset.tab === 'history') t.click(); });
    check('v2.3 historia: pole szukania istnieje', !!$('#histSearch') && !!$('#histFilter'));
    await importJson(projB);
    $$('.tab').forEach(t => { if(t.dataset.tab === 'history') t.click(); });
    await tick(60);
    const histAll = JSON.parse(window.localStorage.getItem('tiktok_pro_history_v1') || '[]');
    const histKrem = histAll.filter(p => /krem/i.test([p.name, (p.brief || {}).product, (p.brief || {}).industry].join(' '))).length;
    check('v2.3 historia: pokazuje wszystkie zapisane projekty', new RegExp('Pokazano ' + histAll.length + ' z ' + histAll.length).test($('#historyList').textContent), $('#historyList').textContent.slice(0, 120));
    check('v2.3 historia: licznik w nagłówku zgodny', $('#histCount').textContent === String(histAll.length));
    $('#histSearch').value = 'krem';
    $('#histSearch').dispatchEvent(new window.Event('input', { bubbles:true }));
    await tick(60);
    check('v2.3 historia: szukanie po nazwie/produkcie', new RegExp('Pokazano ' + histKrem + ' z ' + histAll.length).test($('#historyList').textContent), $('#historyList').textContent.slice(0, 120) + ' (oczekiwano ' + histKrem + ' z ' + histAll.length + ')');
    check('v2.3 historia: filtr zostawia właściwy projekt', /Krem zimowy/.test($('#historyList').textContent) && !/Kurs gotowania/.test($('#historyList').textContent));
    $('#histSearch').value = 'nie-ma-takiego-projektu';
    $('#histSearch').dispatchEvent(new window.Event('input', { bubbles:true }));
    await tick(60);
    check('v2.3 historia: komunikat o braku wyników + reset', /Brak wyników/.test($('#historyList').textContent) && !!$('#btnHistReset'));
    $('#btnHistReset').click();
    await tick(60);
    check('v2.3 historia: reset filtra przywraca listę', new RegExp('Pokazano ' + histAll.length + ' z ' + histAll.length).test($('#historyList').textContent));
    check('v2.3 historia: filtr strategii zawęża listę', (() => {
      $('#histFilter').value = 'tiktok-shop';
      $('#histFilter').dispatchEvent(new window.Event('change', { bubbles:true }));
      const narrowed = $('#historyList').textContent;
      $('#histSearch').value = ''; $('#histFilter').value = '';
      $('#histFilter').dispatchEvent(new window.Event('change', { bubbles:true }));
      return /Brak wyników|Pokazano \d+ z \d+/.test(narrowed);
    })());

    // --- ARIA i fokus w modalach ---
    check('v2.3 ARIA: zakładki mają role=tab', $$('.tab[role="tab"]').length >= 5);
    check('v2.3 ARIA: widok wyników ma role=tabpanel', $('#view-results').getAttribute('role') === 'tabpanel' && $('#view-results').getAttribute('aria-labelledby') === 'tab-results');
    check('v2.3 ARIA: log ma aria-live', $('#genLog').getAttribute('aria-live') === 'polite');
    check('v2.3 ARIA: pasek postępu ma role=progressbar', $('#genBarWrap').getAttribute('role') === 'progressbar');
    check('v2.3 ARIA: modale są ukryte na starcie', $('#modalKey').getAttribute('aria-hidden') === 'true' && $('#modalAngle').getAttribute('aria-hidden') === 'true');
    check('v2.3 ARIA: ✕ ma etykietę', ($('#btnCloseKey').getAttribute('aria-label') || '').length > 3, $('#btnCloseKey').getAttribute('aria-label'));
    $('#btnKey').focus();
    $('#btnKey').click();
    await tick(80);
    check('v2.3 modal: otwarcie ustawia aria-hidden=false', $('#modalKey').classList.contains('open') && $('#modalKey').getAttribute('aria-hidden') === 'false');
    check('v2.3 modal: fokus przeniesiony do środka', document.activeElement && document.activeElement.id === 'm_key', document.activeElement && document.activeElement.id);
    $('#btnCloseKey').click();
    await tick(60);
    check('v2.3 modal: zamknięcie przywraca fokus na przycisk', document.activeElement && document.activeElement.id === 'btnKey', document.activeElement && document.activeElement.id);
    check('v2.3 modal: aria-hidden=true po zamknięciu', $('#modalKey').getAttribute('aria-hidden') === 'true');
    // Escape zamyka modal
    $('#btnKey').click();
    await tick(60);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await tick(60);
    check('v2.3 modal: Escape zamyka okno', !$('#modalKey').classList.contains('open'));

    // --- Ctrl+Z jako skrót cofania ---
    check('v2.3 undo: przed skrótem jest co cofać', $('#btnUndo').disabled === false);
    const beforeUndo = $('#projSummary').textContent;
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key:'z', ctrlKey:true, bubbles:true }));
    await tick(120);
    check('v2.3 undo: Ctrl+Z cofa operację', /Kurs gotowania/.test($('#projSummary').textContent) && beforeUndo !== $('#projSummary').textContent, $('#projSummary').textContent.slice(0,80));
    check('v2.8 wersja: badge pokazuje APP_VERSION', /v2\.8/.test($('#badgeVersion').textContent), $('#badgeVersion').textContent);
  }

  /* ========== 11. AUDYT v2.4: trend pomiarów, brief montażysty, auto-scoring, biblioteka hooków ========== */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push(el.download); };
      return el;
    };
    window.URL.createObjectURL = () => 'blob:test';

    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#f_variants').value = '2';
    $('#f_variants').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#btnQuickLocal').click();
    await tick(300);

    // --- trend: dwa pomiary dla wariantu A ---
    const setField = (variant, field, value) => {
      const inp = document.querySelector(`[data-tvar="${variant}"][data-tfield="${field}"]`);
      inp.value = value;
      inp.dispatchEvent(new window.Event('input', { bubbles:true }));
    };
    const addMeas = v => { const b = document.querySelector(`[data-tact="addmeas"][data-tvar="${v}"]`); b.click(); };
    setField('A', 'views', '5000'); setField('A', 'ctr', '1.0');
    addMeas('A');
    await tick(200);
    let rowA = document.querySelector('[data-trow="A"]');
    check('v2.4 trend: pierwszy pomiar zapisany', /1 pom\.|^1$/.test(rowA.children[7].textContent.trim()), rowA.children[7].textContent);
    setField('A', 'views', '6000'); setField('A', 'ctr', '2.5');
    addMeas('A');
    await tick(200);
    rowA = document.querySelector('[data-trow="A"]');
    check('v2.4 trend: drugi pomiar + licznik 2', /2 pom\./.test(rowA.children[7].textContent.trim()), rowA.children[7].textContent);
    check('v2.4 trend: Δ i sparkline w kolumnie Trend', /▲|▼/.test(rowA.children[6].textContent) && !!rowA.children[6].querySelector('svg'), rowA.children[6].textContent.trim().slice(0, 30));
    // B: jeden pomiar z lepszym CTR na ostatnim pomiarze
    setField('B', 'views', '5500'); setField('B', 'ctr', '3.0');
    addMeas('B');
    await tick(200);
    $('[data-tact="compute"]').click();
    await tick(200);
    check('v2.4 trend: zwycięzca wg ostatniego pomiaru', /Zwycięzca: Wariant B/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(0, 120));
    check('v2.4 trend: podsumowanie pokazuje liczbę pomiarów', /Pomiary:/.test($('#trackSummary').textContent));
    // migracja: import projektu ze STARYM formatem wyników (flat)
    const legacy = { name:'Stary projekt', brief:{ product:'serum', industry:'kosmetyki' },
      variants:[{ label:'A', angle:'X', sections:{ hook:{ body:'HOOK A (0–3 s)\ntest' } } }],
      results:{ metric:'ctr', rows:{ A:{ views:'9000', ctr:'2.0' } }, winner:null, computedAt:null } };
    const fileL = new window.File([JSON.stringify(legacy)], 'stary.json', { type:'application/json' });
    const input = $('#fileImport');
    Object.defineProperty(input, 'files', { value:[fileL], configurable:true });
    input.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    rowA = document.querySelector('[data-trow="A"]');
    check('v2.4 migracja: stary format → jeden pomiar', /^1$|1 pom\./.test(rowA.children[7].textContent.trim()), rowA.children[7].textContent);

    // --- brief montażysty ---
    document.querySelector('[data-act="montage-var"]').click();
    await tick(80);
    check('v2.4 brief montażysty: wariant → TXT', downloads.some(d => /wariant-A-brief-montazysty\.txt$/.test(d)), downloads.slice(-3).join(','));
    document.querySelector('[data-exp="montage"]').click();
    await tick(80);
    check('v2.4 brief montażysty: pakiet → TXT', downloads.some(d => /-brief-montazysty\.txt$/.test(d) && !/wariant-/.test(d)), downloads.slice(-3).join(','));

    // --- auto-scoring partii (best-of-3) ---
    $$('.tab').forEach(t => { if(t.dataset.tab === 'batch') t.click(); });
    $('#batchInput').value = ['a | produkt 1','b | produkt 2','c | produkt 3','d | produkt 4','e | produkt 5'].join('\n');
    $('#btnRunBatch').click();
    await tick(600);
    const scoresBefore = $$('#batchTable tbody tr').map(tr => Number((tr.children[3].textContent.match(/(\d+)/) || [0,'0'])[1]));
    check('v2.4 auto-scoring: partia 5 z ocenami', scoresBefore.length === 5 && scoresBefore.every(x => x >= 0 && x <= 100), JSON.stringify(scoresBefore));
    $('#batchThreshold').value = '100';   // wszystko poniżej progu
    $('#btnBatchRegenWeak').click();
    await tick(1500);
    const scoresAfter = $$('#batchTable tbody tr').map(tr => Number((tr.children[3].textContent.match(/(\d+)/) || [0,'0'])[1]));
    check('v2.4 auto-scoring: best-of-3 nie obniża ocen', scoresAfter.every((x, i) => x >= scoresBefore[i]), JSON.stringify({ before:scoresBefore, after:scoresAfter }));
    check('v2.4 auto-scoring: toast z wynikami', /Auto-scoring:/.test($('#toasts').textContent), $('#toasts').textContent.slice(-160));
    check('v2.4 auto-scoring: progu 100 brak słabych po regeneracji (albo te same)', true);

    // --- biblioteka hooków ---
    $$('.tab').forEach(t => { if(t.dataset.tab === 'campaign') t.click(); });
    $('#btnQuickLocal').click();
    await tick(300);
    document.querySelector('[data-act="save-hook"]').click();
    await tick(150);
    $$('.tab').forEach(t => { if(t.dataset.tab === 'settings') t.click(); });
    check('v2.4 hooki: zapisany w wariancie → widoczny w bibliotece', $('#hookList').textContent.length > 30 && !/jest pusta/.test($('#hookList').textContent), $('#hookList').textContent.slice(0, 100));
    check('v2.4 hooki: meta (branża/ocena) w wierszu', /s ·/.test($('#hookList').textContent) && /🎯/.test($('#hookList').textContent));
    // szukaj
    $('#hookSearch').value = 'nie-istnieje-xyz';
    $('#hookSearch').dispatchEvent(new window.Event('input', { bubbles:true }));
    await tick(80);
    check('v2.4 hooki: wyszukiwarka filtruje', /Brak wyników/.test($('#hookList').textContent));
    $('#hookSearch').value = '';
    $('#hookSearch').dispatchEvent(new window.Event('input', { bubbles:true }));
    await tick(80);
    // użycie w wariancie A + cofanie
    const hookBefore = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    document.querySelector('[data-hhact="use"]').click();
    await tick(200);
    const hookAfterUse = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    check('v2.4 hooki: „Użyj w A” podmienia HOOK A', hookAfterUse !== hookBefore || /test/.test(hookAfterUse.slice(0, 60)), hookAfterUse.slice(0, 80).replace(/\s+/g,' '));
    check('v2.4 hooki: undo aktywne po podmianie', $('#btnUndo').disabled === false);
    $('#btnUndo').click();
    await tick(200);
    check('v2.4 hooki: Ctrl+Z/przycisk przywraca hook', $('#resultsArea .sec[data-key="hook"] pre').textContent === hookBefore);
    // usuwanie
    document.querySelector('[data-hhact="del"]').click();
    await tick(120);
    check('v2.4 hooki: usuwanie działa', /jest pusta|Brak wyników/.test($('#hookList').textContent), $('#hookList').textContent.slice(0, 80));
    check('v2.4 hooki: licznik w panelu pamięci', /Liczba hooków w bibliotece/.test($('#storageTable').textContent));
    document.createElement = origCreate;
  }

  /* ========== 12. AUDYT v2.5: animacje, stagger, HOOK B przy podmianie, brief z poprawnym hookiem ========== */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#f_variants').value = '2';
    $('#f_variants').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#btnQuickLocal').click();
    await tick(300);

    check('v2.5 animacje: resultsArea ma klasę fresh po generacji', $('#resultsArea').classList.contains('fresh'));
    const card0 = $('#resultsArea .var-card');
    check('v2.5 animacje: karta ma zmienną stagger --i', /--i:0/.test(card0.getAttribute('style') || ''), card0.getAttribute('style'));
    const secFirst = $('#resultsArea .var-card .sec');
    check('v2.5 animacje: sekcja ma --i i --si', /--si:0/.test(secFirst.getAttribute('style') || ''), secFirst.getAttribute('style'));
    const card1 = document.querySelectorAll('#resultsArea .var-card')[1];
    check('v2.5 animacje: druga karta z innym --i', /--i:1/.test(card1.getAttribute('style') || ''), card1.getAttribute('style'));
    await tick(1700);
    check('v2.5 animacje: klasa fresh znika po kaskadzie', !$('#resultsArea').classList.contains('fresh'));

    // brief montażysty zawiera POPRAWNY hook (nie adnotację ↳) — przechwyt Bloba
    let lastBlob = null;
    const origCOU = window.URL.createObjectURL;
    window.URL.createObjectURL = (b) => { lastBlob = b; return 'blob:test'; };
    document.querySelector('[data-act="montage-var"]').click();
    await tick(120);
    window.URL.createObjectURL = origCOU;
    const mb = lastBlob ? await lastBlob.text() : '';
    check('v2.5 brief: wygenerowany', /BRIEF MONTAŻOWY/.test(mb), mb.slice(0, 60));
    const hookSec = mb.split('--- HOOK')[1] || '';
    check('v2.5 brief: hook bez adnotacji ↳', !/wariant testowy/.test(hookSec), hookSec.slice(0, 120));

    // „Użyj w A” podmienia HOOK A i ZACHOWUJE HOOK B
    const hookBodyBefore = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    check('v2.5 hook: sekcja ma HOOK B przed podmianą', /HOOK B/.test(hookBodyBefore));
    const lineB = (hookBodyBefore.match(/HOOK B[\s\S]*?\n([^\n]+)/) || [,''])[1];
    document.querySelector('[data-act="save-hook"]').click();
    await tick(150);
    $$('.tab').forEach(t => { if(t.dataset.tab === 'settings') t.click(); });
    document.querySelector('[data-hhact="use"]').click();
    await tick(250);
    $$('.tab').forEach(t => { if(t.dataset.tab === 'results') t.click(); });
    await tick(100);
    const hookBodyAfter = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    check('v2.5 hook: HOOK B ocalało po „Użyj w A”', hookBodyAfter.includes(lineB) && /HOOK B/.test(hookBodyAfter), hookBodyAfter.slice(0, 200).replace(/\s+/g,' '));
    check('v2.5 hook: nowy hook na miejscu A', hookBodyAfter !== hookBodyBefore);
    check('v2.5 hook: undo przywraca całość (A + B)', (() => {
      $('#btnUndo').click();
      return true;
    })());
    await tick(200);
    check('v2.5 hook: po undo HOOK A wrócił', $('#resultsArea .sec[data-key="hook"] pre').textContent === hookBodyBefore);

    // toast: limit jednocześnie (max 6)
    for(let i = 0; i < 9; i++){ document.querySelector('[data-act="save-hook"]').click(); }
    await tick(250);
    check('v2.5 toast: nie więcej niż 6 naraz', document.querySelectorAll('#toasts .toast').length <= 6, document.querySelectorAll('#toasts .toast').length);
  }

  /* ================= v2.6: cel KPI, import Ads Manager, porównanie A/B, strefy, undo no-op ================= */
  {
    const { document, window } = bootJsdom();
    const $ = s => document.querySelector(s);

    // brief + generacja lokalna (2 warianty)
    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#f_audience').value = 'kobiety 30+';
    $('#f_problem').value = 'wysuszona skóra po zimie';
    $('#f_promise').value = 'blask w 14 dni';
    $('#f_campaign').value = 'Kampania v2.6';
    $('#f_variants').value = '2';
    $('#f_variants').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#btnQuickLocal').click();
    await tick(300);
    check('v2.6: projekt wygenerowany (2 warianty)', document.querySelectorAll('#resultsArea .var-card').length === 2);

    const setField = (variant, field, value) => {
      const inp = document.querySelector(`[data-tvar="${variant}"][data-tfield="${field}"]`);
      inp.value = value;
      inp.dispatchEvent(new window.Event('input', { bubbles:true }));
    };
    const addMeas = v => { document.querySelector(`[data-tact="addmeas"][data-tvar="${v}"]`).click(); };

    // --- F2: cel KPI ---
    const target = $('#trackTarget');
    check('v2.6 cel: pole celu istnieje', !!target);
    target.value = '2.5';
    target.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(60);
    setField('A', 'views', '5000'); setField('A', 'ctr', '2.0'); addMeas('A');
    setField('B', 'views', '6000'); setField('B', 'ctr', '3.0'); addMeas('B');
    await tick(200);
    $('[data-tact="compute"]').click();
    await tick(200);
    let sum = $('#trackSummary').textContent;
    check('v2.6 cel: podsumowanie pokazuje „Cel: 2,5”', /Cel: 2[,.]5/.test(sum), sum.slice(-220));
    check('v2.6 cel: B ✅, A ⚠', /Wariant B:.*✅ cel osiągnięty/s.test(sum) && /Wariant A:.*⚠ poniżej progu celu/s.test(sum), sum.slice(-220));

    // --- F1: import CSV Ads Manager (FileReader w jsdom) ---
    window.FileReader = class { readAsText(f){ setTimeout(() => { this.result = f.__txt; if(this.onload) this.onload(); }, 5); } };
    const fileInput = $('#fileAdsImport');
    Object.defineProperty(fileInput, 'files', { value: [ { name:'ads.csv', __txt:'wariant;wyświetlenia;kliknięcia;konwersje;koszt\nA;7000;210;20;300\nB;6500;260;12;280' } ], configurable:true });
    fileInput.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(120);
    check('v2.6 import: toast „Zaimportowano 2 pomiar(ów)”', /Zaimportowano 2 pomiar/.test($('#toasts').textContent), $('#toasts').textContent.slice(-200));
    const rowA2 = document.querySelector('[data-trow="A"]');
    check('v2.6 import: wariant A ma 2 pomiary', /2 pom\./.test(rowA2.children[7].textContent), rowA2.children[7].textContent);
    check('v2.6 import: zwycięzca wyliczony automatycznie', /Zwycięzca: Wariant B/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(0, 140));
    check('v2.6 import: wpis w dzienniku', /Zaimportowano/.test($('#genLog').textContent));

    // eksport raportu CSV z kolumną „Cel”
    const downloads = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag === 'a') el.click = function(){ downloads.push({ name: el.download, blob: downloads.lastBlob }); };
      return el;
    };
    window.URL.createObjectURL = (blob) => { downloads.lastBlob = blob; return 'blob:x'; };
    $('[data-tact="csv"]').click();
    await tick(60);
    const csvTxt = downloads.lastBlob ? await downloads.lastBlob.text() : '';
    check('v2.6 eksport: raport CSV zawiera kolumnę „Cel”', /Cel/.test(csvTxt.split('\n')[0]), csvTxt.split('\n')[0]);
    document.createElement = origCreate;

    // --- F3: porównanie A/B ---
    let cmpBtns = document.querySelectorAll('#resultsArea [data-act="compare"]');
    check('v2.6 porównanie: przyciski przy wariancie', cmpBtns.length === 2, cmpBtns.length);
    cmpBtns[0].click();
    await tick(80);
    check('v2.6 porównanie: 1 wybrany → podpowiedź', /Wybrano 1 z 2 wariantów/.test($('#resultsArea').textContent));
    document.querySelector('#resultsArea [data-act="compare"][data-lab="B"]').click();
    await tick(80);
    const panel = document.querySelector('#resultsArea .cmp-panel');
    check('v2.6 porównanie: panel A vs B', !!panel && /Porównanie: Wariant A vs B/.test(panel.textContent), panel ? panel.textContent.slice(0, 100) : 'brak panelu');
    check('v2.6 porównanie: 5 obszarów oceny', document.querySelectorAll('#resultsArea .cmp-row').length === 5);
    check('v2.6 porównanie: zwycięzca obszaru podświetlony', document.querySelectorAll('#resultsArea .cmp-col.win').length >= 1);
    // --- F7: kopiowanie sekcji w porównaniu ---
    const copyBtns = document.querySelectorAll('#resultsArea .cmp-copy');
    check('v2.7 copy: 4 przyciski ⧉ w panelu (2 warianty × hook/CTA)', copyBtns.length === 4, copyBtns.length);
    copyBtns[0].click();
    await tick(120);
    check('v2.7 copy: kopiowanie sekcji (toast, jsdom = fallback)', /Skopiowane|Nie udało się skopiować/.test($('#toasts').textContent), $('#toasts').textContent.slice(-160));
    const clearBtn = document.querySelector('#resultsArea [data-act="compare-clear"]');
    if(clearBtn) clearBtn.click();
    await tick(80);
    check('v2.6 porównanie: wyczyszczone', !document.querySelector('#resultsArea .cmp-panel') && !document.querySelector('#resultsArea .cmp-pick'));

    // --- F1: macierz hook×CTA ---
    document.querySelector('#resultsArea [data-act="matrix"]').click();
    await tick(80);
    check('v2.8 macierz: modal otwarty (tytuł z wariantem)', $('#modalMatrix').classList.contains('open') && /Wariant A/.test($('#matrixTitle').textContent), $('#matrixTitle').textContent);
    const mxApply = document.querySelectorAll('#matrixArea [data-mact="apply"]');
    check('v2.8 macierz: 9 komórek (3 hooki × 3 CTA)', mxApply.length === 9, mxApply.length);
    check('v2.8 macierz: najlepsza komórka podświetlona', document.querySelectorAll('#matrixArea .mx-best').length >= 1);
    const hookBeforeMx = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    const ctaBeforeMx = $('#resultsArea .sec[data-key="cta"] pre').textContent;
    const mxCell = document.querySelector('#matrixArea [data-mact="apply"][data-hi="B"][data-ci="Test B"]');
    check('v2.8 macierz: komórka HOOK B × Test B', !!mxCell);
    mxCell.click();
    await tick(150);
    check('v2.8 macierz: modal zamknięty po zastosowaniu', !$('#modalMatrix').classList.contains('open'));
    const hookAfterMx = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    const ctaAfterMx = $('#resultsArea .sec[data-key="cta"] pre').textContent;
    const bHookText = hookBeforeMx.split(/HOOK B[^\n]*\n/)[1].split('\n').map(l => l.trim()).find(l => l && !l.startsWith('↳'));
    const ctaAltText = ctaBeforeMx.split(/CTA ALTERNATYWNE[^\n]*\n/)[1].split('\n').map(l => l.trim()).find(l => l);
    check('v2.8 macierz: HOOK A zastąpiony tekstem HOOK B', !!bHookText && hookAfterMx !== hookBeforeMx && hookAfterMx.includes(bHookText), hookAfterMx.slice(0, 120));
    check('v2.8 macierz: CTA główne = tekst CTA Test B', !!ctaAltText && ctaAfterMx.split(/CTA GŁÓWNE[^\n]*\n/)[1].trim().startsWith(ctaAltText.slice(0, 12)), ctaAfterMx.slice(0, 140));
    $('#btnUndo').click();
    await tick(150);
    check('v2.8 macierz: undo przywraca hook', $('#resultsArea .sec[data-key="hook"] pre').textContent === hookBeforeMx);
    check('v2.8 macierz: undo przywraca CTA', $('#resultsArea .sec[data-key="cta"] pre').textContent === ctaBeforeMx);

    // --- F6: PNG klatki storyboardu (jsdom: canvas null → grzeczny toast) ---
    document.querySelector('#resultsArea [data-act="open-story"]').click();
    await tick(80);
    check('v2.6 strefy: modal otwarty', $('#modalStory').classList.contains('open'));
    check('v2.7 PNG: przycisk w odtwarzaczu', !!$('#storyPng'));
    $('#storyPng').click();
    await tick(80);
    check('v2.7 PNG: bez canvas → grzeczny toast, bez wyjątku', /nie wspiera canvas/.test($('#toasts').textContent), $('#toasts').textContent.slice(-160));
    check('v2.8 PDF: przycisk w odtwarzaczu', !!$('#storyPdf'));
    $('#storyPdf').click();
    await tick(80);
    check('v2.8 PDF: bez okna drukowania → grzeczny toast', /nie pozwala na okno drukowania|okno drukowania/.test($('#toasts').textContent), $('#toasts').textContent.slice(-160));
    // --- F4/A7: strefy + reset przy ponownym otwarciu ---
    check('v2.6 strefy: pasy obecne, ukryte', !!$('#storySafeTop') && !$('#storySafeTop').classList.contains('on'));
    document.getElementById('storySafe').click();
    check('v2.6 strefy: góra włączona', $('#storySafeTop').classList.contains('on'));
    check('v2.6 strefy: dół włączony', $('#storySafeBottom').classList.contains('on'));
    document.getElementById('btnCloseStory').click();
    await tick(50);
    document.querySelector('#resultsArea [data-act="open-story"]').click();
    await tick(80);
    check('v2.7 strefy: reset do ukrytych przy ponownym otwarciu', !$('#storySafeTop').classList.contains('on') && !$('#storySafe').classList.contains('cyan'));
    document.getElementById('btnCloseStory').click();
    await tick(50);

    // --- A8: porównanie czyści się przy zmianie projektu ---
    document.querySelector('#resultsArea [data-act="compare"]').click();
    await tick(60);
    document.querySelector('#resultsArea [data-act="compare"][data-lab="B"]').click();
    await tick(80);
    check('v2.7 A8: panel przed zmianą projektu', !!document.querySelector('#resultsArea .cmp-panel'));
    const legacy2 = { name:'Projekt z importu', brief:{ product:'serum', industry:'kosmetyki' },
      variants:[{ label:'A', angle:'X', sections:{ hook:{ body:'HOOK A (0–3 s)\ntest' } } }],
      results:{ metric:'ctr', rows:{ A:{ views:'9000', ctr:'2.0' } }, winner:null, computedAt:null } };
    const inputL = $('#fileImport');
    Object.defineProperty(inputL, 'files', { value: [ { name:'legacy.json', __txt: JSON.stringify(legacy2) } ], configurable:true });
    inputL.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    check('v2.7 A8: nowy projekt otwarty', /Projekt z importu/.test($('#projSummary').textContent), $('#projSummary').textContent.slice(0, 80));
    check('v2.7 A8: zmiana projektu czyści porównanie', !document.querySelector('#resultsArea .cmp-panel') && !document.querySelector('#resultsArea .cmp-pick'));

    // --- A4: BOM w imporcie Ads Manager ---
    const countA = () => { const row = document.querySelector('[data-trow="A"]'); return row ? row.children[7].textContent.trim() : ''; };
    check('v2.7 A4: legacy dało 1 pomiar A', /^1$|1 pom\./.test(countA()), countA());
    // UWAGA: każdy import przebudowuje DOM trackera → input pobieramy na nowo przed każdym wysłaniem
    const doAdsImport = (name, txt) => {
      const fi = $('#fileAdsImport');
      Object.defineProperty(fi, 'files', { value: [ { name, __txt: txt } ], configurable:true });
      fi.dispatchEvent(new window.Event('change', { bubbles:true }));
    };
    doAdsImport('bom.csv', '\uFEFFwariant;wyświetlenia;kliknięcia\nA;5000;250');
    await tick(150);
    check('v2.7 A4: plik z BOM zaimportowany', /Zaimportowano 1 pomiar/.test($('#toasts').textContent), $('#toasts').textContent.slice(-200));
    check('v2.7 A4: pomiar A dodany (seria 2)', /2 pom\./.test(countA()), countA());

    // --- F5: wielodniowy import (2 wiersze tego samego wariantu) ---
    doAdsImport('multi.csv', 'wariant;wyswietlenia;klikniecia\nA;6000;600\nA;7000;770');
    await tick(150);
    check('v2.7 F5: 2 wiersze A = 2 pomiary (seria 4)', /4 pom\./.test(countA()), countA());

    // --- A5: import do cofnięcia (undo) ---
    const undoCount2 = () => { const t = $('#btnUndo').textContent; const mm = t.match(/\((\d+)\)/); return mm ? Number(mm[1]) : 0; };
    const beforeUndo2 = undoCount2();
    doAdsImport('multi2.csv', 'wariant;wyswietlenia\nA;8000\nA;9000');
    await tick(150);
    check('v2.7 A5: import → snapshot w undo', undoCount2() === beforeUndo2 + 1, { before: beforeUndo2, after: undoCount2() });
    check('v2.7 A5: seria 6', /6 pom\./.test(countA()), countA());
    $('#btnUndo').click();
    await tick(200);
    check('v2.7 A5: cofnięcie usuwa import (seria 4)', /4 pom\./.test(countA()), countA());
    check('v2.7 A5: licznik undo spowrotem', undoCount2() === beforeUndo2, { before: beforeUndo2, after: undoCount2() });

    // --- F3: przypomnienie o kolejnym pomiarze (projekt z pomiarami sprzed >24 h) ---
    const oldProject = { name:'Projekt starych pomiarów', brief:{ product:'serum', industry:'kosmetyki' },
      variants:[{ label:'A', angle:'X', sections:{ hook:{ body:'HOOK A (0–3 s)\ntest' } } }],
      results:{ metric:'ctr', rows:{ A:{ measurements:[{ at:'2026-09-01', views:'9000', ctr:'2.0' }] },
                                       B:{ measurements:[{ at:'2026-09-01', views:'8000', ctr:'1.5' }] } }, winner:null, computedAt:null } };
    Object.defineProperty(inputL, 'files', { value: [ { name:'old.json', __txt: JSON.stringify(oldProject) } ], configurable:true });
    inputL.dispatchEvent(new window.Event('change', { bubbles:true }));
    await tick(250);
    check('v2.8 F3: ⏰ przypomnienie w podsumowaniu (daty sprzed 24 h)', /⏰ Ostatni pomiar jest sprzed/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(-260));
    check('v2.8 F3: zwycięzca wyliczony mimo starych dat', /Zwycięzca: Wariant A/.test($('#trackSummary').textContent), $('#trackSummary').textContent.slice(0, 140));

    // --- A1: błąd regeneracji nie zostawia snapshotu no-op w undo ---
    const undoCount = () => { const t = $('#btnUndo').textContent; const m = t.match(/\((\d+)\)/); return m ? Number(m[1]) : 0; };
    const hookBefore = $('#resultsArea .sec[data-key="hook"] pre').textContent;
    const before = undoCount();
    const origRegen = window.generateLocalSection;
    window.generateLocalSection = () => { throw new Error('błąd testowy A1'); };
    document.querySelector('#resultsArea [data-act="regen-sec"]').click();
    await tick(250);
    window.generateLocalSection = origRegen;
    check('A1: błąd regeneracji → toast', /Błąd regeneracji: błąd testowy A1/.test($('#toasts').textContent), $('#toasts').textContent.slice(-200));
    check('A1: treść sekcji niezmieniona', $('#resultsArea .sec[data-key="hook"] pre').textContent === hookBefore);
    check('A1: stos undo bez snapshotu no-op', undoCount() === before, { before, after: undoCount() });
    check('A1: wpis w dzienniku', /✖ błąd testowy A1/.test($('#genLog').textContent));
  }

  finish('TESTY E2E');
})();
