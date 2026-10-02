# Automat do Reklam TikTok – PRO

Jednoplikowe narzędzie robocze do masowej produkcji reklam TikTok: scenariusze 7–45 s, hooki 0–3 s,
shot listy, overlay, napisy (SRT), CTA, opisy, hashtagi, callouty sprzedażowe i warianty A/B/C… (do 10).

- **Jeden plik:** `index.html` — HTML + CSS + JS, zero bibliotek, zero backendu.
- **Działa offline:** wbudowany silnik lokalny generuje gotowy pakiet bez internetu i bez klucza API.
- **Opcjonalnie API:** OpenAI / Google Gemini / dowolny endpoint OpenAI-compatible (klucz zostaje w Twoim `localStorage`).
- **Magazyn:** brief, wyniki, ustawienia i historia projektów w `localStorage`.

## Jak uruchomić

**Wariant 1 – najprostszy (file://)**
Otwórz `index.html` dwuklikiem w Chrome / Edge / Firefoksie. Silnik lokalny i cała reszta działa w 100% offline.
Uwaga: przy otwarciu przez `file://` niektóre przeglądarki blokują żądania do API (CORS) — wtedy użyj wariantu 2.

**Wariant 2 – lokalny serwer (zalecany, gdy chcesz używać klucza API)**

```bash
cd katalog-z-aplikacja
python3 -m http.server 8080
# przeglądarka: http://localhost:8080/index.html
```

albo:

```bash
npx serve .
```

## Praca z API (opcjonalnie)

1. Kliknij **🔑 Klucz API** w prawym górnym rogu (skrót `Ctrl + K`).
2. Wybierz dostawcę: **OpenAI**, **Google Gemini** albo **OpenAI-compatible** (własny endpoint, np. OpenRouter / lokalny serwer modelu).
3. Wklej klucz i kliknij **Zapisz klucz**. Klucz trafia wyłącznie do `localStorage` tej przeglądarki i jest używany tylko do bezpośredniego wywołania API.
4. W **Ustawieniach** ustaw model, temperaturę, timeout i liczbę tokenów. Przyciskiem **Test połączenia** sprawdzisz, czy działa.

Bez klucza aplikacja automatycznie pracuje na **silniku lokalnym (offline)** — generuje realne treści na bazie briefu
(banki fraz i strategii PL/EN + struktury ujęć + lokalne CTA/hooki dla pozostałych języków).

## Tryby pracy

| Tryb | Co robi |
| --- | --- |
| **Manualny** | Wypełniasz cały brief ręcznie — pełna kontrola nad treścią. |
| **AUTOMAT** | Wpisujesz tylko branżę i produkt — resztę uzupełnia profil branżowy (przycisk „⚡ Auto-uzupełnij”) lub AI. |
| **⚡ Szybki pakiet lokalny** | Natychmiastowy pakiet z silnika offline, bez internetu (`Ctrl + Shift + L`). |

**Strategie** (każda zmienia sposób pisania reklamy): Viral/Clickbait, Performance/Sprzedaż, Budowa marki,
Lead generation, Agresywny direct response.

**Moduły do wygenerowania:** Hook, Scenariusz, Shot list, Narracja/VO, Overlay, Napisy, CTA, Opis TikTok,
Hashtagi, Callout sprzedażowy, Notatka A/B + KPI.

**Języki:** PL, EN, DE, ES, FR, IT, PT, NL, SV, CS, UK, DA (PL domyślnie). Pełne banki treści: PL i EN;
pozostałe języki offline = baza EN + lokalne hooki i CTA, pełna lokalizacja copy w trybie API.

## Wyniki i eksport

Każda sekcja ma przyciski **⧉ Kopiuj** oraz **↻ Regeneruj tylko to** (pojedyncza sekcja, bez ruszania reszty pakietu).
Cały pakiet eksportujesz do **TXT**, **MD**, **JSON** albo jako **pełny pakiet kampanii** (JSON do reimportu + MD do pracy).

Historia projektów: automatyczny zapis po każdej generacji, otwieranie, edycja briefu, duplikacja, usuwanie,
import/eksport JSON.

## Zgodność z politykami TikTok Ads

Wbudowany skaner wyłapuje frazy ryzykowne (gwarancje efektu, obietnice medyczne/finansowe, fałszywa pilność,
superlatywy bez dowodu) i — jeśli auto-filtr jest włączony — zamienia je na neutralne odpowiedniki.
Każdy pakiet zawiera gotowe disclaimery. To narzędzie pomocnicze: finalną treść zawsze sprawdź przed publikacją.

## Skróty

| Skrót | Akcja |
| --- | --- |
| `Ctrl + Enter` | Generuj pakiet |
| `Ctrl + Shift + L` | Szybki pakiet lokalny |
| `Ctrl + S` | Zapisz projekt w historii |
| `Ctrl + K` | Okno klucza API |

## Struktura pliku

`index.html` zawiera wszystko: styl (ciemny motyw PRO), sekcje interfejsu oraz skrypt podzielony na bloki:
konfiguracja (języki, strategie, kąty A/B), baza branż, magazyn `localStorage`, silnik lokalny, prompty + klient API,
parser odpowiedzi, render wyników, eksport, historia, filtr zgodności, UI/init.

## Uwagi

- Aplikacja jest narzędziem wewnętrznym dla twórcy reklam — nie zawiera mechanizmów sprzedaży ani licencji.
- Wszystkie dane (brief, klucz, historia) są przechowywane lokalnie w przeglądarce; nic nie jest wysyłane na żaden serwer poza wybranym API.
- „Wyczyść wszystkie dane” w Ustawieniach usuwa brief, historię, ustawienia i klucz.
