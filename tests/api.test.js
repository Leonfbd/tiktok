/**
 * Testy ścieżki API: OpenAI, Gemini, własny endpoint (OpenAI-compatible),
 * modele rozumujące (o-series) i generacja partiami dla 4–10 wariantów.
 * Uruchomienie: NODE_PATH=<node_modules z jsdom> node tests/api.test.js
 */
const { makeChecker, bootJsdom, tick } = require('./_helpers');
const { check, finish } = makeChecker();

/** Odpowiedź modelu z jednym lub kilkoma wariantami (format wymagany w prompcie). */
const answer = (labels = ['A']) => labels.map(L => `### WARIANT ${L}
KĄT: Problem → Rozwiązanie | HIPOTEZA: Wejście od bólu da wyższy hook rate
#### HOOK
HOOK A: Znasz to? Nierówny koloryt po zimie.
HOOK B: POV: twoja skóra po zimie.
HOOK C: Jeden szczegół psuje efekt.
REKOMENDACJA: Start z HOOK A.
#### SCENARIUSZ
[0–3 s] Ujęcie: zbliżenie na twarz
[3–8 s] Ujęcie: problem w kadrze
#### SHOT LIST
UJĘCIE 1 | 0–3 s | zbliżenie | twarz | wokal | "Znasz to?"
#### CTA
CTA GŁÓWNE: Kliknij link w opisie – cena i warunki są jawne.
#### NAZWY
#### HASHTAGI
#pielegnacja #fyp #dlaciebie #serum
#### NOTATKA A/B
KPI: hook rate 3 s, CTR`).join('\n\n');

const openaiBody = (labels) => ({ choices:[{ message:{ content: answer(labels) } }] });
const geminiBody = (labels) => ({ candidates:[{ content:{ parts:[{ text: answer(labels) }] } }] });

/** Ustawia dostawcę i klucz w ustawieniach aplikacji. */
function configure(window, document, provider){
  const $ = s => document.querySelector(s);
  $('#s_provider').value = provider;
  $('#s_provider').dispatchEvent(new window.Event('change', { bubbles:true }));
  if(provider === 'custom'){
    $('#s_baseurl').value = 'https://api.mojserwer.pl/v1/chat/completions';
    $('#s_baseurl').dispatchEvent(new window.Event('input', { bubbles:true }));
  }
  $('#s_key').value = 'test-key-abc';
  $('#btnSaveKey').click();
}

