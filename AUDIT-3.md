# Audyt runda 3 — aplikacja „Automat do Reklam TikTok – PRO”

Data: 2026-10-03 · audytowana wersja: **v2.5** · poprzednie rundy: `AUDIT.md` (v2.3), `AUDIT-2.md` (v2.4).

Metoda: analiza statyczna (161 funkcji — brak duplikatów, brak martwego kodu; CSS zbalansowany 271/271),
kontrola XSS w hot-spotach (biblioteka hooków, tracker, partia, historia — wszędzie `esc()`),
sondy runtime i przegląd ścieżek krawędziowych w v2.4/v2.5 (trend, undo, auto-scoring, hooki, animacje).

## A. Błędy znalezione w tej rundzie (naprawione)

| # | Problem | Dowód | Wpływ | Status |
|---|---|---|---|---|
| A1 | **No-op snapshot w stosie undo**: `pushUndo` w `regenerateSection` działa PRZED regeneracją. Gdy regeneracja kończy się błędem (np. błąd API), nic się nie zmieniło, ale snapshot zostaje — „Cofnij” przywraca ten sam stan i myli użytkownika (myli, że cofa realną zmianę). | Analiza kodu (ścieżka `catch`). | Niski–średni | ✅ naprawione (snapshot usuwany w `catch`) |
| A2 | **`extractMainHook` — fallback mogł wyciągnąć tekst HOOK B**: gdy za nagłówkiem HOOK A jest od razu adnotacja `↳` (treść pusta), fallback „pierwszy niepusty wiersz” schodzi do sekcji HOOK B i zwraca jego treść jako „główny hook” (zafałszowuje scoring i bibliotekę). | Analiza kodu (brak ograniczenia segmentu do przednastępnego nagłówka). | Niski (edge) | ✅ naprawione (fallback tylko w segmencie przed `HOOK B/C…`) |
| A3 | **Stara kolumna Trend po zmianie metryki**: zmiana metryki decyzyjnej bez wcześniejszego „wyłonienia zwycięzcy” nie przeliczała kolumny Trend/Δ/sparkline (render dopiero przy następnej akcji). | Analiza kodu (handler `change` bez re-renderu). | Niski | ✅ naprawione (re-render panelu trackera) |

Weryfikacja XSS: wszystkie wartości użytkownika (hooki, kąty, presety, tracker, partia, historia, wyniki)
przechodzą przez `esc()` — brak wektora.

## B. Ulepszenia funkcjonalne (wdrożone w tej rundzie)

| # | Funkcja | Zakres |
|---|---|---|
| B1 | **⬆ Import CSV z TikTok Ads Manager do trackera** | Przycisk w panelu wyników testu. Rozpoznaje nagłówki PL/EN (wyświetlenia/impressions, kliknięcia/clicks, CTR, konwersje/conversions, kw/CVR, koszt/cost/spend, hook rate) i separator (`;` `,` tab, cudzysłowy). Wiersz CSV = jeden wariant (kolumna `wariant`/`ad name` lub kolejność). **Każdy import = jeden punkt w czasie** dla wszystkich dopasowanych wariantów (nowy pomiar w serii trendu), a po imporcie zwycięzca jest przeliczany automatycznie. CTR i CVR są wyprowadzane z kliknięć/wyświetleń i konwersji/kliknięć, gdy brak kolumn. „⬇ Szablon CSV” pobiera gotowy wzór. |
| B2 | **🎯 Cel KPI dla metryki decyzyjnej** | Pole „Cel” w panelu testu (np. CTR 2,0%). Podsumowanie ocenia zwycięzcę i każdy wariant: `✅ powyżej celu` / `⚠ poniżej celu`; cel trafia do raportu CSV i eksportów (TXT/MD). Zapisywany w projekcie (historia, kopia zapasowa). |
| B3 | **⚔ Widok porównania A/B (side-by-side)** | W każdej karcie wariantu „⚖ Do porównania” (maks. 2). Panel porównania: obok siebie oceny (0–100), paski 5 obszarów (hook/scenariusz/CTA/zgodność/opis), hook A i CTA, chip zwycięzcy na obszar; obszar z wyższą oceną podświetlony. „✕ Wyczyść”. Stan tymczasowy (bez zapisu w projekcie). |
| B4 | **Strefy bezpieczeństwa w storyboardzie** | Przycisk „⛶ Strefy” w odtwarzaczu: nakłada na klatkę 9:16 pasy górnej (~150 px) i dolnej (~200 px) strefy interfejsu TikTok z etykietami — widać od razu, czy overlay/napisy wchodzą w UI aplikacji. |

## C. Pozostałe na roadmapie (niewdrożone — do decyzji)

1. **Tłumaczenia przez API** — pakiet w 3 językach jednym kliknięciem (wymaga klucza API).
2. **PWA** — service worker = osobny plik → wykracza poza wymaganie „jeden plik `index.html`”.
3. **Kreator shot listy drag & drop** + eksport PDF (duży UX, osobna runda).
4. **Eksport storyboardu do PDF/PNG** (plansze kadrów dla klienta).
5. **Macierz testów hook × CTA** — plan testu N hooków × M CTA z jednym ciałem reklamy, eksport CSV do Ads Manager.

## D. Dowody weryfikacji

- Sonda A2: body `HOOK A (0–3 s)\n ↳ adnotacja\n\nHOOK B…\nTekst B` — przed naprawą fallback zwracał „Tekst B”, po naprawce zwraca adnotację/pusty wynik (bez zafałszowania).
- Import CSV: test E2E — 3 wiersze (PL i EN nagłówki) → 3 nowe pomiary w seriach, zwycięzca przeliczony, CTR wyprowadzony z kliknięć.
- Testy: `bash tests/run-all.sh` (w tej rundzie rozszerzone o § importu CSV, celu KPI, porównania A/B i stref bezpieczeństwa — licznik w `tests/README.md`).
