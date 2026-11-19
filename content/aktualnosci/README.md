# Jak dodać nową aktualność (bez znajomości programowania)

1. Skopiuj plik `_SZABLON.md` z tego folderu i zmień jego nazwę, np. `2026-09-10-nowy-komunikat.md`.
2. Uzupełnij pola na górze pliku (między liniami `---`).
3. Poniżej drugiej linii `---` wpisz treść — każdy akapit oddzielony pustą linią.
4. W tekście możesz użyć:
   - `**pogrubienie**` — wyświetli się jako **pogrubiony tekst**
   - `[etykieta linku](https://adres-strony.pl)` — wyświetli się jako klikalny link
5. Zapisz plik, zacommituj i wypchnij zmiany (np. przez GitHub Desktop).

Strona sama umieści nowy wpis na liście aktualności, w odpowiedniej kategorii i z poprawnym formatowaniem — nie trzeba edytować żadnego innego pliku.

## Edycja kampanii „Wybierz Twoje Wartości!” w panelu

Po wdrożeniu otwórz panel `/admin/publikacje` jako administrator i przy tym wpisie wybierz „Włącz edycję w panelu”. Jednorazowy import zachowuje adres, datę publikacji, treść Markdown, logo, justowanie i kategorie. Potem używaj przycisku „Edytuj” jak przy publikacjach dodanych z panelu.

Wersja z bazy ma pierwszeństwo w artykule, aktualnościach, kampaniach i na stronie głównej. Ponowny import nie nadpisuje zmian. Po imporcie dostępne są standardowe działania: „Otwórz wpis”, „Edytuj” i „Usuń”. Usunięcie wymaga potwierdzenia, usuwa wpis z publicznych list oraz mapy strony, a jego adres zwraca 404. W bazie pozostaje znacznik usunięcia, aby plik Markdown ani ponowny import nie przywróciły publikacji. Po imporcie aktualizuj wpis w panelu, nie w pliku.

Pole `created_by` zapisuje konto administratora wykonującego import, a nie autora pierwotnej publikacji. `created_at` zachowuje datę publikacji; `updated_at` wskazuje import lub ostatnią edycję. Historia Git zachowuje pochodzenie oryginału.

### Podgląd lokalny

W trybie development, gdy binding D1 nie jest dostępny, publikacje korzystają z osobnej bazy SQLite w `.wrangler/state/local-managed-posts.sqlite` (Node.js 22.13+). Baza jest wyłączona z Git. Import i edycja tekstu działają po zalogowaniu do lokalnego panelu; nie zmieniają produkcji. Nowa lokalna baza nie zawiera wpisów z produkcyjnego panelu. Wgrywanie nowych grafik i załączników nadal wymaga bindingu R2; istniejące logo importowanej kampanii pozostaje dostępne. W produkcji nie ma zastępczej bazy SQLite.

## Pola w nagłówku

| Pole | Wymagane | Opis |
|---|---|---|
| `title` | tak | Tytuł aktualności |
| `date` | tak | Data w formacie `RRRR-MM-DD` |
| `excerpt` | nie | Krótki opis widoczny na liście |
| `categories` | nie | Kategorie oddzielone przecinkiem, np. `Aktualności, Prawo` |
| `image` | nie | Ścieżka do obrazka, np. `/media/news/przyklad.jpg` |
| `imageFit` | nie | `contain` (domyślnie): cały obraz bez przycinania; `cover`: wypełnienie ramki z przycięciem brzegów. Dotyczy kafelków i nagłówka artykułu. |
| `source` | nie | Link do materiału źródłowego |
| `links` | nie | Lista załączników (patrz szablon) |
| `justify` | nie | Wpisz `tak`, aby wyjustrować tekst akapitów (wyrównanie do obu marginesów) |

## Korekta archiwalnych kampanii

`app/lib/campaign-posts.ts` zawiera ręczne korekty 26 wpisów z dawnej kategorii „Kampanie” oraz formatowania „Wybierz Twoje Wartości!”. Korekty są ograniczone do kategorii i par identyfikator–historyczny slug (wpis generowany rozpoznawany jest po slugu). Nie zmieniają adresów, dat ani plików źródłowych JSON. W `app/lib/content.ts` wykonywane są **po ostatnim sanitizowaniu**: wcześniejszy sanitizer spłaszcza nowe linie, niszcząc listy Markdown. Rzeczywiste sekcje mają jawne nagłówki `##`, a elementy list są łączone nowymi liniami w jednym akapicie.

Wersje zarządzane w CMS mają nadal pierwszeństwo; helper pomija także wpisy oznaczone `managed`. Po imporcie kampanii do panelu dalsze korekty należy nanosić w panelu.

### Materiały przywrócone i braki

