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

node tests/unit.test.js                                  # silnik, eksporty, CSV, import listy, presety, pamięć (90 asercji)
NODE_PATH=/tmp/tt/node_modules node tests/e2e.test.js    # UI: hurt, import listy, presety, storyboard, kopia zapasowa (64 asercje)
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
- kopia zapasowa workspace: eksport bez klucza API, przywracanie danych, zachowanie lokalnego klucza

**e2e.test.js**

- tryb hurtowy: lista → partie kampanii → tabela, CSV, JSON, zapis do historii, otwieranie w Wynikach
- presety: tworzenie z briefu, edycja, usuwanie, użycie w briefie, eksport i import JSON
- storyboard 9:16: beaty, overlay, opis kadru, odtwarzanie, prędkość, przeskoki
- eksport CSV bieżącego pakietu i panel pamięci lokalnej
- fallback: błąd 401 → pakiet z silnika lokalnego
- import listy kampanii z pliku CSV/JSON + szablon CSV
- kopia zapasowa workspace: eksport, czyszczenie danych, wczytanie kopii, zachowanie klucza API
- partia asynchroniczna (6 kampanii) – UI pozostaje responsywne

**api.test.js**

- OpenAI: URL, nagłówki, treść zapytania
- generacja partiami: 7 wariantów → 3 zapytania (3+3+1), etykiety A–G
- modele rozumujące (`o4-mini`): `max_completion_tokens`, brak temperatury
- Gemini: `system_instruction`, `generationConfig`, klucz w URL
- własny endpoint OpenAI-compatible
- rozpoznawanie 5 nowych profili branżowych
