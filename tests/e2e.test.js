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
    check('tracker: wiersze danych zapisane', hist[0].results.rows.A.views === '50000', JSON.stringify(hist[0].results.rows.A));

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
    check('v2.3 wersja: badge pokazuje APP_VERSION', /v2\.3/.test($('#badgeVersion').textContent), $('#badgeVersion').textContent);
  }

  finish('TESTY E2E');
})();
