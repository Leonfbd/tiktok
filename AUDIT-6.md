# Audyt runda 6 — aplikacja „Automat do Reklam TikTok – PRO”

Data: 2026-10-03 · audytowana wersja: **v2.8** · poprzednie rundy: `AUDIT.md` (v2.3), `AUDIT-2.md` (v2.4),
`AUDIT-3.md` (v2.6), `AUDIT-4.md` (v2.7), `AUDIT-5.md` (v2.8).

Metoda: analiza statyczna (177 funkcji — brak duplikatów, brak martwego kodu; CSS 301/301),
przegląd obszarów dotąd nieaudytowanych: **tryb hurtowy** (`runBatch` — try/catch per kampania,
limity 50 linii/50, yield co 4 kampanie dla responsywności — czysto), **kopia zapasowa workspace**
(`applyWorkspace` — typ pliku walidowany, klucz API zawsze zachowywany, store set per sekcja — czysto),
**biblioteka hooków** (`useHookInVariant` — undo ✓, compliance ✓), **skróty klawiszowe i Esc**
(generic na `.modal.open` — modal macierzy pokryty), **format sekcji hook/CTA z odpowiedzi API**
(kandydaci do macierzy przy formacie inline).

## A. Błędy znalezione w tej rundzie (naprawione)

| # | Problem | Dowód | Wpływ | Status |
|---|---|---|---|---|
| A11 | **Macierz hook×CTA przy formacie inline**: `extractHookCandidates` oczekiwał formatu wielolinijkowego (`HOOK A (0–3 s)\ntekst`). Pakiety z API bywają w formacie inline (`HOOK A: tekst` lub `HOOK A (0–3 s) tekst` w jednym wierszu) — wtedy „tekst hooka” był pobierany z **następnego wiersza** (adnotacji lub innego contentu). | Analiza kodu (regex wymaga `[^\\n]*\\n` i bierze linię po nim) + format odpowiedzi modeli. | Niski–średni (macierz na pakieta API) | ✅ naprawione (najpierw treść po etykiecie w tym samym wierszu — po dwukropku/nawiasie, potem linia niżej) |
| A12 | **Tabela macierzy na telefonie**: 4 kolumny × długie teksty hooków nie mieściły się w wąskim ekranie — tabela wypychała modal/viewport (brak horizontal scroll). | Analiza CSS (brak `overflow-x` dla `.mx-table`). | Niski (mobile) | ✅ naprawione (wrapper `.mx-scroll` z `overflow-x:auto`) |
| A13 | **Niespójność zapisu historii**: `useHookInVariant` („Użyj w A” z biblioteki hooków) robił `saveDraft`, ale nie `saveToHistory` — wszystkie pozostałe ścieżki modyfikujące projekt (import, macierz, compute, czyszczenie) zaktualizowały wpis historii. Historia mogła pokazywać przestarzały projekt do następnego eksplicytnego zapisu. | Analiza kodu (porównanie ścieżek modyfikujących). | Niski | ✅ naprawione (dodane `saveToHistory`) |

Weryfikowane i czyste: `runBatch` (izolacja błędów, limity, yield), `applyWorkspace` (typ, klucz API,
store), `restoreDraft`, Esc/klawiatura, XSS w nowym kodzie v2.8 (macierz, PDF, ⏰), `scoreVariant`
na klonach w macierzy (bez mutacji oryginału — `JSON.parse(JSON.stringify(v))`).

## B. Ulepszenia funkcjonalne (wdrożone w tej rundzie)

| # | Funkcja | Zakres |
|---|---|---|
| F1 | **🌐 Pakiet w innym języku (offline)** | Przycisk „🌐 Język” w nagłówku pakietu: modal z 10+ językami (LANGS). Wybór uruchamia silnik lokalny na **tym samym briefie** (ta sama liczba wariantów) w docelowym języku — nowy pakiet „Nazwa (EN)” trafia do historii i otwiera się w Wynikach; oryginał zostaje. 100% offline (silnik ma własne szablony/CTA per język). Tłumaczenie przez API (wierniejsze) — na roadmapie. |
| F2 | **📋 Plan testu (eksport MD + CSV)** | Dwa eksporty w nagłówku pakietu: **Plan (MD)** — dokument: wynik (zwycięzca, metryka, cel z ✅/⚠ per wariant), sekcja per wariant (kąt, ocena 0–100, HOOK A, **rekomendacja z macierzy hook×CTA** z delta), „Kolejne kroki” (cykl 24–72 h, skalowanie +20–30%, kontrola, jedna zmiana naraz) + zastrzeżenie. **Plan (CSV)** — tablica: wariant, kąt, ocena, HOOK A, najlepsza kombinacja, wynik, status celu (do Excela). Czyste funkcje `testPlanMd`/`testPlanCsv` (testowalne bez DOM). |
| F3 | **🎯 Sugerowanie celu KPI z benchmarku** | Przycisk 🎯 przy polu „cel” w trackerze: dla metryk z uniwersalnym benchmarkiem In-Feed Ads (CTR 1,5% / CVR 2% / hook rate 30%) ustawia cel i przelicza; dla CPA/świetleń — informacja, że cel zależy od ekonomii kampanii. Toast zawsze zaznacza, że to **z założenia — do weryfikacji na własnych danych**. |

## C. Pozostałe na roadmapie (niewdrożone — do decyzji)

1. **Tłumaczenie pakietu przez API** (wierny przekład istniejącej treści, nie regeneracja) — wymaga klucza;
   naturalne rozwinięcie F1 (gdy `settings.key` i brief na API → ścieżka translacji, inaczej offline).
2. PWA (manifest + service worker) — konflikt z zasadą „jeden plik”; wymaga decyzji.
3. Kreator shot listy drag&drop (DnD).
4. Macierz hook×CTA **dla całego pakietu** (tabela warianty × kombinacje) + eksport planu testu
   z macierzami (rozwinięcie F2).
5. Benchmarki celów per branża (dane NICHES → typowe CTR/CVR) zamiast uniwersalnych wartości.

## D. Dowody weryfikacji

- Sonda A11: body inline `HOOK A: STOP. …\n\nHOOK B: POV. …` → kandydaci A/B poprawne (test unit);
  format wielolinijkowy bez zmian (testy istniejące).
- Sonda F1: `generateLocalPackage` z briefem lang=en → pakiet EN (jednostkowo: nazwa, język briefu,
  warianty) (test unit); e2e — modal, wybór EN → pakiet „(EN)” otwarty, oryginał w historii.
- Sonda F2: `testPlanMd` zawiera zwycięzcę, cel, rekomendację macierzy i „Kolejne kroki”; `testPlanCsv`
  — nagłówek + wiersz per wariant z kolumną „Wynik” (testy unit); e2e — przechwycone Bloby (MD/CSV).
- Sonda F3: `BENCH_TARGETS` (mapa) + e2e — klik 🎯 przy metryce CTR → pole celu = 1,5, podsumowanie
  „Cel: 1,5”, toast z benchmarkiem.
- Testy: `bash tests/run-all.sh` — rozszerzone o §v2.9 (licznik w `tests/README.md`).
