# Automat do Reklam TikTok – PRO

Jednoplikowe narzędzie robocze do masowej produkcji reklam TikTok: scenariusze 7–45 s, hooki 0–3 s,
shot listy, overlay, napisy (SRT), CTA, opisy, hashtagi, callouty sprzedażowe i warianty A/B/C… (do 10).

**v2.0:** tryb hurtowy (partie kampanii + CSV), własne presety branżowe, podgląd storyboardu 9:16,
16 profili branżowych, generacja partiami przez API, wsparcie modeli rozumujących, guard pamięci localStorage.

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

**Branże (16 profili wiedzy):** beauty, fitness, e-commerce, kursy/produkty online, SaaS, usługi lokalne,
gastronomia, nieruchomości, motoryzacja, finanse, podróże, moda, zwierzęta, gry/aplikacje, dziecko/mama, eko/ogród.
Każdy profil wnosi grupę docelową, problem, obietnicę, dowody, korzyści, hashtagi, KPI i disclaimery.

**Ilość wariantów:** 1–10. W trybie API więcej niż 3 warianty generowane są partiami po 3 (stabilniejszy format
odpowiedzi), a etykiety są normalizowane do A–N.

## Tryb hurtowy (masowa produkcja)

Zakładka **3 · Hurt** przyjmuje listę kampanii – jedna linia = jedna kampania:

```
branża | produkt | [cena] | [język] | [długość]
kosmetyki naturalne | serum z witaminą C | 89 zł | pl | 15
fitness | plan treningowy 20 minut
gadżety do domu | organizer kuchenny | 49 zł | en | 30
```

Partia pracuje na silniku lokalnym: 50 kampanii w kilka sekund, bez kosztów API. Wynik można otwierać
pojedynczo w zakładce „Wyniki”, zapisać wszystkie do historii i wyeksportować do **CSV** (jeden wiersz = jeden wariant)
albo JSON.

## Własne presety branżowe

Ustawienia → **Własne presety branżowe**: zbuduj preset z aktualnego briefu („➕ Z bieżącego briefu”) albo ręcznie.
Preset dostarcza silnikowi lokalnemu grupę docelową, problem, obietnicę, dowody, korzyści, hashtagi, KPI i disclaimery —
i ma **priorytet nad profilami wbudowanymi** przy takim samym trafieniu słów kluczowych. Presety można edytować,
usuwać oraz eksportować/importować jako JSON (przenoszenie między komputerami).

## Storyboard 9:16

Przycisk **🎬 Storyboard** przy wariancie otwiera odtwarzacz: ramka 9:16 z overlayem, opisem kadru z shot listy
i listą beatów. Sterowanie: odtwarzanie, prędkość (×1 / ×0.5 / ×0.25 / ×2), klik na pasku postępu i przeskoki po beatach.
Pozwala sprawdzić rytm reklamy i to, czy teksty nie zasłaniają interfejsu TikToka.

## Wyniki i eksport

Każda sekcja ma przyciski **⧉ Kopiuj** oraz **↻ Regeneruj tylko to** (pojedyncza sekcja, bez ruszania reszty pakietu).
Cały pakiet eksportujesz do **TXT**, **MD**, **JSON**, **CSV** (arkusz dla hurtowej produkcji) albo jako
**pełny pakiet kampanii** (JSON do reimportu + MD do pracy). Przycisk **🖨 Drukuj / PDF** daje wersję do druku bez interfejsu.

Historia projektów: automatyczny zapis po każdej generacji, otwieranie, edycja briefu, duplikacja, usuwanie,
import/eksport JSON. Panel **💾 Pamięć lokalna** pokazuje zużycie miejsca (brief, historia, presety, ustawienia),
pozwala przyciąć historię do 10 najnowszych projektów i automatycznie chroni przed przepełnieniem (limitu ~5 MB).

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

## Testy

Aplikacja nie wymaga żadnych zależności w czasie działania. Testy (Node + jsdom) są w katalogu `tests/`:

```bash
bash tests/run-all.sh        # 141 asercji: jednostkowe + E2E + API
```

Szczegóły w `tests/README.md`.

## Struktura pliku

`index.html` zawiera wszystko: styl (ciemny motyw PRO), sekcje interfejsu oraz skrypt podzielony na bloki:
konfiguracja (języki, strategie, kąty A/B), baza branż, magazyn `localStorage`, silnik lokalny, prompty + klient API,
parser odpowiedzi, render wyników, eksport, historia, filtr zgodności, UI/init.

## Uwagi

- Aplikacja jest narzędziem wewnętrznym dla twórcy reklam — nie zawiera mechanizmów sprzedaży ani licencji.
- Wszystkie dane (brief, klucz, historia) są przechowywane lokalnie w przeglądarce; nic nie jest wysyłane na żaden serwer poza wybranym API.
- „Wyczyść wszystkie dane” w Ustawieniach usuwa brief, historię, ustawienia i klucz.
