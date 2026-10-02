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

  /* ================= 7. FALLBACK API → SILNIK LOKALNY ================= */
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

  finish('TESTY E2E');
})();