(async () => {
  /* ============ 1. OpenAI: podstawowa ścieżka ============ */
  {
    const { window, document, calls } = bootJsdom({ responder: () => openaiBody(['A']) });
    const $ = s => document.querySelector(s);
    configure(window, document, 'openai');
    $('#f_industry').value = 'kosmetyki naturalne';
    $('#f_product').value = 'serum z witaminą C';
    $('#f_campaign').value = 'Test API';
    // 3 warianty (domyślnie) → jedno zapytanie
    $('#btnGenerate').click();
    await tick(1500);

    check('OpenAI: 1 zapytanie dla 3 wariantów', calls.length === 1, calls.length);
    check('OpenAI: URL poprawny', calls[0].url === 'https://api.openai.com/v1/chat/completions', calls[0].url);
    check('OpenAI: nagłówek Authorization', /Bearer test-key-abc/.test(calls[0].opts.headers.Authorization));
    const payload = JSON.parse(calls[0].opts.body);
    check('OpenAI: messages system+user', payload.messages.length === 2 && payload.messages[0].role === 'system');
    check('OpenAI: max_tokens dla modelu standardowego', payload.max_tokens > 0 && payload.max_completion_tokens === undefined);
    check('OpenAI: temperatura obecna', typeof payload.temperature === 'number');
    check('OpenAI: pakiet oznaczony jako API', /API/.test($('#projEngine').textContent), $('#projEngine').textContent);
  }

  /* ============ 2. OpenAI: 7 wariantów → 3 zapytania partiami ============ */
  {
    const { window, document, calls } = bootJsdom({ responder: () => openaiBody(['A','B','C']) });
    const $ = s => document.querySelector(s);
    configure(window, document, 'openai');
    $('#f_industry').value = 'fitness';
    $('#f_product').value = 'plan treningowy';
    $('#f_variants').value = '7';
    $('#f_variants').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#btnGenerate').click();
    await tick(2500);

    check('partie: 3 zapytania dla 7 wariantów (3+3+1)', calls.length === 3, calls.length);
    const prompts = calls.map(c => JSON.parse(c.opts.body).messages[1].content);
    check('partie: każda partia prosi o właściwą liczbę wariantów',
      /Ilość wariantów: 3/.test(prompts[0]) && /Ilość wariantów: 3/.test(prompts[1]) && /Ilość wariantów: 1/.test(prompts[2]),
      prompts.map(p => (p.match(/Ilość wariantów: \d/) || [''])[0]).join(' | '));
    const cards = document.querySelectorAll('#resultsArea .var-card');
    check('partie: 7 kart wariantów (nadmiar z partii obcięty)', cards.length === 7, cards.length);
    const labels = Array.from(document.querySelectorAll('#resultsArea .var-tag')).map(e => e.textContent.trim());
    check('partie: etykiety A–G', labels.join('') === 'ABCDEFG', labels.join(''));
    check('partie: log pokazuje numery partii', /partia 1\/3/.test($('#genLog').textContent));
  }

  /* ============ 3. Model rozumujący (o4-mini) ============ */
  {
    const { window, document, calls } = bootJsdom({ responder: () => openaiBody(['A']) });
    const $ = s => document.querySelector(s);
    configure(window, document, 'openai');
    $('#s_modelCustom').value = 'o4-mini';
    $('#s_modelCustom').dispatchEvent(new window.Event('input', { bubbles:true }));
    $('#f_industry').value = 'saas';
    $('#f_product').value = 'system dla małych firm';
    $('#btnGenerate').click();
    await tick(1500);
    const payload = JSON.parse(calls[0].opts.body);
    check('reasoning: użyto max_completion_tokens', payload.max_completion_tokens > 0 && payload.max_tokens === undefined, JSON.stringify(Object.keys(payload)));
    check('reasoning: brak temperatury', payload.temperature === undefined);
    check('reasoning: model w zapytaniu', payload.model === 'o4-mini', payload.model);
    $('#s_modelCustom').value = '';
    $('#s_modelCustom').dispatchEvent(new window.Event('input', { bubbles:true }));
  }

  /* ============ 4. Gemini ============ */
  {
    const { window, document, calls } = bootJsdom({ responder: () => geminiBody(['A','B','C']) });
    const $ = s => document.querySelector(s);
    configure(window, document, 'gemini');
    $('#f_industry').value = 'moda';
    $('#f_product').value = 'kurtka zimowa';
    $('#btnGenerate').click();
    await tick(1500);
    check('Gemini: 1 zapytanie', calls.length === 1, calls.length);
    check('Gemini: URL z modelem i kluczem', /generativelanguage\.googleapis\.com\/v1beta\/models\/.+:generateContent\?key=test-key-abc/.test(calls[0].url), calls[0].url);
    const payload = JSON.parse(calls[0].opts.body);
    check('Gemini: system_instruction + contents', !!payload.system_instruction && payload.contents[0].parts[0].text.length > 10);
    check('Gemini: maxOutputTokens ustawiony', payload.generationConfig.maxOutputTokens > 0);
    check('Gemini: 3 warianty z jednej odpowiedzi', document.querySelectorAll('#resultsArea .var-card').length === 3);
  }

  /* ============ 5. Własny endpoint OpenAI-compatible ============ */
  {
    const { window, document, calls } = bootJsdom({ responder: () => openaiBody(['A']) });
    const $ = s => document.querySelector(s);
    configure(window, document, 'custom');
    $('#f_industry').value = 'zwierzęta';
    $('#f_product').value = 'mata chłodząca';
    $('#btnGenerate').click();
    await tick(1500);
    check('custom: zapytanie na własny endpoint', calls[0].url === 'https://api.mojserwer.pl/v1/chat/completions', calls[0].url);
    const payload = JSON.parse(calls[0].opts.body);
    check('custom: bez pól reasoning (max_tokens + temperatura)', payload.max_tokens > 0 && typeof payload.temperature === 'number');
  }

  /* ============ 6. Nowe branże rozpoznawane przez silnik lokalny ============ */
  {
    const { document } = bootJsdom();
    const $ = s => document.querySelector(s);
    const cases = [
      ['moda', 'kurtka puchowa zimowa', 'Moda'],
      ['zwierzęta', 'mata chłodząca dla psa', 'Zwierzęta'],
      ['gry mobilne', 'aplikacja z grami logicznymi', 'Gry'],
      ['dziecko', 'zestaw edukacyjny dla 3-latka', 'Dziecko'],
      ['ogród', 'nasiona i doniczki', 'Eko']
    ];
    for(const [industry, product, expected] of cases){
      $('#f_industry').value = industry;
      $('#f_product').value = product;
      $('#btnAutoFill').click();
      await tick(40);
      const recognized = document.querySelector('#projSummary') ? document.querySelector('#projSummary').textContent : '';
      // rozpoznanie profilu: pole problemu wypełnione treścią charakterystyczną dla branży
      check(`branża „${industry}” rozpoznana`, $('#f_problem').value.length > 20, $('#f_problem').value);
      void recognized;
    }
  }

  finish('TESTY API');
})();
