# Decyzje po przegladzie lokalnym

Panel: http://127.0.0.1:3000/podglad-zmian

## Utrwalone decyzje z 2026-09-22

Zaakceptowane i aktywne bez cookie, rowniez poza development:
`compact-header`, `compact-cards`, `summaries`, `typography`, `text-cleanup`,
`images`, `contacts`, `counts`, `seo`, `library`, `wstawienia`.

Wstawienia: lata w kolumnach, miesiace i podsumowania w wierszach.
Wiersze kwartalow maja jasnozielone tlo, dynamiki kwartalne jasnoniebieskie,
a dynamiki polroczy i roku jasnozolte, takze w przyklejonej pierwszej kolumnie.
Dane, obliczenia i zapis bez zmian.
Wiersze rocznych danych i dynamiki roku maja pogrubiona czerwona czcionke.

Baza wiedzy zaakceptowana bez stron `akty-prawne` oraz
`nadzwyczajne-srodki-zwalczania-chorob`. Obie wycofano z aktywnego katalogu,
generowanej mapy witryny i podstron (404). Zrodlowy eksport pozostaje archiwum.
Puste sekcje nie sa wyswietlane; nie dodano nowych kafelkow prawnych.

Odrzucone: `dropdown`, `directory`, `health`, `verification`, `campaigns`.
Usunieto nowe komponenty menu i katalogu firm, trase zdrowotna DEMO, ich style
oraz ostrzezenia pakietu verification. Dotychczasowa strona czlonkow i jej mapa
pozostaja. Ostrzezenie o niekompletnym punkcie QAFP nalezy do zaakceptowanej
korekty tresci, a nie do odrzuconego pakietu verification.

Daty kampanii pozostaja widoczne. Lista rozpoznaje polskie skroty miesiecy
(w tym pazdziernik z polskim znakiem). Brakujaca data jest pobierana z daty
publikacji powiazanego postu, nigdy z domyslnego terminu wydarzenia.
Uzupelniono 6 brakujacych oznaczen na 26 pozycji: cztery byly pomijane przez
parser, a dwie nie wystepowaly w eksporcie listy. Metadane postow potwierdzaja:
podsumowanie wrzesnia 2024 kampanii indyka - 31.10.2024;
piknik z okazji Dnia Dziecka w KPRM - 18.07.2022.
Data publikacji ANUGA 2019 pozostaje 17.10.2020 zgodnie z eksportem;
rok wydarzenia nie jest traktowany jako rok publikacji.

Nierozstrzygniete pozostaje wdrozenie `links`.
`links` otrzymal warunkowa akceptacje: wszystkie strony, wpisy i pliki KRD-IG
musza miec lokalne odpowiedniki. Warunek nie jest jeszcze spelniony:
214 plikow pobrano, lecz 15 oryginalnych zalacznikow zwraca 404.
Nie wlaczono pakietu na stale. Raport i zakres: `docs/link-audit/README.md`.
Pakiet jest domyslnie wylaczony; mozna go testowac w panelu development.

Panel pokazuje tylko jeden pozostaly przelacznik. Eksport zachowuje wszystkie
17 pozycji z utrwalonymi decyzjami keep/drop. Nowe decyzje sa zapisywane
w localStorage, a podglad w cookie `krd_pending_proposals_v2`. Stare cookie
nie wlacza pozostalych propozycji. `Tylko wdrozone zmiany` wylacza jedynie
podglad linkow, nie zaakceptowane funkcje. Karty otwarte wczesniej nalezy odswiezyc.

## Bezpieczenstwo podgladu

Cookie dotyczy tylko podgladu linkow i jest odczytywane tylko
przy NODE_ENV=development. Panel oraz lokalny edytor SEO zwracaja 404 poza
development. Odrzucone warianty nie moga zostac wlaczone przez cookie.
Nie zmieniono dokumentow, rekordow firm ani bazy produkcyjnej.
Akceptacja w panelu nie publikuje zmian ani nie tworzy commita.

## Zakres i ograniczenia

- Nawigacja: kompaktowe naglowki i kafelki; bez rozwijanego podmenu.
- Tresc: propozycje opisow stron, formatowanie, usuniecie powtorzen segmentacji,
  odmiana liczby materialow, listy QAFP/cookies, akapity przepiorek, obraz ebooka
  i jeden widok kontaktu. Adres PDF ebooka jest poprawny niezaleznie od pakietu links.
- SEO: metadane wpisow i stron dzialaja na stale. Canonical korzysta z metadataBase
  ustawionego przez NEXT_PUBLIC_SITE_URL (domyslnie https://lekwetjk.github.io).
  Produkcyjne wpisy nie maja developerskiego noindex. Formularze dodawania
  i edycji postow oraz zapytan ofertowych w /admin/publikacje maja opcjonalne
  pola tytulu SEO (100 znakow) i opisu SEO (240 znakow). Sa zapisywane przy
  publikacji w kolumnach seo_title i seo_description tabeli managed_posts;
  brakujace kolumny sa dodawane automatycznie, bez zmiany starszych tresci.
  Puste pola korzystaja z tytulu i krotkiego opisu wpisu. Zapisane SEO trafia
  tez do Open Graph i Twitter. Lokalny edytor cookie pozostaje narzedziem
  podgladu development, bez odnosnika w panelu admina; zapisane SEO ma pierwszenstwo.

Nie zakonczono merytorycznej aktualizacji krajow trzecich,
uzupelnienia telefonow, adresu
administratora, skladow komisji, weryfikacji uprawnien firm i zewnetrznych witryn kampanii.
QAFP ma niekompletny pierwszy punkt w zrodle; podglad oznacza ten problem.
Okładka i adres PDF ebooka pochodza z istniejacego eksportu; dostepnosc serwera
zrodlowego wymaga osobnego potwierdzenia. Rozdzielenie opisow wspolpracy
miedzynarodowej i strony O nas wymaga akceptacji zakresu redakcyjnego.

## Walidacja

```powershell
node --experimental-strip-types --test tests/local-proposals.test.ts
./node_modules/.bin/tsc.cmd --noEmit
```

Testy obejmuja stale decyzje keep/drop, niezaleznosc podgladu linkow,
ignorowanie nieznanych i odrzuconych flag, odmiane liczby materialow,
linki, porzadkowanie tresci, lokalne wersje SEO i usuniecie odrzuconych komponentow.
Wersje angielskie nie maja nowych polskich opisow; angielska redakcja wymaga
osobnego przegladu. Arkusz XLSX audytu jest historycznym opisem propozycji
sprzed tej decyzji i nie zostal nadpisany.