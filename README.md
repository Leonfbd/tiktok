# Automat do Reklam TikTok – PRO

Jednoplikowe narzędzie robocze do masowej produkcji reklam TikTok: scenariusze 7–45 s, hooki 0–3 s,
shot listy, overlay, napisy (SRT), CTA, opisy, hashtagi, callouty sprzedażowe i warianty A/B/C… (do 10).

**v2.8:** **🧪 macierz testów hook×CTA** (3 hooki A/B/C × 3 CTA, każda kombinacja oceniona 0–100 na klonie wariantu, „Zastosuj najlepszą” — cofalna), **🖨 PDF storyboardu** (okno drukowania, strona na beat), **⏰ przypomnienie** o kolejnym pomiarze (dane starsze niż 24 h), import wielodniowy sortowany chronologicznie (daty ISO i PL), guard eksportu PNG.

**v2.7:** import CSV Ads Manager potrafi **wielodniowe serie** (każdy wiersz = osobny pomiar w
trendzie, data z kolumny „data”), odporny na **BOM** (realne eksporty Menedżera), a sam import jest
**do cofnięcia** (undo); **⬇ eksport PNG klatki storyboardu** (1080×1920, offline, canvas);
kopiowanie HOOK A/CTA z panelu porównania A/B; strefy i porównanie czyści się poprawnie
przy zmianie projektu/ponownym otwarciu podglądu.

**v2.6:** import pomiarów z **TikTok Ads Manager (CSV)** (nagłówki PL/EN, CTR/CVR liczone
z wyświetleń/kliknięć, CTR z konwersji; każdy import = nowy pomiar + automatyczny zwycięzca),
**cel KPI** dla metryki decyzyjnej (podsumowanie ✅/⚠ per wariant, kolumna „Cel” w raporcie CSV,
linie celu w eksportach TXT/MD), **porównanie A/B** (do 2 wariantów side-by-side: ocena 0–100,
5 obszarów, hook + CTA, podświetlenie zwycięzcy obszaru) i **strefy bezpieczeństwa** w storyboardzie
(pasy UI TikTok: góra ~8%, dół ~20%). Naprawione: snapshot no-op w undo przy błędzie regeneracji
sekcji, fallback ekstrakcji HOOK A (nie bierze już tekstu HOOK B) i stara kolumna Trend bez daty.

**v2.5:** system animacji i dopieszczenie grafiki — kaskadowe wejście kart i sekcji, animowane modale, toasty
z wyjściem, puls zwycięzcy, rosnące paski ocen, poświaty tła, micro-interactions (hover/active),
`prefers-reduced-motion`; naprawione: kruche regexy HOOK A (obradowały błędnie dla formatu API) i limit toastów.

**v2.4:** pomiary w czasie w trackerze (trend + sparkline, zwycięzca z ostatniego pomiaru), brief montażysty
(wariant i pakiet), auto-scoring partii („Regeneruj najsłabsze”, best-of-3) i biblioteka hooków użytkownika.

**v2.3:** ocena kreacji 0–100 z konkretnymi wskazówkami, cofanie operacji (Ctrl+Z), walidacja importów JSON,
wyszukiwarka i filtr historii, dostępność (ARIA, klawiatura) oraz pełna responsywność na telefonie.

**v2.2:** kreator własnych kątów reklamowych (bank hooków + styl CTA + hipoteza) oraz tracker wyników testu
(dane z Menedżera reklam → automatyczny zwycięzca A/B i raport CSV).

**v2.1:** import listy kampanii z CSV/JSON, kopia zapasowa całego workspace, 21 profili branżowych,
partie generowane asynchronicznie (UI nie zamarza).

**v2.0:** tryb hurtowy (partie kampanii + CSV), własne presety branżowe, podgląd storyboardu 9:16,
generacja partiami przez API, wsparcie modeli rozumujących, guard pamięci localStorage.

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

**Branże (21 profili wiedzy):** beauty, fitness, e-commerce, kursy/produkty online, SaaS, usługi lokalne,
gastronomia, nieruchomości, motoryzacja, finanse, podróże, moda, zwierzęta, gry/aplikacje, dziecko/mama, eko/ogród,
elektronika/tech, zdrowie/suplementy, śluby/eventy, rękodzieło/prezenty, B2B/przemysł.
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

