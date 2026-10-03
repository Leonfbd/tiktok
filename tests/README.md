# Testy – Automat do Reklam TikTok – PRO

Testy nie wymagają frameworka. Logika sprawdzana jest w Node, a interfejs w jsdom (prawdziwy DOM).

## Wymagania

- Node.js 18+ (testowane na 22)
- `jsdom` – tylko do testów E2E i API (aplikacja go nie używa)

```bash
mkdir -p /tmp/tt && cd /tmp/tt && npm install jsdom
export NODE_PATH=/tmp/tt/node_modules
```

## Uruchamianie

```bash
cd /home/user/tiktok

node tests/unit.test.js                                  # silnik, eksporty, CSV, tracker, trend, brief, hooki, regexy hooka, import Ads Manager, zawijanie tekstu, macierz hook×CTA, plan testu, benchmarki (218 asercji)
NODE_PATH=/tmp/tt/node_modules node tests/e2e.test.js    # UI: hurt, auto-scoring, trend, brief, hooki, animacje/stagger, v2.6, v2.7, v2.8, v2.9 (244 asercji)
NODE_PATH=/tmp/tt/node_modules node tests/api.test.js    # OpenAI / Gemini / custom / reasoning / partie (27 asercji)
```

Albo jednym poleceniem:

```bash
bash tests/run-all.sh
```

## Co pokrywają testy

**unit.test.js**

- struktura pakietu: warianty, kąty, moduły, sekcje
- budżet słów scenariusza dla 7/15/30/45 s
- języki (PL/EN/DE/UK/JA) i lokalne CTA
- pola zaawansowane briefu (korzyści, dowody, hashtagi, KPI, disclaimery)
- eksporty TXT / MD / JSON / CSV
- parser odpowiedzi modelu (nagłówki, hipoteza w linii z kątem, filtr modułów)
- własne presety: CRUD, rozpoznawanie branży, priorytet nad profilami wbudowanymi
- guard pamięci localStorage (symulacja `QuotaExceededError`)
- filtr zgodności z politykami TikTok Ads + auto-fix
- rozpoznawanie modeli rozumujących
- import listy kampanii z CSV (separatory ; , tab, nagłówki PL/EN, cudzysłowy, komentarze `#`) i z JSON
- kopia zapasowa workspace: eksport bez klucza API, przywracanie danych (historia, presety, kąty), zachowanie lokalnego klucza
- własne kąty: priorytet w doborze wariantów, bank hooków, styl CTA, hipoteza, nadpisywanie przez jawny sellMode
- tracker wyników: kliknięcia/konwersje/CPA, zwycięzca wg metryki, próg decyzyjny 2 000 wyświetleń, raport CSV, wyniki w TXT/MD/JSON
- walidacja projektów (v2.3): odrzucanie `null`/stringów/tablic, brak wariantów, warianty bez sekcji, naprawa briefu i metadanych, komunikaty błędów
- ocena kreacji (v2.3): 5 składników (30+25+20+15+10), zakres 0–100, wykrywanie hype’u i braków, wskazówki, klasa oceny, średnia pakietu, stała `APP_VERSION`
- pomiary w czasie (v2.4): migracja flat→measurements (idempotentna), delta/seria, zwycięzca z ostatniego pomiaru, poprzedni zwycięzca (stabilność), commit draftów, CPA jako metryka liczona, sparkline SVG, CSV w formacie długim
- brief montażysty (v2.4): sekcje produkcji, specyfikacja techniczna, budżet słów, bez strategii/hipotez, pakiet = wszystkie warianty
- biblioteka hooków (v2.4): magazyn, kopia zapasowa (payload + apply + licznik)
- ekstrakcja/podmiana HOOK A (v2.5): formaty wielolinijkowy i jednowierszowy, fallback hookLine, adnotacje ↳, zachowanie HOOK B przy podmianie
- import Ads Manager (v2.6): parser CSV (nagłówki PL/EN, dierytyki, separatory średnik/przecinek/tab, cudzysłowy, komentarze, komata), wyliczanie CTR/CVR, hookRate3s z ułamka na %, dopasowanie wariantu (nazwa lub kolejność), błędy (brak nagłówka, duplikat kolumny), pomijanie nieznanych wariantów, szablon CSV; A2: fallback ekstrakcji nie bierze tekstu HOOK B
- v2.7: BOM na początku pliku, seria per wariant (wielodniowy import; matched = ostatni wiersz), data pomiaru z kolumny „data”, zawijanie tekstu wrapTextByChars (słowa, cięcie długich, akapity, clamp)
- v2.8: parseDateLoose (ISO, PL dd.mm.yyyy/dd/mm/yyyy, błędy), sortowanie serii chronologicznie (A9) + kolejność pliku bez dat, wiek ostatniego pomiaru (brak/stary), macierz hook×CTA (ekstrakcja hooków i CTA, promoteCta, 3×3=9 komórek, zakresy, null bez sekcji), storyboardPrintHtml (beaty, projekt, wariant, page-break)
- v2.9: A11 ekstrakcja hooka w formacie inline („HOOK A: tekst” — treść z tego wiersza, także z zakresem i w mieszaninie z wielolinijkowym), BENCH_TARGETS (CTR 1,5 / CVR 2 / hook 30), testPlanCsv (nagłówek PL średnikiem, zwycięzca, status celu, rekomendacja kombinacji), testPlanMd (sekcje, zwycięzca, ✅/⚠, kolejne kroki, zastrzeżenie), A12: CSS .mx-scroll + min-width tabeli macierzy

