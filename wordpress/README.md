# Migracja KRD-IG do WordPressa

Ten katalog zawiera przygotowanie danych i instrukcję migracji obecnej strony Next.js/Vinext do WordPressa.

## Instalacja przygotowanej paczki motywu

Użyj pliku `wordpress/krd-ig-theme-v6.zip`. Nie używaj `moja_strona_sources.zip`, ponieważ jest to archiwum kodu Next.js, a nie motyw WordPressa.

W panelu WordPressa wybierz:

`Wygląd -> Motywy -> Dodaj nowy -> Wyślij motyw -> Wybierz plik`

Po instalacji kliknij `Włącz`. Następnie wejdź w `Ustawienia -> Bezpośrednie odnośniki` i kliknij `Zapisz zmiany`, aby odświeżyć reguły adresów.

Paczka jest działającym szkieletem motywu. Import treści z pliku JSON wykonuje się osobno, zgodnie z dalszą częścią tej instrukcji.

## Import treści jednym przyciskiem

1. Zainstaluj plik `wordpress/krd-ig-importer-v3.zip` przez `Wtyczki -> Dodaj nową -> Wyślij wtyczkę`.
2. Włącz wtyczkę `KRD-IG Importer`.
3. Wejdź w `Narzędzia -> Import KRD-IG`.
4. Wybierz `wordpress/export/content-export.json` i kliknij `Importuj dane`.
5. Po zakończeniu wejdź w `Ustawienia -> Bezpośrednie odnośniki` i kliknij `Zapisz zmiany`.

Importer tworzy lub aktualizuje 46 materiałów bazy wiedzy, 260 aktualności i 118 zapytań ofertowych. Linki są dodawane do treści, a obrazy są pobierane z adresu źródłowego do Biblioteki mediów i ustawiane jako obrazki wyróżniające. Jeżeli wcześniej zainstalowano starszą wersję importera, zainstaluj nową wersję i uruchom import ponownie. Nowa wersja nie dopisuje obrazów drugi raz przy ponownym imporcie.

Media projektu są w osobnej paczce `wordpress/krd-ig-media.zip`. Można ją rozpakować na komputerze i wgrać pliki do Biblioteki mediów przez wtyczkę Media Sync albo skorzystać z automatycznego pobierania obrazów podczas importu.

Po imporcie ustaw stronę główną w `Ustawienia -> Czytanie`. Stare strony zawierające shortcody Divi nie są używane przez nowe widoki CPT; można je przenieść do kosza dopiero po sprawdzeniu nowych adresów.

## Co jest gotowe

- `export-content.mjs` tworzy neutralny eksport JSON z `app/data/content.json`.
- eksport zachowuje slugi, tytuły, daty, kategorie, treść, linki i ścieżki obrazów,
- rekordy z kategorią `Zapytania ofertowe` są oznaczone jako `zapytanie_ofertowe`,
- pozostałe wpisy są oznaczone jako `aktualnosc`,
- strony wiedzy są oznaczone jako `baza_wiedzy`,
- `url-map.csv` zawiera adresy, które należy zachować lub przekierować.

## Wygenerowanie eksportu

W katalogu głównym projektu uruchom:

```powershell
node wordpress/export-content.mjs
```

Powstanie plik `wordpress/export/content-export.json`. Nie zawiera on sekretów ani danych dostępowych.

## Kolejność prac w WordPressie

1. Utwórz stronę testową i zainstaluj WordPressa.
2. Utwórz własny motyw `krd-ig` na podstawie obecnego HTML/CSS.
3. Zarejestruj typy treści: `baza_wiedzy`, `aktualnosc` i `zapytanie_ofertowe`.
4. Zaimportuj media z `public/media/` do biblioteki WordPressa.
5. Zaimportuj `content-export.json`, zachowując slugi.
6. Ustaw stronę główną jako stronę statyczną i odtwórz menu.
7. Podłącz formularz członkowski z walidacją serwerową i ochroną antyspamową.
8. Dodaj widget czatu jako skrypt front-endowy wskazujący istniejącego Cloudflare Workera.
9. Skonfiguruj SEO, sitemapę i przekierowania 301 według `url-map.csv`.
10. Przetestuj staging, dopiero potem przełącz DNS domeny.

## Ważne decyzje techniczne

- Nie przenoś klucza `OPENAI_API_KEY` do WordPressa ani do JavaScriptu przeglądarki.
- Formularz członkowski powinien wysyłać dane przez serwer WordPressa, a nie wyłącznie przez `mailto:`.
- Nie usuwaj obecnej strony przed zakończeniem testów linków, dokumentów, formularza i czatu.
- Eksport bazuje na danych źródłowych z JSON. Dodatkowe wpisy dodane wyłącznie w `app/lib/content.ts` należy dopisać do CMS osobno albo rozszerzyć importer o te rekordy.