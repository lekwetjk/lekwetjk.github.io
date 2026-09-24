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
