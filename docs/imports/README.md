# Import zapytań ofertowych: strony 8–10

## Zakres

- Źródło: `https://old.krd-ig.com.pl/category/zapytania-ofertowe/page/8/` oraz strony 9 i 10.
- 27 publikacji (10 + 10 + 7), od 8 listopada 2016 r. do 13 marca 2019 r.
- Wszystkie 27 publikacji uzupełnia istniejące rekordy. Zachowano ich dotychczasowe adresy na nowej stronie; nie powstają duplikaty.
- Daty i godziny pochodzą z pola `date` API starego WordPressa, nie z dat przeniesienia treści do nowszej instalacji. Importer porównuje zakres API z odnośnikami na wskazanych stronach archiwum.
- Poprawiono m.in. wybór oferenta SIAL z 27 na 9 marca 2018 r. oraz wybór wykonawcy wyjazdu a.v.e.c./ELPHA/IPC z 14 marca 2019 r. na 6 czerwca 2018 r. Datę odrębnego zapytania z 2020 r. o takim samym tytule pozostawiono bez zmian.

## Kategorie

| Kategoria | Publikacje |
| --- | ---: |
| Wybór wykonawcy | 13 |
| Zapytania ofertowe | 8 |
| Zaproszenie do składania ofert | 4 |
| Wyniki postępowania | 1 |
| Informacja o unieważnieniu | 1 |

## Załączniki

Zidentyfikowano 45 odwołań do dokumentów i załączników:

- 8 dostępnych plików PDF zapisano lokalnie w `public/media/tenders/legacy/`. Ich rozmiary, sygnatury PDF i sumy SHA-256 zostały sprawdzone.
- 37 odnośników nie zwraca plików na starej ani obecnej domenie. Dotyczy to głównie dawnego katalogu `/upload/file/`. Nie zapisano stron błędów jako dokumentów i nie zastąpiono ich innymi materiałami.
- Przy brakujących pozycjach zachowano oryginalny opis bez martwego odnośnika i bez dopisku o niedostępności pliku. Oryginalne adresy i wyniki prób pobrania pozostają wyłącznie w raporcie.
- Zapisy o możliwości otrzymania wersji edytowalnej z biura nie są traktowane jak istniejący załącznik.

Szczegóły każdej publikacji, oryginalne adresy, wcześniejsze daty i status każdego załącznika: [legacy-tenders-pages-8-10.json](legacy-tenders-pages-8-10.json).

## Podgląd I Weryfikacja

Podgląd: <http://localhost:3000/zapytania-ofertowe>. W filtrze roku wybierz 2016, 2017, 2018 lub 2019. Kategorie i daty działają w istniejącym archiwum.

Treści znajdują się w `content/zapytania-ofertowe/`. Generowane wpisy zastępują rekordy bazowe o tych samych slugach, a opcjonalne pole `time` zachowuje kolejność publikacji z tego samego dnia.

W importowanych publikacjach akapity i elementy list mają spójną czcionkę 16 px, interlinię 1,7 i justowanie z ostatnim wierszem wyrównanym do lewej. Ujednolicono odstępy i usunięto zagnieżdżone pogrubienia. Krótkie akapity nie są automatycznie powiększane do nagłówków.

```sh
node scripts/import-legacy-tenders.mjs
node scripts/import-legacy-tenders.mjs --write
node scripts/generate-content-posts.mjs
node --test tests/legacy-tenders.test.mjs
```

Pierwsze polecenie tylko analizuje źródło. `--write` zapisuje treści, dostępne pliki i raport wyłącznie w lokalnym katalogu projektu. Importer nie ma ścieżki publikowania do produkcji.

Testy sprawdzają komplet 27 publikacji, kategorie, kolejność i daty, zachowanie odrębnego postępowania z 2020 r., integralność tekstu po renderowaniu Markdown oraz plików PDF. Dodatkowo sprawdzono odpowiedź HTTP i pełny tekst wszystkich 27 artykułów w działającym podglądzie lokalnym.

Przed wdrożeniem produkcyjnym trzeba zaakceptować braki albo dostarczyć brakujące 37 plików. Ta zmiana jest przygotowana wyłącznie lokalnie, bez commitu i wysłania do GitHub.