**e2e.test.js**

- tryb hurtowy: lista → partie kampanii → tabela, CSV, JSON, zapis do historii, otwieranie w Wynikach
- presety: tworzenie z briefu, edycja, usuwanie, użycie w briefie, eksport i import JSON
- storyboard 9:16: beaty, overlay, opis kadru, odtwarzanie, prędkość, przeskoki
- eksport CSV bieżącego pakietu i panel pamięci lokalnej
- fallback: błąd 401 → pakiet z silnika lokalnego
- import listy kampanii z pliku CSV/JSON + szablon CSV
- kopia zapasowa workspace: eksport, czyszczenie danych, wczytanie kopii, zachowanie klucza API
- partia asynchroniczna (6 kampanii) – UI pozostaje responsywne
- własne kąty w UI: tworzenie, walidacja nazwy, duplikacja, edycja, usuwanie, eksport/import
- audyt v2.3 w UI: 4 uszkodzone importy JSON nie psują historii ani wyników, ocena widoczna na karcie i w podsumowaniu, cofanie (przycisk i `Ctrl+Z`), wyszukiwarka + filtr historii z licznikiem i resetem, ARIA zakładek/modalów/logu/postępu, fokus w modalu i powrót na przycisk, `Esc` zamyka okno, badge wersji
- audyt v2.4 w UI: trend (2 pomiary → Δ + sparkline + licznik, zwycięzca z ostatniego pomiaru), migracja starego formatu wyników, brief montażysty (wariant i pakiet → TXT), auto-scoring partii (best-of-3 nie obniża ocen), biblioteka hooków (zapis z wariantu, szukaj, „Użyj w A” + undo, usuwanie, licznik w pamięci)
- v2.5 w UI: klasa `fresh` + zmienne stagger (`--i`/`--si`) na kartach i sekcjach, klasa znika po kaskadzie, brief montażysty (przechwycony Blob) z poprawnym hookiem (bez adnotacji ↳), „Użyj w A” zachowuje HOOK B + undo, limit toastów (≤6)
- v2.6 w UI: cel KPI (pole w trackerze → „Cel: …” w podsumowaniu z ✅/⚠ per wariant, kolumna „Cel” w raporcie CSV), import CSV Ads Manager (FileReader w jsdom → nowe pomiary, toast, wpis w dzienniku, automatyczny zwycięzca), porównanie A/B (panel 0–100 + 5 obszarów + podświetlenie wygranego, podpowiedź przy 1 wybranym, wyczyszczenie), strefy bezpieczeństwa w storyboardzie (toggle pasa górnego i dolnego), A1: błąd regeneracji sekcji nie zostawia snapshotu no-op w undo (licznik, treść sekcji, dziennik)
- v2.7 w UI: import z BOM, import wielodniowy (2 wiersze wariantu = 2 pomiary), undo importu (snapshot + cofanie), przycisk ⧉ w porównaniu A/B (kopiowanie sekcji), PNG klatki (przycisk + grzeczny toast bez canvas), reset stref przy ponownym otwarciu storyboardu, A8: zmiana projektu czyści porównanie A/B
- v2.8 w UI: macierz hook×CTA (modal, 9 komórek, podświetlenie najlepszej, „Użyj” HOOK B × Test B → podmiana hooka i CTA głównego, undo przywraca), PDF storyboardu (przycisk + grzeczny toast bez okna), ⏰ przypomnienie w podsumowaniu przy starych datach pomiarów (projekt importowany z pomiarami sprzed 24 h)
- v2.9 w UI: 📋 plan testu (przyciski MD/CSV → pobrane bloby z poprawnym nagłówkiem i sekcjami), 🎯 benchmark celu (cel 1,5 dla CTR, toast z disclaimerem, wpis w dzienniku, metryka bez benchmarku → toast i cel bez zmian), 🌐 pakiet w innym języku (modal z 10+ językami, bieżący wyłączony, generacja pakietu (EN), nazwa z przyrostkiem, liczba wariantów, toast, dziennik, oryginał w historii), badge wersji v2.9
- tracker w UI: wpisywanie danych, kalkulacja na żywo, chip zwycięzcy, zmiana metryki, raport CSV, reset, trwałość w projekcie

**api.test.js**

- OpenAI: URL, nagłówki, treść zapytania
- generacja partiami: 7 wariantów → 3 zapytania (3+3+1), etykiety A–G
- modele rozumujące (`o4-mini`): `max_completion_tokens`, brak temperatury
- Gemini: `system_instruction`, `generationConfig`, klucz w URL
- własny endpoint OpenAI-compatible
- rozpoznawanie 5 nowych profili branżowych
