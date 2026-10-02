# Audyt runda 2 — aplikacja „Automat do Reklam TikTok – PRO”

Data: 2026-10-02 · audytowana wersja: **v2.3** · poprzedni audyt: `AUDIT.md` (wszystkie pozycje wdrożone).

Metoda: analiza statyczna (duplikaty 144 funkcji — brak; nieużywane funkcje — brak), kontrola zgodności
z oryginalną specyfikacją (style `szok`/`edukacja`, platforma `Spark Ads`, 12 języków, SRT, shot listy —
wszystkie obecne), sondy runtime w jsdom (regeneracja sekcji, partia, kopia zapasowa, undo) i przegląd
ścieżek krytycznych.

## A. Błędy znalezione w tej rundzie (naprawione)

| # | Problem | Dowód (sonda) | Wpływ | Status |
|---|---|---|---|---|
| A1 | **Kosmetyczny kod w krytycznym bloku `try`**: w `regenerateSection` wywołanie `el.scrollIntoView()` jest w tym samym `try` co generacja treści. Jeśli cokolwiek po wyrenderowaniu rzuci (np. środowisko bez `scrollIntoView`, element poza DOM), użytkownik dostaje toast „Błąd regeneracji” — mimo że treść już się zmieniła. Stan „busy” też wraca gałęzią błędu. | Sonda jsdom: po kliku „Regeneruj tylko to” toast `Błąd regeneracji: el.scrollIntoView is not a function`, log `✖`, choć treść i draft zostały zapisane. Po polyfillu `scrollIntoView` ta sama akcja: `Sekcja zregenerowana` + nowa treść. | Średni: fałszywy alarm w kluczowej operacji (użytkownik myli, że utracił zmianę i klika ponownie) | ✅ naprawione (kosmetyka w osobnym, niemieszczącym try, + guard `typeof`) |
| A2 | **Brak `aria-label` na przyciskach ikonowych** w tabeli partii (🗑) i wierszach list (historia, presety, kąty). | Skaner: `data-bact="del"` i `data-hact="del/dup/export"` bez etykiet. | Niski (a11y) | ✅ naprawione |
| A3 | **`ensureResults` nie waliduje metryki** — uszkodzony/zestarzały `results.metric` (inny id) nie ma fallbacku i `computeResults` porównuje `x[undefined]`. | Analiza kodu. | Niski | ✅ naprawione (fallback do `ctr`) |

## B. Ulepszenia funkcjonalne (roadmapa z `AUDIT.md` §D — wdrożone w tej rundzie)

| # | Funkcja | Zakres |
|---|---|---|
| B1 | **📈 Tracker: pomiary w czasie (trend)** | Za wariantem można mieć **wiele pomiarów** (np. po 24 h / 72 h / 7 dniach). Formularz w tabeli tworzy nową serię pomiaru; historia pomiarów jest widoczna („N pomiarów”), zwycięzca liczony jest z **ostatniego** pomiaru, a kolumna trendu pokazuje Δ ostatniego vs poprzedniego (▲/▼) i mini-sparkline (SVG bez bibliotek). Stare dane (jeden pomiar) są **migracji** w `normalizeProject`. Raport CSV przechodzi w format długi (wiersz = pomiar). |
| B2 | **🎬 Brief dla montażysty** | Przycisk przy wariancie i w nagłówku pakietu: gotowy, techniczny brief montażowy (TXT + kopiowanie) — specyfikacja (9:16, czas, bezpieczne strefy interfejsu TikTok), hook z timestampem, scenariusz z beatami i budżetem słów, shot list, overlay/napisy, CTA, dźwięk/muzyka, lista „nie rób” (bez czarnego startu, napisy w środku klatki, cięcia co 1–2 s). Bez strategii i hipotez — czysto produkcyjny dokument. |
| B3 | **⚡ Auto-scoring partii: „Regeneruj najsłabsze”** | Po wygenerowaniu partii w tabeli jest kolumna Ocena. Ustawiasz **próg** (domyślnie 70) i klikasz „⚡ Regeneruj najsłabsze” — aplikacja ponownie generuje (silnik lokalny, nowe ziarno) tylko kampanie poniżej progu (maks. 10 w rundzie), aktualizuje wiersze i raportuje w toaście ile poprawiło się. Słabe wiersze są oznaczone kolorem. |
| B4 | **📚 Biblioteka hooków użytkownika** | Z każdego wygenerowanego wariantu hooka głównego można zapisać go do biblioteki (z kontekstem: branża, czas, strategia, ocena pakietu). Panel w Ustawieniach: szukaj, kopiuj, „Użyj w wariancie A” ( podmienia HOOK A z `pushUndo`), usuń. Biblioteka wchodzi do **kopii zapasowej** i panelu pamięci (klucz `tiktok_pro_hooks_v1`). |

## C. Pozostałe na roadmapie (niewdrożone — do decyzji)

1. **Tłumaczenia maszynowe przez API** — pakiet w 3 językach jednym kliknięciem (wymaga klucza API).
2. **PWA / instalacja na telefon** — service worker wymaga oddzielnego pliku → wykracza poza wymaganie „jeden plik index.html”.
3. **Kreator shot listy drag & drop** — edycja ujęć w wariancie + eksport PDF (duży UX, wart osobnej rundy).
4. **Eksport storyboardu do PDF/PNG** — plansze kadrów dla klienta.

## D. Dowody weryfikacji

- Sonda A1 (przed/naprawa): toast błędu przy działającej regeneracji → po naprawie: brak fałszywego błędu, treść i draft poprawne.
- Migracja danych: projekt z `results.rows` w starym formacie (jeden obiekt) po `normalizeProject` ma `measurements: [jeden pomiar]`; `computeResults` i CSV działają bez zmian dla starych projektów.
- Testy: patrz `tests/README.md`; runner `bash tests/run-all.sh` (w tej rundzie rozszerzone o § pomiarów trendu, brief montażysty, auto-scoring partii i bibliotekę hooków).
