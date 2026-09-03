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
| `source` | nie | Link do materiału źródłowego |
| `links` | nie | Lista załączników (patrz szablon) |
| `justify` | nie | Wpisz `tak`, aby wyjustrować tekst akapitów (wyrównanie do obu marginesów) |
