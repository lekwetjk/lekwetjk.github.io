# Zabezpieczenia rozbudowy CMS

To instrukcja operacyjna, nie zgoda na wdrozenie. Wszystkie polecenia nalezy
wykonywac z katalogu repozytorium. Kopie i odtworzone dane musza pozostac poza
repozytorium, w prywatnym katalogu. Nie wolno ich publikowac jako artefaktow CI.

## Zakres kopii i ograniczenia

`scripts\content-safety.mjs` zapisuje:

- SQL calej aplikacyjnej bazy D1, schemat, liczby rekordow i SHA-256 zawartosci tabel;
- wszystkie obiekty R2, takze niepodlaczone do publikacji, ich bajty, SHA-256,
  klucze oraz metadane HTTP i wlasne;
- wersjonowane zrodla i publiczne pliki dokladnie wskazanego wdrozonego commita;
- manifest z wersja kodu i sumami kontrolnymi.

Kopia nie obejmuje niewersjonowanych zmian lokalnych, zmiennych tajnych, ustawien
konta Cloudflare, konfiguracji DNS ani zawartosci zewnetrznych serwisow, do ktorych
strona jedynie odsyla. Osobno zabezpiecz ustawienia infrastruktury i instrukcje
odtworzenia sekretow w zatwierdzonym menedzerze sekretow. Nie zapisuj sekretow
w repozytorium ani konfiguracji pomocniczej.

Skrypt **nie szyfruje kopii**. Prywatne miejsce docelowe nie jest rownoznaczne
z szyfrowaniem. Kopia zawiera takze prywatne dane panelu; ogranicz dostep systemowy
i zastosuj zatwierdzone szyfrowanie dysku lub nosnika, jesli jest wymagane.
Nie usuwaj ostatniej sprawdzonej kopii ani kopii sprzed aktualnie trwajacego etapu.
Retencja jest decyzja operatora; narzedzie nie usuwa automatycznie zadnych kopii.

## Kopia i rzeczywiste probne odtworzenie

Przygotuj poza repozytorium jawna konfiguracje Wranglera z dokladnie jedna baza
i jednym magazynem:

```json
{
  "name": "content-backup",
  "compatibility_date": "2026-07-31",
  "d1_databases": [
    { "binding": "DB", "database_name": "DATABASE_NAME", "database_id": "DATABASE_ID", "remote": true }
  ],
  "r2_buckets": [
    { "binding": "FILES", "bucket_name": "BUCKET_NAME", "remote": true }
  ]
}
```

Wymagany jest dostep OAuth Wranglera. Kod kopii wykonuje na produkcyjnych danych
tylko SELECT/export oraz list/get. `remote: true` wybiera rzeczywiste dane;
nie jest ograniczeniem uprawnien konta do odczytu.

```powershell
node scripts\content-safety.mjs backup --destination "D:\private-backups" --config "D:\private-config\backup.json" --ref DEPLOYED_COMMIT
node scripts\content-safety.mjs restore-test --backup "D:\private-backups\backup-ID" --target "D:\private-backups\restore-NEW-ID"
```

Pierwsze polecenie sprawdza stabilnosc R2 podczas kopiowania i D1 podczas eksportu.
Zmiana danych powoduje blad oraz pozostawienie `INCOMPLETE.json`.
Nie traktuj takiego katalogu jako gotowej kopii. Powtorz eksport w spokojnym oknie;
nie ignoruj roznic w tabelach audytu ani brakujacych plikow.

Drugie polecenie wymaga nowego katalogu, odtwarza lokalne D1 i R2 z losowymi
identyfikatorami, bez zdalnych bindingow, i sprawdza wszystkie pliki oraz tabele.
Duzy SQL jest importowany przez parametryzowane zapytania, a nie pojedynczy
ogromny INSERT. Nie uruchamiaj prywatnej odtworzonej strony na publicznym serwerze.

Dowodem jest dopiero `restore-verification.json` w kopii i `VERIFIED.json`
w odtworzeniu, ze statusem `RESTORE VERIFIED`. Brak tych plikow oznacza,
ze odtworzenie nie zostalo potwierdzone. Nie usuwaj pozostalosci nieudanego
odtworzenia przez polecenia z wildcardami; sprzataj tylko dokladnie rozpoznany
katalog danej proby.

Oryginalne identyfikatory wersji, ETag i daty utworzenia obiektow R2 pozostaja
w manifescie; lokalna platforma nadaje swoje identyfikatory i daty obiektom
odtwarzanym. Bajty, klucze i metadane sa sprawdzane. Daty publikacji w D1
i wersjonowanych tresciach nie sa zmieniane.

