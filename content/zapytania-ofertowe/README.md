# Jak dodać nowe zapytanie ofertowe / ogłoszenie (bez znajomości programowania)

1. Skopiuj plik `_SZABLON.md` z tego folderu i zmień jego nazwę, np. `2026-09-15-zapytanie-ofertowe.md`.
2. Uzupełnij pola na górze pliku (między liniami `---`).
3. Poniżej drugiej linii `---` wpisz treść — każdy akapit oddzielony pustą linią.
4. W tekście możesz użyć:
   - `**pogrubienie**` — wyświetli się jako **pogrubiony tekst**
   - `[etykieta linku](https://adres-strony.pl)` — wyświetli się jako klikalny link
5. Zapisz plik, zacommituj i wypchnij zmiany (np. przez GitHub Desktop).

Wpis pojawi się automatycznie na stronie „Zapytania ofertowe” — w odpowiedniej kategorii, z poprawnym formatowaniem i filtrowaniem.

## Pole `categories` — wybierz dokładnie jedną z etykiet

| Etykieta | Kiedy używać |
|---|---|
| `Zapytania ofertowe` | ogłoszenie nowego zapytania ofertowego |
| `Zaproszenie do składania ofert` | zaproszenie do złożenia oferty |
| `Wybór wykonawcy` | ogłoszenie wyniku i wybranego wykonawcy |
| `Wyniki postępowania` | wyniki zakończonego postępowania |
| `Informacja o unieważnieniu` | unieważnienie postępowania |

## Pozostałe pola

| Pole | Wymagane | Opis |
|---|---|---|
| `title` | tak | Tytuł ogłoszenia |
| `date` | tak | Data w formacie `RRRR-MM-DD` |
| `excerpt` | nie | Krótki opis widoczny na liście |
| `image` | nie | Ścieżka do obrazka, np. `/media/news/przyklad.jpg` |
| `imageFit` | nie | `contain` (domyślnie): cały obraz bez przycinania; `cover`: wypełnienie ramki z przycięciem brzegów. Dotyczy kafelków i nagłówka artykułu. |
| `source` | nie | Link do materiału źródłowego |
| `links` | nie | Lista załączników (patrz szablon) |
| `justify` | nie | Wpisz `tak`, aby wyjustrować tekst akapitów (wyrównanie do obu marginesów) |

## Odzyskane załączniki archiwalne

Audyt objął wszystkie 122 publikacje w archiwum, także te widoczne dopiero po użyciu „Pokaż więcej”. W chwili audytu 132 ze 140 unikalnych adresów plików widocznych w treści nie działały; dodatkowe załączniki były zapisane w danych, ale nie były klikalne w artykułach.

`app/data/tender-attachment-repairs.json` zawiera mapowanie potwierdzonych oryginalnych adresów na wersjonowane pliki w `public/media/tenders/restored/`, wraz z adresem pochodzenia, rozmiarem i SHA-256. Kopie z ignorowanego katalogu `public/media/imported-documents/` nie trafiały do wdrożeń. Odzyskane pliki dodano do wersjonowanych zasobów, bez uzależniania pobierania od dawnego WordPressa.

`app/lib/tender-attachments.ts` stosuje mapowanie wyłącznie do zapytań i ogłoszeń przetargowych, po sanitizowaniu treści. Nie nadpisuje wpisów zarządzanych w CMS. W publikacjach z pomijanymi załącznikami powtarzające się etykiety „pobierz.pdf” połączono z dokumentami zgodnie z kolejnością zachowanych danych źródłowych. Różnice zapisu etykiet i pomijanie kolejnych linków przez dawny renderer naprawiono jawnymi odnośnikami Markdown. Dokumenty obecne w danych, ale bez odpowiadającego im tekstu odnośnika, mają dodatkowy link z nazwą pliku. Przywrócone akapity są dodatkowo ograniczone parą identyfikator–slug; testy potwierdzają zachowanie istniejącego tekstu i kolejności.

