# Audyt runda 4 — aplikacja „Automat do Reklam TikTok – PRO”

Data: 2026-10-03 · audytowana wersja: **v2.6** · poprzednie rundy: `AUDIT.md` (v2.3), `AUDIT-2.md` (v2.4), `AUDIT-3.md` (v2.5→v2.6).

Metoda: analiza statyczna (165 funkcji — brak duplikatów, brak martwego kodu; CSS zbalansowany 295/295;
fałszywe alarmy „nieużywanych” funkcji wyjaśnione — binding przez referencję, nie wywołanie),
przegląd ścieżek krawędziowych wprowadzonych w v2.6 (import CSV, cel KPI, porównanie A/B, strefy
bezpieczeństwa), sonda runtime jsdom (canvas, execCommand, clipboard) i kontrastowanie parsera z
realnym kształtem eksportów TikTok Ads Manager (BOM, wiersze per dzień).

## A. Błędy znalezione w tej rundzie (naprawione)

| # | Problem | Dowód | Wpływ | Status |
|---|---|---|---|---|
| A4 | **BOM w eksporcie Ads Manager**: pliki CSV z Menedżera reklam często zaczynają się znakiem BOM (U+FEFF). BOM „przykleja się” do pierwszej komórki nagłówka (`\uFEFFwariant`) — normalizacja nagłówków go nie usuwała, więc kolumna „wariant” nie była rozpoznawana i import kończył się błędem / błędnym mapowaniem kolumn. | Analiza kodu parsera (`normAdsHeader` bez stripowania BOM) + standardowy kształt eksportów Ads Manager. | Średni (import „nie działa” na realnych plikach) | ✅ naprawione (parser usuwa BOM na wejściu) |
| A5 | **Import CSV nie do cofnięcia**: pomyłkowo zaimportowany plik dokładał pomiary i wyliczał zwycięzcę, ale nie pushował snapshotu undo — jedynym wyjściem było ręczne „Wyczyść dane” (traciło całość trackera). | Analiza kodu (handler `fileAdsImport` bez `pushUndo`). | Średni | ✅ naprawione (snapshot „import CSV” przed zmianą — Ctrl+Z cofa cały import) |
| A7 | **Stan stref bezpieczeństwa „przeciekał” między otwarciami storyboardu**: po włączeniu stref i zamknięciu modala, przy kolejnym otwarciu pasy były włączone (klasy `on`/`cyan` zostawały na statycznych elementach) — niespójne z intuicją „świeży podgląd za każdym razem”. | Analiza kodu (`openStoryboard` nie resetował klas; binding raz na starcie, klasy na elementach globalnych). | Niski | ✅ naprawione (reset do ukrytych przy każdym `openStoryboard`) |
| A8 | **Porównanie A/B przetrwało zmianę projektu**: `compareSel` było stanem modułowym i nie czyściło się przy przejściu do innego projektu (historia, partia, nowa generacja) — etykiety „A/B” znowego projektu trafiały na stary wybór, a po powrocie pokazywał się panel dla innego projektu. | Analiza kodu (`renderProject` bez kontroli tożsamości projektu). | Niski–średni | ✅ naprawione (selekcja czyści się przy zmianie tożsamości projektu w `renderProject`) |

Pozostałe ścieżki zweryfikowane czysto: XSS w nowym kodzie v2.6 (panel porównania, cel w podsumowaniu,
strefy — wartości użytkownika przez `esc()`), akumulacja listenerów (`bindStoryboard` wywoływana raz
na starcie), reset `fileInput.value` po imporcie (był), `undoStack.pop()` w A1 (zawsze po `pushUndo`).

## B. Ulepszenia funkcjonalne (wdrożone w tej rundzie)

| # | Funkcja | Zakres |
|---|---|---|
| F5 | **Import wielodniowy (seria w czasie)** | Realny eksport Ads Manager ma po wierszu na dzień — ten sam wariant wielokrotnie. Wcześniej tylko ostatni wiersz danej etykiety docierał do trackera (poprzednie cicho nadpisywane). Teraz **każdy wiersz = osobny pomiar w serii trendu** (parser zwraca dodatkowo `series: {wariant: [pomiar, …]}` w kolejności wierszy; `matched` zostaje ostatni wiersz — kompatybilne wstecz). Toast/log podaje dokładną liczbę pomiarów. |
| F6 | **⬇ PNG klatki storyboardu** (punkt roadmapy) | Przycisk „⬇ PNG” w odtwarzaczu storyboardu: renderuje bieżącą klatkę na canvasie 1080×1920 — gradient tła, chip beatu (czas + cel), tekst overlayu (zawijany, czysta funkcja `wrapTextByChars`), lower third (opis kadru), informacja o wariancie; jeśli strefy są włączone — rysuje też obrysy stref UI TikTok. Działa w 100% offline; bez wsparcia canvas (np. jsdom, starsze przeglądarki) — grzeczny toast zamiast błędu. |
| F7 | **Kopiowanie w porównaniu A/B + ARIA** | W panelu porównania każdy HOOK A i CTA ma przycisk „⧉” (kopiowanie sekcji wariantu przez wspólny `copyText`). Pasy stref bezpieczeństwa w storyboardzie dostały `aria-hidden="true"` (element dekoracyjny — czytniki ekranu nie odgrywają etykiet pasów). |

## C. Pozostałe na roadmapie (niewdrożone — do decyzji)

1. Tłumaczenie gotowego pakietu przez API (jeden klik: PL → EN/DE/UK/JA).
2. PWA (manifest + service worker) — wchodzi w konflikt z zasadą „jeden plik”; wymaga decyzji.
3. Kreator shot listy drag&drop + eksport PDF (wielostronicowy) — wymaga biblioteki PDF albo druku.
4. Eksport storyboardu PDF (sekwencja klatek) — rozszerzenie F6 (okno druku).
5. Macierz testów hook×CTA (generacja 2×2 / 3×3 kombinacji do A/B testu).
6. Przypominanie o kolejnym pomiarze (badge po 24–72 h od ostatniego importu).

## D. Dowody weryfikacji

- Sonda A4: import CSV zaczynający się BOM → przed naprawą nagłówek niedopasowany, po naprawie pełny match (test unit).
- Sonda F5: CSV z 3 wierszami wariantu A (3 dni) + 1 wierszem B → seria A = 3 pomiary, B = 1; `matched` = ostatni wiersz (testy unit + e2e).
- Sonda F6: `wrapTextByChars` — zachłanne zawijanie, długie słowa, pusty tekst, nowe linie (testy unit); e2e — przycisk PNG istnieje, w jsdom (canvas null) grzeczny toast, bez wyjątku.
- Testy: `bash tests/run-all.sh` — rozszerzone o § importu wielodniowego, BOM, undo importu, reset stref,
  porównanie A/B przy zmianie projektu, `wrapTextByChars` i guard canvas (licznik w `tests/README.md`).