## Addytywne migracje i porownanie przed/po

Pracuj na osobnym worktree opartym na aktualnie wdrozonym commicie. Testy zapisow
wykonuj na fikcyjnych danych lub na lokalnej odtworzonej kopii, nigdy na produkcji.
Nowe struktury dodawaj bez kasowania starych tabel, kolumn, tresci i plikow.

Przed zastosowaniem SQL:

```powershell
node scripts\verify-content-migration.mjs "D:\private-backups\backup-ID" db\migrations\content-safety.sql
```

Narzedzie wymaga sprawdzonego odtworzenia tej kopii. Dopuszcza tylko
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` oraz
`ALTER TABLE ... ADD COLUMN`. Odrzuca UPDATE, DELETE, DROP, zamiany tabel,
triggery i inne operacje. Symuluje migracje na kopii w pamieci i porownuje
kazda istniejaca kolumne i rekord, istniejace indeksy/widoki/triggery, integralnosc
i klucze obce. Dodanie kolumn nie moze zmieniac dotychczasowych wartosci.
Sprawdza tez SHA-256 istniejacych plikow `public` i archiwalnych danych `app/data`.
Tylko w JSON z `app/data` i tekstowych SVG z `public` dopuszcza roznice CRLF/LF wynikajace z Git i generatora;
porownuje wtedy oryginal z uwierzytelnionego archiwum, zglasza te pliki osobno
i nadal odrzuca kazda zmiane tresci. Pozostale pliki publiczne, w tym PDF i obrazy rastrowe, musza
pozostac identyczne bajtowo.

Nie dodawaj istniejacym publikacjom domyslnego statusu `draft`. Kiedy powstanie
workflow szkicow, istniejace rekordy musza pozostac opublikowane; test migracji
powinien dodatkowo sprawdzic nowa kolumne statusu. Obecne zabezpieczenia nie dodaja
statusow ani masowo nie importuja archiwum. Symulator odrzuca nowe pola statusu,
publikacji, widocznosci i kosza, jezeli ukrylyby aktywne rekordy znanych tabel
publikacji. Niestandardowa nazwa pola lub tabeli wymaga rozszerzenia tej kontroli.

Inicjalizacja Wstawien nie kasuje juz istniejacych wierszy przy zmianie wersji
ziarna. Zachowuje dane i zglasza niezgodnosc w logach. Takiej niezgodnosci nie
naprawiaj ponownym seedowaniem; przygotuj osobno zweryfikowana migracje.

Po kazdym pozniejszym, osobno zatwierdzonym wdrozeniu wykonaj druga pelna kopie
i porownaj ja z kopia sprzed etapu:

```powershell
node scripts\verify-content-migration.mjs --compare "D:\private-backups\before-ID" "D:\private-backups\after-ID"
```

Porownanie SQL uwzglednia stare kolumny rowniez po dodaniu nowych. Kazdy stary
rekord, URL, data i wartosc pozostaja niezmienione; stare pliki zachowuja klucz,
rozmiar, SHA-256 i metadane. Dodatkowe tabele i pliki sa dopuszczalne.
Kontrola jest celowo rygorystyczna takze wobec zapisow administracyjnych i audytu:
przy roznicy zatrzymaj etap i wyjasnij ja, zamiast automatycznie zatwierdzac wynik.
Osobno sprawdz publiczne strony, logowanie i pobieranie rzeczywistych zalacznikow.
Samo porownanie kopii nie jest testem renderowania ani dzialania obcych stron.

## Flagi i wycofywanie etapow

Zmienne ustawia sie w konfiguracji srodowiska Workera; zmiana pliku lokalnego
nie zmienia produkcji. Wartosci tekstowe to dokladnie `true` lub `false`.

| Zmienna | Domyslnie | Dzialanie |
| --- | --- | --- |
| `CMS_READ_ONLY` | `false` | Blokuje zapisy `/admin`, `/api/admin` i `/api/wstawienia` odpowiedzia 503; zachowuje odczyty i logowanie. |
| `CMS_TRASH_ENABLED` | `false` | Udostepnia administratorowi API i zakladke kosza w panelu. |
| `CMS_HISTORY_ENABLED` | `false` | Zabezpiecza wersje przed edycja i usunieciem oraz udostepnia porownanie i przywracanie historii. |
| `CMS_MEDIA_ENABLED` | `false` | Udostepnia administratorowi biblioteke mediow, upload i wybor istniejacych plikow w publikacjach. |
| `CMS_DRAFTS_ENABLED`, `CMS_ARCHIVE_ENABLED` | `false` | Rezerwacja przelacznikow dla kolejnych etapow; te funkcje nie sa jeszcze wdrozone. |

Ochrona plikow i kierowanie usuniec do kosza dzialaja niezaleznie od flagi
`CMS_TRASH_ENABLED`. Wylaczenie interfejsu nie przywraca fizycznego kasowania.
Tryb odczytu nie blokuje logow systemowych, prywatnych edycji profilu czlonka
ani wszystkich innych zapisow w infrastrukturze; do calkowicie nieruchomej kopii
potrzebne jest uzgodnione spokojne okno.

Przy problemie z kolejnym etapem: zatrzymaj zapisy, zachowaj biezaca kopie,
wylacz tylko nowa funkcje i powroc do ostatniej **sprawdzonej wersji zawierajacej
te zabezpieczenia**. Nie cofaj schematu i nie przywracaj starego SQL na aktualna
baze. Taki import moglby zgubic zmiany wykonane od czasu kopii.

Starszy kod sprzed zabezpieczen nie zna flag ani kosza. Nie jest bezpiecznym
automatycznym celem rollbacku: moglby ponownie pokazac dokumenty z kosza albo
fizycznie kasowac pliki. Jego awaryjne uzycie wymaga osobnego odciecia zapisow
i oceny zgodnosci danych. Pierwsze wdrozenie zabezpieczen wymaga osobnej zgody.

## Historia i panel kosza - etap 2

Panel `/admin/historia-i-kosz` jest dostepny tylko administratorowi. Odnosnik
pojawia sie w profilu po wlaczeniu przynajmniej jednej z obu flag.
Wersje obejmuja edytowalne publikacje, dokumenty trzech sekcji, biuletyny
oraz cala tabele Wstawien. Nie importuja masowo archiwum i nie zmieniaja
publicznych adresow, dat utworzenia ani statusow publikacji.

Historia zaczyna sie po wlaczeniu flagi: zabezpiecza stan istniejacego elementu
przed proba zmiany lub usuniecia, nie odtwarza wersji sprzed jej uruchomienia.
Takze nieudana proba zapisu moze pozostawic kopie poprzedniego stanu.
Nowy element uzyskuje pierwsza wersje historyczna przy swojej pierwszej zmianie.
Blad zapisu kopii zatrzymuje edycje przed zmiana danych.
Przywracanie samo zabezpiecza biezaca wersje; element w koszu nalezy najpierw
przywrocic z kosza. Nieaktualny podglad wymaga ponownego otwarcia.
To kontrola nieaktualnego podgladu, nie blokada rozproszona wszystkich
rownoczesnych zapisow. Cala tabela Wstawien jest zapisywana atomowym D1.batch.

Przed wlaczeniem wykonaj kontrole migracji `content-history.sql` tym samym
narzedziem i na tej samej sprawdzonej kopii co `content-safety.sql`.
Obie migracje tylko dodaja tabele. Historia zapisuje rekordy w D1, a przy braku
D1 w prywatnym R2; lokalny zapis do plikow jest dozwolony tylko poza produkcja.
Archiwalne bajty dokumentow sa kopiowane pod unikatowe klucze
`content-history/assets/` albo zachowywane w snapshotach bez R2.
Wylaczenie flag nie usuwa historii ani plikow i nie przywraca hard-delete.
Namespace `content-history/` i `content-trash/` sa zawsze zablokowane w publicznym
API mediow. Starszy dokument mozna pobrac tylko przez autoryzowany panel historii.
Nie stosuj automatycznego czyszczenia tych prefiksow w R2.

Lokalny podglad etapu wymaga osobnego D1/R2, fikcyjnych kont, bindingow bez
`remote: true` i nasluchu tylko na `127.0.0.1`. Nie kopiuj sekretow produkcyjnych.
Akceptacja podgladu poprzedza wdrozenie i synchronizacje plikow tego etapu
z glownym folderem; nie nadpisuj innych zmian lokalnych.

Workflow produkcyjny stosuje obie idempotentne migracje przed wdrozeniem kodu
i wlacza `CMS_TRASH_ENABLED` oraz `CMS_HISTORY_ENABLED`. Przed jego uruchomieniem
wymagane sa aktualna sprawdzona kopia i symulacje migracji opisane powyzej.
Nie publikuje sie konfiguracji podgladu, fikcyjnych kont ani lokalnych danych
D1/R2. Testy regresji po wdrozeniu nie powinny modyfikowac rzeczywistych tresci.

## Biblioteka mediow - etap 3

Panel `/admin/media` i API `/api/admin/media` wymagaja administratora oraz
`CMS_MEDIA_ENABLED=true`. Nowa migracja `db/migrations/content-media.sql`
wylacznie dodaje tabele `media_assets`. Przed osobno zatwierdzonym wdrozeniem
sprawdz ja na aktualnej, rzeczywiscie odtworzonej kopii tym samym narzedziem
`verify-content-migration.mjs`. Zaakceptowany produkcyjny workflow stosuje te
migracje po migracjach historii i kosza oraz wdraza `CMS_MEDIA_ENABLED=true`,
zachowujac wlaczone flagi poprzedniego etapu.

Biblioteka laczy indeks wersjonowanych grafik i dokumentow `public`, istniejace
publiczne pliki publikacji w R2, dokumenty sekcyjne z R2/D1 oraz zrodla aktywnych
biuletynow. Nie przenosi, nie nadpisuje i nie importuje masowo starych plikow.
Prywatne dane systemowe, logotypy kont, staging i surowe kopie historii pozostaja
poza katalogiem plikow do ponownego uzycia.

Aktywne zrodla biuletynow maja wskazane wydanie i osobny adres pobrania
`/api/admin/media?download=...`, dostepny tylko administratorowi przy wlaczonej
fladze biblioteki. Pobierany jest dokladnie wybrany plik zrodlowy, a nie glowny
PDF wydania. Te adresy nie sluza do publicznego udostepniania zalacznikow.

`npm run generate:media` odtwarza `app/data/media-catalog.json` z rzeczywistych,
wersjonowanych plikow, ich rozmiarow i SHA-256 oraz aktualnie skorygowanych tresci
strony. Jest czescia predev/prebuild. Po dodaniu nowego statycznego pliku najpierw
obejmij go wersjonowaniem, a potem odswiez indeks. Plikow ignorowanych, buforow
odzyskiwania i testowych uploadow nie nalezy dolaczac do tego indeksu.

Wyszukiwanie obejmuje nazwe, sciezke i miejsca uzycia. Indeks laczy publikacje,
podstrony, wskazania w kodzie, aktualne rekordy CMS, historie i kosz. Wskazanie
w kodzie jest informacja konserwatywna, nie obietnica wykrycia kazdego dynamicznie
skladanego adresu. Brak wykrytego odnosnika nie dowodzi, ze plik nie jest uzywany
np. przez zewnetrzny serwis. Blad odczytu lub niepelna lista R2 blokuje operacje,
zamiast uznawac nieodczytane pliki za nieuzywane.

Nowe publiczne uploady: JPEG, PNG, WebP, PDF, DOCX i XLSX, do 25 MB, z kontrola
sygnatury formatu. Kazdy upload ma nowy klucz UUID; powtorzenie nazwy nie nadpisuje
starych bajtow. Prywatne dokumenty nadal wgrywa sie w ich dotychczasowych sekcjach.
Nie wolno dodawac ich do publicznego uploadu biblioteki.

Formularze dodawania i edycji publikacji pozwalaja wybierac istniejace publiczne
grafiki i do 30 zalacznikow bez ponownego uploadu. Zachowuja tez dotychczasowy
wybor z dysku. Prywatne dokumenty i zrodla biuletynow nie sa udostepniane jako
publiczne zalaczniki. Materialy metodyki pozostaja publiczne, zgodnie z obecnym
endpointem; ponowne uzycie zachowuje adres z `scope=methodology`.

Wybor z biblioteki otwiera duze okno modalne z miniaturami, wyszukiwaniem
i stronicowaniem, bez opuszczania ani resetowania formularza. Wybor grafiki
zamyka okno; przy zalacznikach mozna wskazac kilka plikow przed zamknieciem.
Przycisk zamkniecia i Escape wracaja do formularza bez zapisu publikacji.
Okno jest poza formularzem, aby Enter w wyszukiwaniu nie publikowal wpisu.

Publikacje i zapytania moga dodatkowo miec do 5 zdjec w osobnej galerii pod
tekstem. Grafika kafelka oraz zalaczniki pozostaja niezalezne. Miniatury maja
160 x 120 px na komputerze; powiekszenie miesci pelny obraz w ramce
1024 x 768 px, bez rozciagania, z dopasowaniem do mniejszego ekranu.
Nowe pole pozwala mieszac zdjecia z dysku i biblioteki oraz zmieniac kolejnosc.
Zdjecia z dysku przechodza kontrole sygnatury i limit 25 MB na plik.

Galeria korzysta z istniejacego `attachments_json`: jej wpisy maja dodatkowe
`gallery: true`, sa oddzielane od dokumentow w API i na stronie. Nie wymaga
migracji ani przepisywania dotychczasowych rekordow. Historia, kosz i indeks
uzycia obejmuja te same wpisy, wiec odpiecie zdjecia nie kasuje oryginalu;
plik obecny w historii nadal jest chroniony. Starszy formularz bez pola
`gallery` zachowuje istniejaca galerie; jawne `[]` ja odlacza.
Wylaczenie `CMS_MEDIA_ENABLED` ukrywa nowe pole i blokuje nowe wybory, lecz
zapisane galerie nadal wyswietlaja sie i sa zachowywane przy zwyklej edycji.

Kosz biblioteki jest osobnym widokiem w tym panelu. Dotyczy tylko publicznych
plikow R2; uzycie w tresci, historii lub koszu blokuje przeniesienie. Statyczne
archiwum, dokumenty sekcyjne i zrodla biuletynow sa chronione i nadal zarzadzane
w swoich dotychczasowych miejscach. Zmiana stanu zapisuje tylko metadane D1:
nie kasuje ani nie przenosi bajtow R2, nie uniewaznia istniejacego URL i nie jest
mechanizmem cofania dostepu. Nie ma funkcji trwalego oprozniania kosza.
To zabezpiecza linki takze przy nieznanym odwolaniu lub rownoczesnym zapisie.

Wylaczenie `CMS_MEDIA_ENABLED` chowa nowy panel, API oraz selektory, ale nie
przerywa dzialania juz wybranych grafik i zalacznikow ani starego uploadu.
Historia etapu 2 odtwarza ich oryginalne klucze i adresy. Nie cofaj nowej tabeli
ani nie usuwaj plikow przy rollbacku. `CMS_READ_ONLY` obejmuje nowe zapisy API
tak samo jak pozostale operacje administratora.

## Techniczny kosz

- Publikacje: zachowany caly rekord, URL, daty i pliki; usuniecie ustawia
  `deleted_at`, przywrocenie przywraca publikacje bez zmiany daty.
- Dokumenty wszystkich trzech sekcji: ukrywane z list i ZIP, ale bajty i tytuly
  pozostaja. Istniejace, takze wspoldzielone odnosniki nadal dzialaja zgodnie
  z dotychczasowymi uprawnieniami. Kosz nie jest mechanizmem cofania dostepu
  do dokumentu. Plik o nazwie zajetej w koszu trzeba najpierw przywrocic
  albo nadac nowemu inna nazwe.
- Biuletyny: snapshot calego rekordu przed usunieciem z aktywnego spisu;
  dane i zrodla zachowane. Przywracanie nie nadpisuje innego wydania pod tym URL.
- Podmiana grafiki i dolaczanie kolejnego pliku do publikacji uzywaja nowych
  kluczy; stare bajty i istniejace odnosniki nie sa kasowane ani nadpisywane.
- Blad zapisu kosza zatrzymuje usuniecie. Nie ma funkcji trwalego oprozniania.
  Sprzatanie nieudanych uploadow/stagingu pozostaje osobna, dotychczasowa operacja.

Metadane kosza znajduja sie w addytywnej tabeli `content_trash`; jesli bindingu
D1 nie ma, uzywany jest R2. Lokalny system plikow jest dozwolony tylko poza
produkcja. Wszystkie te zrodla nalezy uwzgledniac w kopiach. Publiczny endpoint
mediow odrzuca zarezerwowana przestrzen `content-trash/`.

Po wlaczeniu flagi administrator moze wywolac:

- `GET /api/admin/content-trash` - lista aktywnych wpisow;
- `PATCH /api/admin/content-trash` z JSON `{"id":"IDENTYFIKATOR_WPISU_KOSZA"}` -
  przywrocenie; obowiazuja sesja administratora i dotychczasowa ochrona zapytan.

Widok kosza jest dostepny w panelu etapu 2. Kosz nie odzyska plikow fizycznie usunietych przed jego
uruchomieniem; dla takich strat potrzebna jest wczesniejsza kopia.