Źródłami są lokalne kopie zweryfikowane według wcześniejszych sum SHA-256, publiczne archiwum `old.krd-ig.com.pl`, oficjalny interfejs Sejmu dla aktu Dz.U. 2023 poz. 1122, Internet Archive, Common Crawl oraz pierwotny serwer WordPressa. Zaproszenie „Ochrona wizerunku…” z 6 sierpnia 2026 r. prowadzi teraz do opublikowanej wersji z końcówką `-1.pdf` (19 stron, termin składania ofert 24 sierpnia 2026 r.). Jego kopia i komplet załączników PDF z Common Crawl są identyczne z plikami pobranymi z pierwotnego serwera. Dane audytu starszych 27 publikacji i ich plików pozostają w `docs/imports/legacy-tenders-pages-8-10.json`; 21 z 45 odwołań ma potwierdzone lokalne kopie.

Po wskazaniu pierwotnego serwera pobrano brakujące załączniki PDF, DOCX i XLSX z 2026 r. z użyciem właściwego wirtualnego hosta: `curl --resolve krd-ig.com.pl:443:109.95.157.137 https://krd-ig.com.pl/<oryginalna-sciezka>`. Weryfikacja certyfikatu TLS pozostała włączona. Sam adres IP bez prawidłowej nazwy hosta nie wystarcza do odczytu plików. Dziewięć dalszych odwołań z lat 2018–2019 odzyskano z migawek oryginalnych domen `krd-ig.com.pl` i `www.krd-ig.com.pl`; SHA-1 pobranych plików zgadza się z indeksem archiwum. Potwierdzono odczyt wszystkich stron PDF. Dwa różne źródłowe adresy identycznego formularza współdzielą lokalny plik.

Nie należy zastępować brakującego dokumentu formularzem o podobnej nazwie ani wersją dotyczącą innej daty lub postępowania. Braków nie odtwarzamy z fragmentów wyszukiwarki i nie generujemy dokumentów zastępczych.

Podsumowanie audytu oraz lista 26 odwołań, dla których nadal nie odzyskano potwierdzonych oryginałów: `docs/imports/tender-attachment-recovery.json`. W ponownej rundzie przywrócono 12 z 38 brakujących odwołań oraz opublikowaną wersję zaproszenia z 2026 r. Łącznie przywrócono 164 unikalne dokumenty odpowiadające 177 adresom źródłowym. Końcowy audyt 122 artykułów potwierdził 171 unikalnych działających plików; dwa dawne adresy IFE 2019 nadal odpowiadają 404, pozostałe nieodzyskane odwołania są nieaktywnymi podpisami.

Pozostałe ścieżki `/upload/file/…` odpowiadają 404 również bezpośrednio na pierwotnym serwerze, a źródłowe artykuły WordPressa nadal odsyłają do tych samych adresów. Dwie odnalezione kopie opisów programu „Indyk z Europy” są obcięte przy archiwizacji do 1 MiB (oryginały miały 2 375 053 i 2 722 780 bajtów); nie dodano ich jako załączników. Do pełnego odzyskania pozostałych materiałów potrzebna jest kopia dawnego katalogu `upload/file` lub inne potwierdzone oryginały, np. z kopii zapasowej hostingu.

## Grafiki kafelków

Oryginalne grafiki używane przez kafelki pod dawnymi adresami `/wp-content/uploads/…` są wersjonowane w `public/wp-content/uploads/`. Zachowano oryginalne ścieżki, dzięki czemu obrazy działają również w nagłówkach artykułów i innych wpisach korzystających z tych samych plików, bez odwoływania się do dawnego serwera WordPressa. Test sprawdza obecność i sygnatury grafik całego archiwum, także publikacji niewidocznych na pierwszej stronie.

Walidacja: `node --test tests/legacy-tenders.test.mjs tests/campaign-posts.test.ts tests/campaign-rendering.test.mjs`.
