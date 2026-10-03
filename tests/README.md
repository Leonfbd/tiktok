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

node tests/unit.test.js                                  # silnik, eksporty, CSV, tracker, trend, brief, hooki, regexy hooka, import Ads Manager (189 asercji)
NODE_PATH=/tmp/tt/node_modules node tests/e2e.test.js    # UI: hurt, auto-scoring, trend, brief, hooki, animacje/stagger, v2.6 (194 asercji)
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
- tracker w UI: wpisywanie danych, kalkulacja na żywo, chip zwycięzcy, zmiana metryki, raport CSV, reset, trwałość w projekcie

**api.test.js**

- OpenAI: URL, nagłówki, treść zapytania
- generacja partiami: 7 wariantów → 3 zapytania (3+3+1), etykiety A–G
- modele rozumujące (`o4-mini`): `max_completion_tokens`, brak temperatury
- Gemini: `system_instruction`, `generationConfig`, klucz w URL
- własny endpoint OpenAI-compatible
- rozpoznawanie 5 nowych profili branżowych