Partia pracuje na silniku lokalnym: 50 kampanii w kilka sekund, bez kosztów API. Generowanie jest asynchroniczne
(partiami po 4 kampanie), więc interfejs i pasek postępu pozostają responsywne nawet przy długiej liście.
Wynik można otwierać pojedynczo w zakładce „Wyniki”, zapisać wszystkie do historii i wyeksportować do **CSV**
(jeden wiersz = jeden wariant) albo JSON.

**Import listy z pliku:** przycisk „⬆ Import listy (CSV / JSON)” wczytuje plik CSV (separator `;`, `,` lub tabulator,
nagłówki PL/EN, obsługa cudzysłowów, komentarze `#`) albo JSON (tablica obiektów z kluczami `branza`/`industry`,
`produkt`/`product`, `cena`/`price`, `jezyk`/`lang`, `dlugosc`/`length` lub tablica gotowych linii).
Przycisk „⬇ Szablon CSV” pobiera gotowy wzór pliku.

## Własne presety branżowe

Ustawienia → **Własne presety branżowe**: zbuduj preset z aktualnego briefu („➕ Z bieżącego briefu”) albo ręcznie.
Preset dostarcza silnikowi lokalnemu grupę docelową, problem, obietnicę, dowody, korzyści, hashtagi, KPI i disclaimery —
i ma **priorytet nad profilami wbudowanymi** przy takim samym trafieniu słów kluczowych. Presety można edytować,
usuwać oraz eksportować/importować jako JSON (przenoszenie między komputerami).

## Własne kąty reklamowe

Ustawienia → **🎯 Własne kąty reklamowe**. Kąt to sposób wejścia w temat (np. „koszt alternatywy”, „obiekcja wprost”,
„sezonowość u mnie”). Dla każdego kąta ustawiasz:

- **bank hooków** – 12 dostępnych stylów (problem, POV, dowód, myth busting, lista, demo, wyzwanie, kulisy, cena, historia, obiekcja, sezon),
- **styl CTA** – soft sell, hard sell lub lead (albo „auto” = zgodnie ze strategią),
- **opis kąta** i **hipotezę testu** – trafiają do promptu API i do sekcji A/B.

Własne kąty startują jako **pierwsze warianty** w pakiecie (przed kątami wbudowanymi), więc Twoje pomysły testują się
najpierw. Kąty można edytować, duplikować, usuwać oraz eksportować/importować jako JSON.
Jawny wybór „soft/hard sell” w briefie ma pierwszeństwo nad stylem CTA kąta.

## Tracker wyników testu A/B

W zakładce **Wyniki** znajduje się panel **📊 Wyniki testu**: wpisujesz dane z Menedżera reklam
(wyświetlenia, hook rate 3 s %, CTR %, CVR %, budżet) dla każdego wariantu. Aplikacja:

- liczy kliknięcia, konwersje i CPA (na żywo, w trakcie wpisywania),
- wyłania zwycięzcę według wybranej metryki (hook rate / CTR / CVR / CPA – dla CPA niżej = lepiej),
- **pomija warianty poniżej progu 2 000 wyświetleń** przy wyborze zwycięzcy i ostrzega, gdy cała próba jest za mała,
- pokazuje rekomendację kolejnego kroku (skalowanie budżetu, przeniesienie hooka, wariant kontrolny),
- oznacza zwycięzcę chipem 🏆 na karcie wariantu i zapisuje wyniki w projekcie (historia, kopia zapasowa),
- eksportuje **raport CSV** wyników oraz dołącza wyniki do eksportów TXT / MD / JSON,
- **⬆ Import z Ads Manager (CSV):** przycisk wczytuje eksport (nagłówki PL lub EN, separator `;`/`, `/tab),
  rozpozna wariant po nazwie (np. „A — kąt główny”) albo po kolejności wierszy; brakujące CTR/CVR
  wylicza z pozostałych kolumn, `hookRate3s` zamienia z ułamka na %, a wiersze # / nieznane warianty pomija
  (liczba pominiętych w postradze), pliki z **BOM** też. **Wielodniowy eksport:** każdy wiersz =
  osobny pomiar w serii (trend), data z kolumny „data”/„date” trafia do pomiaru, a seria jest sortowana
  **chronologicznie** (daty ISO `yyyy-mm-dd` i PL `dd.mm.yyyy` — eksporty często grupują wiersze po reklamie,
  nie po dacie), a całość importu jest **jednym krokiem undo** (Ctrl+Z) i od razu przelicza zwycięzcę;
  **⏰** gdy ostatni pomiar jest starszy niż 24 h, podsumowanie przypomina o nowym (cykl 24–72 h);
  **⬇ Szablon CSV** pobiera gotowy wzór do wypełnienia,
