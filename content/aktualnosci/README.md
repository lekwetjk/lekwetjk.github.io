# Jak dodać nową aktualność (bez znajomości programowania)

1. Skopiuj plik `_SZABLON.md` z tego folderu i zmień jego nazwę, np. `2026-09-10-nowy-komunikat.md`.
2. Uzupełnij pola na górze pliku (między liniami `---`).
3. Poniżej drugiej linii `---` wpisz treść — każdy akapit oddzielony pustą linią.
4. W tekście możesz użyć:
   - `**pogrubienie**` — wyświetli się jako **pogrubiony tekst**
   - `[etykieta linku](https://adres-strony.pl)` — wyświetli się jako klikalny link
5. Zapisz plik, zacommituj i wypchnij zmiany (np. przez GitHub Desktop).

Strona sama umieści nowy wpis na liście aktualności, w odpowiedniej kategorii i z poprawnym formatowaniem — nie trzeba edytować żadnego innego pliku.

## Pola w nagłówku

| Pole | Wymagane | Opis |
|---|---|---|
| `title` | tak | Tytuł aktualności |
| `date` | tak | Data w formacie `RRRR-MM-DD` |
| `excerpt` | nie | Krótki opis widoczny na liście |
| `categories` | nie | Kategorie oddzielone przecinkiem, np. `Aktualności, Prawo` |
| `image` | nie | Ścieżka do obrazka, np. `/media/news/przyklad.jpg` |
| `source` | nie | Link do materiału źródłowego |
| `links` | nie | Lista załączników (patrz szablon) |
| `justify` | nie | Wpisz `tak`, aby wyjustrować tekst akapitów (wyrównanie do obu marginesów) |
