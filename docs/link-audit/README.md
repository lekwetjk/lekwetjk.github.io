# Warunkowa akceptacja lokalnych linkow

Stan: 2026-09-22. Pakiet `links` NIE zostal wlaczony na stale.
Warunek uzytkownika: wszystkie strony, wpisy i pliki KRD-IG maja miec
rzeczywisty lokalny odpowiednik. Zewnetrzne instytucje pozostaja zewnetrzne.
Nie nalezy odtwarzac wycofanych stron prawnych ani kierowac do nich linkow.

## Wynik audytu

- Sprawdzono HTML 439 adresow z katalogu eksportowanych stron i wpisow,
  wygenerowanych aktualnosci oraz serwowanej mapy witryny. Wszystkie zwrocily 200.
  To zakres raportu, nie gwarancja audytu wszystkich mozliwych widokow aplikacji.
- Serwowana mapa witryny zawiera tylko 12 adresow glownych, dlatego audyt
  rozszerzono o trasy z danych tresci. Nie zmieniano mapy w ramach tej pracy.
- Wyrenderowane linki KRD-IG: 27 znanych stron/wpisow, 1 alias,
  34 strony zalacznikow, 192 bezposrednie pliki i 3 dodatkowe adresy z kodu.
- Pobrano 214 roznych plikow: 221566389 bajtow (okolo 211 MiB).
  Sa w `public/media/imported-documents/`. Manifest
  `app/data/local-link-assets.json` zawiera lokalne adresy, rozmiary i SHA-256.
  Pobrane pliki sa lokalnym buforem roboczym wykluczonym przez .gitignore,
  nie czescia wdrozenia. Manifest i raport pozostaja w repozytorium.
  Po zatwierdzeniu kompletnej migracji trzeba dolaczyc jej pliki do wdrozenia.
- 15 uzywanych adresow dokumentow zwraca HTTP 404 na starym serwerze.
  Nie znaleziono potwierdzonych kopii w repozytorium ani przez wyszukiwanie
  biblioteki mediow WordPressa. Podobna nazwa nie potwierdza tozsamosci dokumentu.
- Cztery nierozpoznane strony starego serwisu w eksporcie pochodza z uszkodzonej
  nawigacji wpisu `aktualna-sytuacja-sektora-drobiarskiego`; nie sa renderowane.
  Linki do wycofanych stron prawnych rowniez nie wystepowaly w zbadanym HTML.

## Blokada

Potrzebne sa oryginalne zalaczniki z kopii starego serwera, archiwum Izby
lub potwierdzone nowe adresy DOKLADNIE tych samych dokumentow:

1. Niwelowanie barier 2018, spotkania: zapytanie oraz zalaczniki 1-4 (2 pliki).
2. Niwelowanie barier 2018, rynek krajowy: zapytanie i aktualizacja zalacznika 1
   z 12.07.2018 (2 pliki).
3. SIAL Paryz 2018: zaproszenie 04.07, aktualizacje 09.07 i 10.07,
   zalaczniki 1-4 oraz plan stoiska JPG (5 plikow).
4. Zgromadzenia a.v.e.c./ELPHA/IPC 2018: zaproszenie, aktualizacja 30.05
   i zalaczniki 1-3 (3 pliki).
5. IFE Londyn 2019: zaproszenie 18.01, zalaczniki 1-4 oraz uniewaznienie
   KRD-IG-13/2019 (3 pliki).

Dokladne adresy, nazwy i powiazane posty znajduja sie w `downloads.json`
w rekordach z polem `error`. Nie usuwano tych linkow ani nie zastapiono ich
strona glowna, komunikatem o braku pliku czy innym postepowaniem.
Znalezione w WordPressie zaproszenie IFE z 01.02.2019 nie jest brakujacym
zaproszeniem z 18.01.2019 i nie zostalo uzyte jako zamiennik.

## Dalsze kroki

Po odzyskaniu brakow: powiazac potwierdzone oryginaly, podlaczyc manifest
w renderowaniu (takze linki wpisane bezposrednio w kodzie), dopasowac aliasy,
sprawdzic lokalne cele i kotwice, ponowic audyt, a dopiero potem zaakceptowac
`links`. Aktualna mapa plikow jest przygotowaniem migracji, NIE wdrozonym
przekierowaniem. Pobranie plikow nie zmienilo widocznych linkow strony.

## Powtarzanie audytu

Skrypt audytu HTML korzysta z `linkedom` zainstalowanego tymczasowo, bez
zmiany zaleznosci strony:

```powershell
npm install --prefix "$env:TEMP\krd-link-audit-tools" --no-audit --no-fund linkedom
node scripts/audit-local-links.mjs
node scripts/audit-rendered-links.mjs
node scripts/import-local-link-assets.mjs
```

Import zwraca kod 1, jesli choc jeden plik nie ma potwierdzonej kopii.
Limit pojedynczego pliku to 25 MiB; odrzucane sa odpowiedzi HTML zamiast pliku
i nieprawidlowe naglowki PDF. Zweryfikowane kopie nie sa pobierane ponownie.
Oryginalne dane eksportu i zewnetrzne pliki nie sa modyfikowane.