- **cel KPI:** pole „cel” obok metryki (np. CTR 2%) — podsumowanie pokazuje, który wariant osiągnął cel
  (✅) / jest poniżej (⚠), a raport CSV zyskuje kolumnę „Cel”; cel trafia też do eksportów TXT i MD.

## Porównanie A/B (side-by-side)

Przy każdym wariancie jest przycisk **⚖ Do porównania** (maks. 2 warianty). Panel nad kartami pokazuje:
oceny 0–100 obok siebie, paski pięciu obszarów oceny (hook, scenariusz, shot list, CTA, opis) z
podświetleniem obszaru wygranego, hooki A i CTA do przeczytania obok siebie — każdy z nich ma przycisk
**⧉** kopiowania całej sekcji. Przy jednym wybranym wariancie panel podpowiada, by dokliknąć drugi.
„✕ Wyczyść porównanie” zamyka widok. Selekcja należy do otwartego projektu — zmiana projektu ją czyści.

## Macierz testów hook×CTA

Przy wariancie jest przycisk **🧪 Hook×CTA** (testy bez nowych generacji — wszystko z obecnego pakietu).
Macierz bierze hooki A/B/C z sekcji hook i trzy CTA z sekcji CTA (Główne / Test B / Komentarz), a każdą z 9
kombinacji **ocenia na klonie wariantu** istniejącym skalerem 0–100 (delta do obecnej wersji). Tabela pokazuje
wyniki w komórkach (▲/▼ vs baza), najlepsza jest podświetlona; „Użyj” per komórka albo „⭐ Zastosuj
najlepszą” podmienia HOOK A i podnosi wybrane CTA do slotu Głównego — zmiana jest cofalna (Ctrl+Z).
## Ocena kreacji (0–100)

Każdy wariant dostaje automatyczną ocenę z pięciu obszarów — bez API, w całości offline:

| Obszar | Waga | Co sprawdza |
| --- | --- | --- |
| Hook 0–3 s | 30 pkt | długość względem czasu spotu, konkret liczbowy, „zatrzymywacz” przewijania, brak hype’u |
| Scenariusz | 25 pkt | kompletność beatów, budżet słów dla 7–45 s, beat z CTA, obecność liczb/dowodów |
| CTA | 20 pkt | czasownik akcji, jedno główne wezwanie, wskazanie miejsca kliknięcia |
| Zgodność | 15 pkt | frazy ryzykowne dla polityk TikToka, obecność disclaimerów |
| Opis i hashtagi | 10 pkt | długość opisu przed „więcej”, 8–12 hashtagów, tag marki |

Ocena pokazuje się jako chip i pasek na karcie wariantu, a lista **konkretnych wskazówek** (do 5 na karcie,
pełna lista w eksporcie) mówi, co poprawić. Podsumowanie pakietu zawiera średnią ocenę i najsłabszy wariant,
a kolumna **Ocena** trafia do tabeli partii i do eksportu CSV / TXT / MD / JSON.

## Cofanie operacji (undo)

Przycisk **↶ Cofnij** w nagłówku Wyników (albo `Ctrl + Z`) przywraca stan sprzed ostatniej operacji
destrukcyjnej: regeneracji sekcji lub całego wariantu, czyszczenia wyników testu, importu i wczytania projektu
z historii lub partii. Stos pamięta 12 ostatnich operacji, przycisk pokazuje, co zostanie cofnięte,
a fokus i wiadomość w dzienniku potwierdzają wykonanie.

## Historia projektów: szukanie i filtr

Nad listą historii są pole **Szukaj** (nazwa, produkt, branża, strategia) i lista **Wszystkie strategie**.
Licznik pokazuje, ile pozycji spełnia kryteria („Pokazano 2 z 7”), a gdy nic nie pasuje — przycisk
**Wyczyść filtr**. Filtry działają natychmiast, bez przeładowania listy.