- Raport „Indyk ma wiele do dania” za październik 2024 przywrócono jako lokalny link Markdown do `/media/reports/KRD-indyk_pazdziernik.pdf` (25 stron, okładka „RAPORT PAŹDZIERNIK 2024”).
- Raport za wrzesień 2024 przywrócono pod `/media/reports/KRD_Indyk_wrzesien.pdf` (17 stron, okładka „RAPORT WRZESIEŃ 2024”). Kopia znajdowała się w lokalnym, ignorowanym przez Git katalogu `public/media/imported-documents/`, dlatego przeniesiono materiał do wersjonowanych raportów. Jest identyczny z oryginałem `https://old.krd-ig.com.pl/wp-content/uploads/2024/11/KRD_Indyk_wrzesien.pdf`; SHA-256: `8d06ec78a63f098f8a979dbe6665c860a0512f2a30b5f9e84452934c8cf15273`.
- Dwa jednostronicowe skany rymowanek „Polski drób w oczach dziecka” odzyskano z `https://old.krd-ig.com.pl/wp-content/uploads/2022/07/POLSKI-DROB-W-OCZACH-DZIECKA-1.pdf` i `-2.pdf`. Potwierdzono wizualnie ich treść. Lokalne pliki: `/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-1.pdf` (SHA-256 `212b3d3c7a2feac8bf1213e21e5c2e008c7dfacc07f6ab73bedbb13b8dec223d`) i `-2.pdf` (`0c743e6a4247e668a40c746ee50251f2a36defc35eb3b11b23736ea5b99be7d3`).
- Nadal nie odnaleziono prezentacji `Prezentacja_indyk.pptx`. W publicznej treści nie ma obietnicy jej pobrania ani komunikatu technicznego o braku pliku.
- W kampaniach indyczej i kurczęcej z 2022 r. nie zachowały się pliki czterech spotów (TV/radio, 30/15 sekund) dla każdej kampanii. Usunięto puste podpisy i komunikaty o braku nagrań; zachowano merytoryczny opis emisji.
- `indykajemy.pl`, `foodservice24.pl`, `e-restauracja.pl`, `horectrends.pl` i wrześniowy materiał „Dzień dobry TVN” pozostają wzmiankami historycznymi bez niesprawnych odnośników i bez publicznych ostrzeżeń o dostępności. Nie zgadujemy alternatywnych adresów.
- Eksport `wordpress/export/content-export.json` nie zawiera pełnej treści „Czerwonej kartki dla dezinformacji”; opis oparto wyłącznie na zachowanym tytule i zapowiedzi o Szymonie Marciniaku, uzupełniając go potwierdzonym linkiem do strony kampanii. Informacje o brakach eksportu pozostają wyłącznie w dokumentacji, nie w publicznym artykule.
- W najstarszych projektach zachowano daty i pełne zdania wstępu obecne wyłącznie w zapowiedziach. Eksport również ucina końcówki zapowiedzi „Indyk z Europy…” i „Drób z europejskim paszportem…”, więc urwanych zdań nie dopisywano. Zachowano pełne istniejące akapity o kontroli produkcji i piórach. Rok 2019 w opisie projektu azjatyckiego odróżniono od publikacji w 2020 r.; nie ustalano nieudokumentowanych dat realizacji.

Sprawdzono pliki w `public/`, lokalne materiały, nazwy zasobów w archiwach `wordpress/krd-ig-media.zip` i `moja_strona_sources.zip` oraz publiczne archiwum `old.krd-ig.com.pl` i jego API WordPress. Odzyskane załączniki są serwowane lokalnie, niezależnie od dostępności archiwum. Aby przywrócić brakujący materiał, należy najpierw potwierdzić jego treść i pochodzenie, umieścić zweryfikowany plik w `public/media/`, a następnie dodać w nadpisaniu danego wpisu link Markdown do rzeczywistej ścieżki lokalnej. Nie należy dodawać samego przycisku „pobierz” ani zgadywanego URL. Publiczne opisy kampanii nie zawierają komunikatów o imporcie, brakach eksportu, plików lub nagrań ani wyjaśnień technicznych dotyczących historycznych adresów i dat. Po imporcie wpisu do CMS przywrócenie wykonuje się w jego wersji panelowej.

Testy korekt: `node --experimental-strip-types --test tests/campaign-posts.test.ts`.

### Zewnętrzne strony kampanii w tickerze

W komponencie `CampaignWebsiteTicker` Dobry Drób korzysta z kanonicznego adresu HTTPS: `https://dobrydrob.pl/`. StopDezinformacji (timeout), Wings (wygasły certyfikat TLS) i Podaj (wygasły certyfikat HTTPS, choć HTTP działa) pozostawiono jako nieklikalne kafle z jawnym statusem niedostępności. Nie obchodzimy zabezpieczeń TLS ani nie zastępujemy HTTPS działającym HTTP. Po ponownym potwierdzeniu dostępności i poprawnego HTTPS redakcja może przywrócić `href` i logo oraz usunąć `unavailable` w tym komponencie.
