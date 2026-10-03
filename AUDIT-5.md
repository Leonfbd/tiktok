# Audyt runda 5 — aplikacja „Automat do Reklam TikTok – PRO”

Data: 2026-10-03 · audytowana wersja: **v2.7** · poprzednie rundy: `AUDIT.md` (v2.3), `AUDIT-2.md` (v2.4), `AUDIT-3.md` (v2.6), `AUDIT-4.md` (v2.7).

Metoda: analiza statyczna (168 funkcji — brak duplikatów, brak martwego kodu; CSS zbalansowany 297/297),
przegląd ścieżek krawędziowych v2.7 (PNG, porównanie A/B, undo importu, reset stref) oraz pogłębiona
rewizja obszarów dotąd mniej testowanych: historia projektów (`id` na wszystkich ścieżkach twórczych —
lokalna/API/partia/import; deduplikacja `saveToHistory` po `id` — bez zalewania historii), reset
trackera (ma `pushUndo` ✓), `applyTrackerCompute`/`commitDrafts` ✓, responsywność storyboardu, ARIA
nowych przycisków. Kontrastowanie parsera importu z realnym kształtem eksportów (kolejność wierszy,
formaty dat).

## A. Błędy znalezione w tej rundzie (naprawione)

| # | Problem | Dowód | Wpływ | Status |
|---|---|---|---|---|
| A9 | **Import wielodniowy: seria niechronologiczna**: eksporty Ads Manager często grupują wiersze po nazwie reklamy (nie po dacie). Parser wkładał wiersze do serii w kolejności pliku — „trend” i „zwycięzca z ostatniego pomiaru” mogłyby być liczone na odwróconej osi czasu. | Analiza kodu (brak sortowania serii) + standardowy kształt eksportów. | Średni (poprawność trendu/wyniku) | ✅ naprawione (nowy `parseDateLoose`: ISO `yyyy-mm-dd`, PL `dd.mm.yyyy`/`dd/mm/yyyy`; jeśli wszystkie daty wariantu są parsowalne — seria sortowana rosnąco, `matched` = ostatni w czasie; sort stabilny — przy tych samych znacznikach kolejność pliku zostaje) |
| A10 | **`exportStoryPng` — wyjątek przy nieprawidłowym `story.vi`**: gdy stan `story` (indeks wariantu) nie pasuje do aktualnego projektu (m.in. wariantów), `currentProject.variants[story.vi]` bywa `undefined` i `v.label` rzuciłby TypeError poza `try` — nieobsłużony błąd w handlerze. | Analiza kodu (linia po `const canvas`, poza `try`). | Niski (edge) | ✅ naprawione (guard + grzeczny toast) |

Weryfikowane i czyste: historia (id w każdej ścieżce twórczej + deduplikacja), reset trackera (undo),
`applyTrackerCompute`, `undoStack.pop()` w A1, XSS w nowym kodzie v2.7, akumulacja listenerów,
responsywność `.story` (1 kolumna <820 px, kontrolki z `flex-wrap`), ARIA (tytuły przycisków PNG/strefy/⧉).

## B. Ulepszenia funkcjonalne (wdrożone w tej rundzie)

| # | Funkcja | Zakres |
|---|---|---|
| F1 | **🧪 Macierz testów hook×CTA** (punkt 5 roadmapy, offline) | Przycisk „🧪 Hook×CTA” przy wariancie. Wyciąga z pakietu kandydatów: HOOK A/B/C (z sekcji hook, pomijając adnotacje ↳) i CTA (Główne / Test B / Komentarz — z sekcji CTA). Każda kombinacja (do 3×3=9) jest **ocena na klonie wariantu** przez istniejący `scoreVariant` (replaceMainHook + `promoteCta`), więc macierz pokazuje, co realnie zmienia w ocenie 0–100 (delta do obecnej wersji). Modal z tabelą: komórka = wynik + delta (▲/▼), najlepsza podświetlona; „Użyj” per komórka i „⭐ Zastosuj najlepszą” — aplikacja kombinacji = undo + compliance + render. Czysta logika (`hookCtaMatrix`, `extractHookCandidates`, `extractCtaCandidates`, `promoteCta`) — testowalna bez DOM. |
| F2 | **🖨 PDF storyboardu** (punkt 4 roadmapy) | Przycisk „🖨 PDF” w odtwarzaczu: otwiera okno drukowania (czysty HTML+CSS w oknie, zero zależności) z **jedną stroną na beat** — rama 9:16 (chip czasu, overlay, lower third) + meta (projekt, wariant, kąt, opis ujęcia). Użytkownik zapisuje jako PDF przez standardowy dialog drukarki. Funkcja czysta `storyboardPrintHtml` (testowalna); bez `window.open` (jsdom/przeglądarki blokujące) — grzeczny toast z sugestią ⬇ PNG. |
| F3 | **⏰ Przypomnienie o kolejnym pomiarze** (punkt 6 roadmapy) | Podsumowanie trackera sprawdza wiek ostatniego pomiaru (daty z `at`, w tym wielodniowe z kolumny „data”); starsze niż 24 h → linia „⏰ Ostatni pomiar jest sprzed X dni/godzin — wpisz nowy (zalecany cykl: 24–72 h)”. Helper `lastMeasurementAgeHours` (czysty, testowany). |

## C. Pozostałe na roadmapie (niewdrożone — do decyzji)

1. Tłumaczenie gotowego pakietu przez API (jeden klik: PL → EN/DE/UK/JA).
2. PWA (manifest + service worker) — wchodzi w konflikt z zasadą „jeden plik”; wymaga decyzji.
3. Kreator shot listy drag&drop (DnD) — największy pozostały kawał UX.
4. Macierz hook×CTA dla **całego pakietu** (równocześnie wszystkie warianty) + eksport planu testu do CSV/MD.
5. Auto-sugerowanie celu KPI z benchmarku branżowego (banki NICHES → typowe CTR/CVR).

## D. Dowody weryfikacji

- Sonda A9: CSV z wierszami A (daty 03, 01, 02 — nieuporządkowane) → seria rosnąco 01→02→03, `matched` =
  pomiar z 03 (test unit); bez kolumny dat → kolejność pliku (test unit).
- Sonda A10: guard PNG (unit/e2e — brak wyjątku).
- F1: `hookCtaMatrix` — 3 hooki × 3 CTA = 9 komórek, zakresy 0–100, delta do base; `promoteCta`
  podmienia linię główną zachowując resztę; macierz zwraca `null` bez HOOK B/C lub bez sekcji CTA (testy unit);
  e2e — modal, 9 komórek, „Zastosuj najlepszą” zmienia HOOK A, undo przywraca.
- F2: `storyboardPrintHtml` — zawiera wszystkie beaty, nazwę projektu i wariant (test unit); e2e — przycisk
  + grzeczny toast bez `window.open` (jsdom).
- F3: `lastMeasurementAgeHours` (ISO i PL daty, brak pomiarów → null) (testy unit); e2e — import z datą sprzed
  24 h → linia ⏰ w podsumowaniu.
- Testy: `bash tests/run-all.sh` — rozszerzone o §v2.8 (licznik w `tests/README.md`).
