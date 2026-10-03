/**
 * Wspólne narzędzia testowe dla „Automat do Reklam TikTok – PRO”.
 * Testy uruchamiamy w Node (bez frameworka testowego) – każdy plik kończy się kodem wyjścia 0/1.
 */
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const HTML = () => fs.readFileSync(HTML_PATH, 'utf8');

/** Wynik asercji – zliczamy błędy i wypisujemy czytelny raport. */
function makeChecker(){
  const state = { fails: 0, total: 0 };
  const check = (name, cond, extra = '') => {
    state.total++;
    if(!cond){ state.fails++; console.log('✖ ' + name + '   >>> ' + extra); }
    else console.log('✔ ' + name);
  };
  const finish = (label) => {
    console.log('\n' + (state.fails ? `❌ ${label}: BŁĘDÓW ${state.fails}/${state.total}` : `✅ ${label}: WSZYSTKO OK (${state.total} asercji)`));
    process.exit(state.fails ? 1 : 0);
  };
  return { check, finish, state };
}

/** Minimalna atrapa DOM – do testów logiki (bez jsdom). */
function stubEnv(code){
  function makeEl(tag){
    return {
      tagName: (tag || 'div').toUpperCase(), value: '', textContent: '', innerHTML: '', className: '',
      dataset: {}, style: {}, type: 'text', checked: true, disabled: false, files: [],
      scrollTop: 0, scrollHeight: 0, options: [], min: 0, max: 10,
      classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
        toggle(c, f){ if(f === undefined){ this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { f ? this._s.add(c) : this._s.delete(c); } },
        contains(c){ return this._s.has(c); } },
      addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){}, remove(){},
      querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
      closest(){ return makeEl(); }, scrollIntoView(){}, focus(){}, click(){},
      setAttribute(){}, getAttribute(){ return null; }, matches(){ return false; }, insertAdjacentHTML(){}
    };
  }
  const els = new Map();
  global.document = {
    getElementById(id){ if(!els.has(id)) els.set(id, makeEl()); return els.get(id); },
    querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
    createElement(t){ return makeEl(t); }, addEventListener(){}, body: makeEl('body'), documentElement: makeEl('html')
  };
  const mem = {};
  global.localStorage = {
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; },
    _raw: mem
  };
  global.window = { isSecureContext: true, addEventListener(){}, scrollTo(){}, print(){} };
  global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
  global.location = { reload(){} };
  global.confirm = () => true;
  global.Blob = class { constructor(){} };
  global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL(){} };
  global.FileReader = class { readAsText(){} };
  global.fetch = async () => { throw new Error('offline w teście'); };

  // Kod aplikacji + eksport funkcji wewnętrznych do testów
  const exports = `;globalThis.__API = { generateLocalPackage, complianceScan, projectToTxt, projectToMd, projectToJson,
    parseApiAnswer, buildSystemPrompt, buildUserPrompt, buildABPlan, buildChecklist, detectNiche, collectBrief,
    generateLocalSection, pickAngles, STRATEGIES, MODULES, ANGLES, NICHES, LANGS, LENGTHS, BEAT_PURPOSE,
    toList, projectsToCsv, parseBatchLine, approxSize, fmtBytes, storeSet, isReasoningModel, pickAngles,
    getPresets, savePresets, allNiches, GENERIC_NICHE,
    batchListFromCsv, batchListFromJson, csvTemplate, workspacePayload, applyWorkspace,
    getAngles, saveAngles, computeResults, resultsToCsv, ensureResults, TRACK_METRICS, HOOK_STYLES, hookStyleLabel,
    normalizeProject, projectShapeError, scoreVariant, averageScore, scoreClass, APP_VERSION,
    normalizeResultsRows, commitDrafts, rowLatest, measurementStats, sparklineSvg, montageBriefText, montageBriefPackage,
    adsManagerCsvToMeasurements, adsCsvTemplate, wrapTextByChars, parseDateLoose, lastMeasurementAgeHours, extractHookCandidates, extractCtaCandidates, promoteCta, hookCtaMatrix, storyboardPrintHtml,
    getHooks, saveHooks, saveHookFromVariant, useHookInVariant, extractMainHook, replaceMainHook };`;
  eval(code + exports);
  return globalThis.__API;
}

/** Start aplikacji w jsdom (z zamockowanym fetch, jeśli podano responder). */
function bootJsdom(opts = {}){
  const { JSDOM, VirtualConsole } = require('jsdom');
  // Aplikacja loguje diagnostykę przez console.warn – w testach nie chcemy tego szumu
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(HTML(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.test/', virtualConsole });
  const { window } = dom;
  const calls = [];
  if(opts.responder){
    window.fetch = async (url, o) => {
      calls.push({ url: String(url), opts: o || {} });
      const body = opts.responder(String(url), o);
      if(body && body.__status && body.__status !== 200){
        return { ok: false, status: body.__status, json: async () => body, text: async () => JSON.stringify(body) };
      }
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
    };
  }
  window.document.execCommand = () => true;
  // jsdom nie implementuje części API przeglądarki – podstawiamy bezpieczne atrapy
  window.confirm = () => true;
  window.alert = () => {};
  window.print = () => {};
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  return { dom, window, document: window.document, calls };
}

const tick = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = { HTML, HTML_PATH, makeChecker, stubEnv, bootJsdom, tick };
