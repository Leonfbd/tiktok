# Audyt aplikacji „Automat do Reklam TikTok – PRO”

Data: 2026-10-02 · audytowana wersja: **v2.2** · zakres: `index.html` (286 KB, 1 plik, 0 zależności runtime),
`tests/` (246 asercji), README.

Metoda: statyczna analiza kodu (duplikaty deklaracji, martwy kod, nieużywane klasy CSS, pokrycie `id`),
testy sondujące w jsdom (import uszkodzonych plików), przegląd CSS pod kątem responsywności,
przegląd dostępności (ARIA/role/fokus) oraz przegląd ścieżek użytkownika pod kątem strat danych.

---

## A. Błędy potwierdzone testami (naprawione w tej iteracji)

| # | Problem | Dowód | Wpływ | Status |
|---|---|---|---|---|
| A1 | **Import projektu JSON bez walidacji struktury.** Plik z `variants` jako string albo z wariantem bez `sections` przechodzi walidację, ląduje w historii i **psuje widok wyników** (pusty ekran, błąd połknięty przez przeglądarkę). | Sonda: 3 kolejne importy → `#resultsArea` pusty, a w localStorage **2 wpisy śmieciowe**. | Krytyczny: utrata zaufania do danych, śmieci w historii | ✅ naprawione (`normalizeProject`, komunikat błędu) |
| A2 | **Poziomy overflow na telefonach.** `.grid-2` i `.sections` mają `minmax(430px,1fr)` bez nadpisania dla wąskich ekranów (media query 1000 px dotyczy tylko `.sections`, a i tam 430 px wymusza szerszy kafel). | Analiza CSS: brak reguły `grid-template-columns: minmax(0,1fr)` poniżej 760 px. | Wysoki: aplikacja nieużywalna na telefonie (a to narzędzie do TikToka) | ✅ naprawione (media ≤760 px) |
| A3 | **Puste `catch(e){}` ukrywają błędy.** 5+ miejsc połyka wyjątki bez logu. | `grep "catch(e){}"` → trafienia w magazynie i odtwarzaniu draftu. | Średni: brak diagnostyki, ciche awarie | ✅ naprawione (`warn()` → konsola) |

## B. Luki UX i dostępności (naprawione w tej iteracji)

| # | Problem | Wpływ | Status |
|---|---|---|---|
| B1 | **Zero atrybutów ARIA/role.** Taby, modale, toasty i pasek postępu są niewidoczne dla czytników ekranu; modal nie przenosi fokusu, po zamknięciu fokus nie wraca; brak pułapki Tab; ikonowe przyciski bez `aria-label`; brak stylu `:focus-visible`. | Wysokie: niedostępne narzędzie, słaba obsługa klawiaturą | ✅ naprawione (role/aria + fokus + trap + focus-visible) |
| B2 | **Regeneracja jest nieodwracalna.** „↻ Regeneruj tylko to” i „↻ Wszystkie sekcje” nadpisują dobrą treść bez możliwości cofnięcia. | Wysokie: realna utrata pracy przy masowej produkcji | ✅ naprawione (stos cofania + `Ctrl+Z`) |
| B3 | **Brak oceny kreacji przed publikacją.** Po wygenerowaniu nie ma sygnału, który wariant jest słaby (długi hook, brak konkretu, brak CTA, ryzyko zgodności). | Wysokie: jakość zależy od ręcznej oceny 10 wariantów | ✅ naprawione (scoring 0–100 + wskazówki) |
| B4 | **Historia bez wyszukiwania.** Do 60 projektów przewijanych ręcznie, brak filtra po strategii. | Średnie | ✅ naprawione (szukaj + filtr + licznik) |
| B5 | Martwy kod: `allNiches()` nieużywane (logika zduplikowana w `detectNiche`), klasa `.spin` bez zastosowania, wersja `v2.2` zaszyta w HTML. | Niskie: dług techniczny | ✅ naprawione (jedno źródło prawdy + stała `APP_VERSION`) |