## Pomiary w czasie (trend wyników)

Każdy wariant w trackerze może mieć **wiele pomiarów** — wpisywane dane są „driftem”, a **„＋ pomiar”** (albo „🏆 Wyłoń
zwycięzcę”) zapisuje je jako punkt w czasie. Dzięki temu:

- kolumna **Trend** pokazuje Δ ostatniego pomiaru względem poprzedniego (▲/▼) i mini-wykres (SVG),
- zwycięzca jest liczony **z ostatniego pomiaru**, a podsumowanie mówi, czy wynik **się utrzymuje**
(„ten sam zwycięzca co na poprzednim pomiarze”) czy zmienił,
- raport CSV przechodzi w **format długi** (wiersz = pomiar, z datą i numerem),
- stare dane (jeden pomiar na wariant) są migrowane automatycznie przy każdym wczytaniu projektu.

## Brief dla montażysty

Przycisk **🎬 Brief montażysty** przy wariancie (oraz „(pakiet)” w nagłówku Wyników) pobiera czysto produkcyjny
dokument TXT: specyfikację (9:16, 1080×1920, czas, styl i dźwięk), zasady techniczne (pierwszy frame bez czerni,
bezpieczne strefy interfejsu TikTok, cięcia, budżet słów), hook z ramą czasową, scenariusz beat po beacie,
shot list, overlay/napisy, CTA i listę „NIE ROBIMY”. Bez strategii i hipotez — dokument gotowy do wysłania ekipie.

## Auto-scoring partii

Po wygenerowaniu partii w tabeli jest kolumna **Ocena** (0–100, heurystyki v2.3). Ustawiasz **próg** (domyślnie 70)
i klikasz **⚡ Regeneruj najsłabsze** — partia ponownie losuje (best-of-3, nowe ziarno) kampanie poniżej progu
(maks. 10 w rundzie) i zawsze zostawia kandydata z najwyższą oceną, więc średnia ocen nigdy nie spada.
Słabe wiersze są podświetlane, a toast podaje średnią przed/po.

## Biblioteka hooków

Z dowolnego wygenerowanego wariantu: **📚 Hook do biblioteki** — hook A ląduje w Ustawieniach → **📚 Biblioteka
hooków** razem z kontekstem (branża, czas, strategia, ocena pakietu, kampania). W bibliotece: szukaj, **⧉ kopiuj**,
**▶ Użyj w A** (podmienia HOOK A otwartego pakietu, z `Ctrl+Z`) i usuń. Biblioteka jest częścią kopii zapasowej
workspace i panelu pamięci lokalnej.

## Storyboard 9:16

Przycisk **🎬 Storyboard** przy wariancie otwiera odtwarzacz: ramka 9:16 z overlayem, opisem kadru z shot listy
i listą beatów. Sterowanie: odtwarzanie, prędkość (×1 / ×0.5 / ×0.25 / ×2), klik na pasku postępu i przeskoki po beatach,
**⬇ PNG** — zapis bieżącej klatki jako obraz 1080×1920 (format TikTok): gradient tła, chip beatu, tekst
overlayu (zawijany), lower third z opisem kadru, pasek czasu i — jeśli włączone — obrysy stref UI;
**🖨 PDF** — okno drukowania z **stroną na każdy beat** (rama 9:16 + opis ujęcia) do zapisu jako PDF;
**⛶ Strefy** — nakładka bezpieczeństwa: pas górny (~8% klatki, tu siedzi powrót/profil/live) i pas dolny
(~20%, opis, dźwięk, akcje) pokazują, gdzie interfejs TikTok zasłania kadr — dzięki temu overlayy i teksty
nie wylądują pod UI platformy. Pozwala sprawdzić rytm reklamy i to, czy teksty nie zasłaniają interfejsu TikToka.

## Wyniki i eksport

Każda sekcja ma przyciski **⧉ Kopiuj** oraz **↻ Regeneruj tylko to** (pojedyncza sekcja, bez ruszania reszty pakietu).
Cały pakiet eksportujesz do **TXT**, **MD**, **JSON**, **CSV** (arkusz dla hurtowej produkcji) albo jako
**pełny pakiet kampanii** (JSON do reimportu + MD do pracy). Przycisk **🖨 Drukuj / PDF** daje wersję do druku bez interfejsu.

Historia projektów: automatyczny zapis po każdej generacji, otwieranie, edycja briefu, duplikacja, usuwanie,
import/eksport JSON. Import JSON jest **walidowany**: plik bez listy wariantów, z wariantami bez sekcji albo
uszkodzonym JSON-em jest odrzucany z czytelnym powodem, a historia i widok wyników zostają nietknięte
(uzupełnialne braki, np. brakujące KPI, są naprawiane i zgłaszane w komunikacie). Panel **💾 Pamięć lokalna** pokazuje zużycie miejsca (brief, historia, presety, ustawienia),
pozwala przyciąć historię do 10 najnowszych projektów i automatycznie chroni przed przepełnieniem (limitu ~5 MB).

**Kopia zapasowa workspace** (ten sam panel): „⬇ Kopia zapasowa” zapisuje brief, historię i własne presety do jednego
pliku JSON (klucz API celowo pomijany), a „⬆ Wczytaj kopię” przywraca dane na innym komputerze — klucz API zostaje
przy tym lokalny i nie jest nadpisywany z pliku.

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
| `Ctrl + Z` | Cofnij ostatnią operację (poza polami tekstowymi) |
| `Esc` | Zamknij okno modalne |

## Testy

Aplikacja nie wymaga żadnych zależności w czasie działania. Testy (Node + jsdom) są w katalogu `tests/`:

```bash
bash tests/run-all.sh        # 460 asercji: jednostkowe (211) + E2E (222) + API (27)
```

Szczegóły w `tests/README.md`.

## Struktura pliku

`index.html` zawiera wszystko: styl (ciemny motyw PRO), sekcje interfejsu oraz skrypt podzielony na bloki:
konfiguracja (języki, strategie, kąty A/B), baza branż, magazyn `localStorage`, silnik lokalny, prompty + klient API,
parser odpowiedzi, render wyników, eksport, historia, filtr zgodności, UI/init.

## Grafika i animacje (system ruchu)

Interfejs ma spójny system animacji (tokeny `--t-fast/med/slow` + krzywe `ease-out/ease-spring`):

- **kaskadowe wejście** kart wariantów i sekcji przy generacji, imporcie i cofaniu (60 ms na kartę + kaskada sekcji) —
  małe aktualizacje (tracker, edycje) renderują się **bez** animacji, żeby UI nie „mżyło”,
- **modale** wchodzą z scale+fade (spring), backdrop z blur; **toasty** wchodzą z poślizgiem i **wychodzą** animacją
  (limit 6 naraz),
- **puls zwycięzcy** testu (chip 🏆), **rosnące paski oceny**, płynny pasek postępu,
- **micro-interactions**: przyciski unoszą się na hover i „dociskają” na active (glow przy primary/danger),
  karty wariantów i sekcje reagują obramowaniem i cieniem, wiersze tabel i list podświetlają się,
- **tło** z trzema poświatami (pink/cyan/violet) i glassmorphism pasków; pasek górny z subtelną linią glow,
- `@media (prefers-reduced-motion: reduce)` wyłącza wszystkie animacje i przejścia — pełna kontrola użytkownika.

## Dostępność i telefon

Zakładki mają role ARIA (`tablist` / `tab` / `tabpanel`), okna modalne działają jak `dialog` (fokus wchodzi do środka,
`Tab` nie ucieka na tło, `Esc` zamyka, fokus wraca na przycisk), paski postępu są `progressbar`-ami,
a dziennik i powiadomienia są czytane przez czytniki ekranu (`aria-live`). Interfejs ma widoczny pierścień fokusu,
a poniżej 760 px (i 420 px) układ przechodzi w jedną kolumnę bez poziomego przewijania.

## Uwagi

- Aplikacja jest narzędziem wewnętrznym dla twórcy reklam — nie zawiera mechanizmów sprzedaży ani licencji.
- Wszystkie dane (brief, klucz, historia) są przechowywane lokalnie w przeglądarce; nic nie jest wysyłane na żaden serwer poza wybranym API.
- „Wyczyść wszystkie dane” w Ustawieniach usuwa brief, historię, ustawienia i klucz.