## C. Pozostałe obserwacje (nie wymagają zmian teraz)

- `renderProject` zakłada poprawny kształt danych — po dodaniu `normalizeProject` każde wejście (import, historia, kopia zapasowa) jest normalizowane, więc ryzyko zniknęło.
- CSS: nazwy klas dynamicznych (`sec`, `check`, `beat-item`, `toast`) są generowane w JS — skaner statyczny zgłasza je jako „nieużywane”, to fałszywe trafienia.
- jsdom w testach nie implementuje `confirm`, `URL.createObjectURL`, `print` — uzupełnione w `tests/_helpers.js`.
- Brak duplikatów deklaracji funkcji (132 funkcje, 31 deklaracji najwyższego poziomu) — kod jest spójny.

## D. Roadmapa — kolejne ulepszenia (do decyzji, nie wdrożone)

1. **Trend wyników w czasie** — wiele pomiarów per wariant (np. po 24 h, 72 h, 7 dniach) → wykres i odpowiedź „czy wynik się utrzymuje”.
2. **Kreator shot listy** — ręczne dodawanie/usuwanie/przestawianie ujęć (drag & drop) i eksport do PDF dla ekipy.
3. **Eksport storyboardu** — lista kadrów + mini-plansze do PDF/PNG dla klienta.
4. **Biblioteka hooków użytkownika** — własne pojedyncze hooki (nie całe kąty) z licznikiem użycia i wynikami.
5. **Tryb współpracy** — eksport pojedynczego wariantu jako „brief dla montażysty” (bez sekcji strategicznych).
6. **Auto-scoring w trybie hurtowym** — automatyczne odrzucanie kampanii poniżej progu oceny i kolejka regeneracji.
7. **Tłumaczenia maszynowe przez API** — jednym kliknięciem wersja pakietu w 3 językach (obecnie: jeden język na generację).
8. **PWA/offline instalacja** — service worker, instalacja na telefonie (wymaga serwera, nie `file://`).

## E. Wynik audytu

Po wdrożeniu pozycji A1–A3 i B1–B5:

- uszkodzone pliki **nie psują** już historii ani widoku (walidacja + normalizacja + komunikat),
- aplikacja jest **używalna na telefonie** (tabele i siatki bez overflow),
- pełna **obsługa klawiatury i czytników ekranu** (taby, modale z pułapką fokusu i powrotem fokusu, toasty `aria-live`, pasek postępu `role="progressbar"`),
- każdą destrukcyjną operację można **cofnąć** (`Ctrl+Z`),
- każdy wariant dostaje **ocenę 0–100 z konkretnymi wskazówkami**, a ocena trafia do eksportów i do trybu hurtowego,
- historia jest **przeszukiwalna i filtrowana**.

### Dowody weryfikacji (po wdrożeniu)

- **Sonda importu** (ta sama, która wykryła A1): 4 uszkodzone pliki → **0 wpisów** w historii, widok wyników nietknięty, każdy błąd z komunikatem; potem poprawny plik → 1 wpis i 1 karta. Test e2e §10 powtarza ten scenariusz automatycznie.
- **Testy:** `bash tests/run-all.sh` → **311 asercji** (jednostkowe 147, E2E 137, API 27), wszystko zielone. Nowe bloki: walidacja + ocena kreacji (unit §19–21) oraz undo / filtry / ARIA / ocena w UI (e2e §10).
- **Przykładowa ocena:** pakiet lokalny dla briefu „kurs online” wypada ≥ 60/100; wariant z hype’em, długim hookiem i bez CTA spada wyraźnie niżej i dostaje konkretne wskazówki (m.in. o braku CTA), co pokrywa test.
- **Wersja:** badge i stała `APP_VERSION` = `2.3` (koniec martwego, zaszytego „v2.2”).

Stan testów po zmianach: patrz `tests/README.md` (runner: `bash tests/run-all.sh`).
