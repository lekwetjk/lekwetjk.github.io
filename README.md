# KRD-IG — strona sektora drobiarskiego

To jest projekt front-endowej witryny Krajowej Rady Drobiarstwa — Izby Gospodarczej. Strona ma charakter edukacyjno-informacyjny i prezentuje główne obszary działalności organizacji: rynek, hodowla, jakość, aktualności, dokumenty i członkostwo.

## Technologie

- Next.js / Vinext
- React 19
- TypeScript
- Vite
- Cloudflare Workers / Vite plugin
- Tailwind CSS

## Wymagania

- Node.js >= 22.13
- pnpm

## Instalacja

```bash
pnpm install
```

## Uruchomienie lokalne

```bash
pnpm dev
```

Aplikacja będzie dostępna lokalnie na porcie 3000 lub kolejnych wolnych portach, w zależności od aktywności innych procesów.

### Rejestr logów

Administrator otwiera rejestr z kafelka „Rejestr logów” na swoim koncie
lub pod adresem `/admin/rejestr-logow`. Dostępne są filtry i paginacja.
Filtry dat korzystają z polskiego kalendarza (tydzień od poniedziałku)
i formatu `dd.mm.rrrr`, niezależnie od języka przeglądarki.
Rejestr obejmuje logowania, wylogowania, zmiany/reset haseł i aktywność sesji
oraz operacje administracyjne, w tym eksporty i przesyłanie raportów.
Filtry dat i godziny wpisów korzystają ze strefy `Europe/Warsaw`, również
podczas zmiany czasu. Nieznane loginy nie są przypisywane do roli członka.
Czas aktywności jest przybliżoną sumą krótkich odcinków sesji: aktualizuje się
co 5 minut przy widocznej karcie oraz przy jej ukryciu i wylogowaniu.
Przerwy dłuższe niż 6 minut nie powiększają czasu, a wylogowanej sesji nie
można ponownie zaktualizować. Hasła, tokeny i surowe błędy SQL nie trafiają
do wpisów. Błędy zapisu zdarzeń są zgłaszane w logach serwera; awaria
odczytu rejestru lub zapisu aktywności nie udaje poprawnej odpowiedzi.

Na produkcji wpisy trafiają do tabeli D1 `audit_logs`, tworzonej automatycznie.
W trybie development, bez bindingu D1, rejestr korzysta z istniejącego
lokalnego adaptera SQLite i pliku `.wrangler/state/local-managed-posts.sqlite`.
Wpisy lokalne pozostają po odświeżeniu i ponownym uruchomieniu serwera;
nie są wysyłane do produkcyjnej bazy. Produkcja nie korzysta z tego fallbacku.

## Biuletyny PDF w strefie członkowskiej

W sekcji „Raporty”, obok wyboru wydania, przycisk „Pobierz PDF” pobiera
oryginalny biuletyn wybranego miesiąca. Sekcja „Raporty”, lista wydań
i pozostałe raporty są publiczne. Tylko otwieranie biuletynów interaktywnych
i pobieranie ich PDF-ów wymaga aktywnej sesji.
Otwarcie wybranego biuletynu przekierowuje niezalogowanych do logowania,
a po zalogowaniu z powrotem do wybranego wydania.
Pliki przechowujemy w `private/bulletins`, nigdy w katalogu `public`.
Nazwy: `biuletyn-2026-01.pdf`, a dla wydania łączonego
`biuletyn-2026-04_05.pdf` (identyfikator wydania: `2026-04-05`).

Lokalnie, bez bindingu R2, aplikacja czyta pliki z tego folderu.
Na hostingu korzysta wyłącznie z prywatnego bucketa `MEMBER_DOCUMENTS`,
z prefiksem `bulletin-pdfs/`. PDF-y są ignorowane przez Git i nie trafiają do publicznego repozytorium.
Przed wdrożeniem nowych wydań należy przesłać je lokalnie poleceniem
`node scripts/upload-bulletin-pdfs.mjs` z uprawnieniami zapisu R2.
Skrypt korzysta z `CLOUDFLARE_MEMBER_DOCUMENTS_BUCKET` lub domyślnie
`krd-ig-member-documents`. Bucket nie powinien mieć publicznego dostępu.
Nowe wydania dodawane w panelu administratora korzystają z dołączonego PDF.
Sam PDF, np. wrześniowy, nie tworzy nowego wydania interaktywnego.

Kafelki podsumowania pokazują nazwę wskaźnika, jednostkę, zakres danych
i okres. Udział eksportu jest prezentowany w procentach (np. 53,3%, nie 0,533),
a import i eksport w kilogramach masy netto, narastająco od początku roku.
Gwiazdka przy roku oznacza dane wstępne, zgodnie z przypisem w PDF.
Wbudowane wydania mają przypisane opisy wskaźników w `app/lib/prepared-bulletins.ts`.
Modele JSON nowych wydań mogą zawierać opcjonalne `metric` przy wykresie:
`label`, `description`, `unit` i `format` (`number` lub `percent`).
Dla `percent` wartości źródłowe są udziałami od 0 do 1.

Widoki „Wykresy” i „Tabele” pokazują szczegółowy tytuł oraz krótki opis
przed każdą wizualizacją. Wyszukiwarka obejmuje również te opisy i tytuły.
Opisy wbudowanych wykresów są przypisane w `app/lib/bulletin-chart-descriptions.ts`,
a tabel w `app/data/bulletins/table-descriptions.json`, według wydania i ID.
Metadane nie zmieniają wartości liczbowych, kolejności ani zakresu danych.
Modele JSON nowych wydań mogą zawierać `description` przy wykresie
oraz `title` i `description` przy każdej tabeli.

## MVP ChatGPT na stronie

W projekcie jest gotowy endpoint worker `POST /api/chat` i widget czatu w interfejsie.

### Konfiguracja env

1. Skopiuj `.dev.vars.example` do `.dev.vars`.
2. Ustaw sekret `OPENAI_API_KEY`.
3. Opcjonalnie ustaw:
- `OPENAI_MODEL` (domyślnie `gpt-4.1-mini`)
- `CHAT_ALLOWED_ORIGIN` (np. `https://krd-ig.com.pl`)

Przy hostingu statycznym frontendu (np. GitHub Pages) ustaw też zmienną build-time:
- `NEXT_PUBLIC_CHAT_API_URL` = pełny adres workera, np. `https://krd-ig-website-concept.krd-ig2020.workers.dev`

Bez `NEXT_PUBLIC_CHAT_API_URL` widget domyślnie wywołuje lokalne `/api/chat`, co na hostingu statycznym zwraca 404.

`/api/chat` ma podstawowe zabezpieczenia:
- walidacja JSON i długości wiadomości,
- limit rozmiaru payloadu,
- prosty rate limit per IP,
- timeout requestu do modelu,
- blokada originu przy ustawionym `CHAT_ALLOWED_ORIGIN`.

### Szybki test działania

Health endpoint (bez klucza też odpowie):

```bash
curl http://localhost:3000/api/chat/health
```

Test chat endpoint:

```bash
curl -X POST http://localhost:3000/api/chat \
	-H "Content-Type: application/json" \
	-d '{"message":"Czym zajmuje się KRD-IG?"}'
```

## API listy członków

`GET /api/members` udostępnia aktualną listę **wszystkich użytkowników z rolą
„Członek”**, także nieaktywnych. Administratorzy nie są zwracani.
Endpoint wymaga nagłówka `X-API-Key` i działa na serwerze Next.js/Vinext lub
Cloudflare Worker, nie na statycznym GitHub Pages.

### Konfiguracja i autoryzacja

- Wygeneruj losowy klucz (co najmniej 32 bajty), np.:
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- Ustaw go jako sekret `MEMBERS_API_KEY` w środowisku serwera. Lokalnie użyj
  pliku `.env.local` dla Vinext/Next.js albo `.dev.vars` dla środowiska Wrangler.
- Na Cloudflare po buildzie dodaj sekret poleceniem
  `npx wrangler secret put MEMBERS_API_KEY --config dist/server/wrangler.json`
  (lub w panelu właściwego Workera). Podaj wartość w interaktywnym monicie.
- Przekaż ten sam klucz aplikacji integrującej się z API. Używaj HTTPS.
  Nie umieszczaj klucza w repozytorium, adresie URL, zmiennych `NEXT_PUBLIC_*`
  ani kodzie przeglądarki. Integracja jest przeznaczona do komunikacji serwer–serwer.
- Aby zmienić klucz, zaktualizuj sekret serwera i konfigurację aplikacji zewnętrznej.
  Nie jest potrzebny nowy build.

Przykład wywołania (zastąp wartość nagłówka swoim kluczem):

```bash
curl https://krd-ig.com.pl/api/members \
  -H "X-API-Key: TWOJ_KLUCZ"
```

### Format odpowiedzi

```json
{
  "members": [
    {
      "id": "member-123",
      "name": "Przykładowa firma",
      "address": {
        "street": "ul. Przykładowa 1",
        "postalCode": "00-001",
        "city": "Warszawa",
        "voivodeship": "mazowieckie"
      },
      "description": "Opis firmy",
      "logo": "data:image/png;base64,...",
      "scopes": ["Produkcja"],
      "species": ["Kurczak"],
      "assortments": ["Mięso"],
      "exportPermits": ["Japonia"],
      "certifications": ["BRC"],
      "website": "https://example.com"
    }
  ]
}
```

`name` pochodzi z nazwy firmy w profilu; przy jej braku używana jest nazwa
użytkownika (nie login). `description` odpowiada polu dodatkowych informacji
profilu. `logo` to kompletny obraz w formacie data URL (MIME + Base64), albo
`null`, jeśli nie został dodany. Brakujące teksty mają wartość `""`, listy `[]`.
Wyniki są uporządkowane według identyfikatora. Pusta baza członków zwraca
`{"members":[]}`.

Odpowiedź zawiera wyłącznie powyższe pola, bez loginów, haseł, hashy haseł,
danych sesji, danych osoby kontaktowej, telefonu, e-maila i NIP-u.
Odpowiedzi mają `Cache-Control: no-store`. Statusy błędów:

- `401` — brak lub nieprawidłowy nagłówek `X-API-Key`;
- `503` — serwer nie ma skonfigurowanego sekretu;
- `500` — błąd bazy/profilu lub odczytu logo; API nie zastępuje danych
  produkcyjnych kontami testowymi ani nie zwraca częściowej listy.

Wymagane są skonfigurowany binding D1 `DB` i tabele członków/profili.
Logotypy są odczytywane z R2 `MEMBER_DOCUMENTS` lub starszego magazynu D1,
tak jak w serwisie.

### Słowniki formularza członkowskiego

Pola wyboru formularza „Dołącz do nas” i profili członków korzystają z tabeli
D1 `member_profile_dictionary_options`. Każda wartość zawiera polską nazwę,
angielskie tłumaczenie, kolejność i status aktywności. Domyślne wartości są
tworzone automatycznie przy pierwszym użyciu.

Administrator zarządza wszystkimi sześcioma słownikami w swoim profilu:
województwami, zakresem działalności, gatunkami drobiu, asortymentem,
certyfikatami i uprawnieniami eksportowymi. Dezaktywowane wartości nie są
pokazywane w formularzach, ale pozostają w bazie.

## Metodyka i biuletyny

Administrator otwiera kafelek „Metodyka i biuletyny” w swoim profilu.
Dedykowany panel `/admin/metodyka-i-biuletyny` pozwala dodawać pliki,
nadawać i edytować tytuły publikacji, zastępować pliki oraz usuwać materiały.
Tytuł jest wymagany, ma do 200 znaków i jest niezależny od nazwy pliku.
Zastąpienie pliku zachowuje tytuł oraz dotychczasowy adres pobierania.
Nowe publikacje otrzymują unikalne nazwy w magazynie, więc dwa pliki
o tej samej nazwie nie nadpisują się przypadkowo.
Obsługiwane formaty: PDF, DOCX, XLSX, JPEG/JPG i PNG, do 100 MB.

Strona `/tresc/metodyka-i-biuletyny` i pobieranie materiałów są publiczne.
Tylko administrator może zmieniać materiały. Pliki używają oddzielnego
zakresu `methodology` w istniejącym magazynie dokumentów. W R2 tytuł jest
zapisany w metadanych obiektu, w D1 w kolumnie `title`, a lokalnie w
osobnym podkatalogu `titles`. Starsze pliki bez tytułu nadal korzystają
z tytułu wygenerowanego z nazwy pliku.

Katalog roboczy `materials/metodyka-i-biuletyny` nie jest publikowany
automatycznie. Polecenie `npm run materials:metodyka` przygotowuje pliki
źródłowe oraz manifest z ich sumami SHA-256, w tym trzy akty prawne
pobierane z oficjalnego API Sejmu. Skrypt sprawdza integralność przed
zapisem i nie nadpisuje plików zmodyfikowanych przez administratora.
Katalog jest wyłączony z Git; commit zawiera skrypt, nie kopie plików PDF.

## Build produkcyjny

```bash
pnpm build
```

## Deploy

### 1. Cloudflare

Najbezpieczniej wdrażać przez Cloudflare Pages / Workers z wykorzystaniem Vite i pluginu Cloudflare.

W praktyce:

- zainstaluj zależności projektu,
- uruchom build produkcyjny,
- podłącz repozytorium do Cloudflare Pages lub Cloudflare Workers,
- ustaw odpowiednie bindingi dla D1 / R2, jeśli są używane,
- ustaw zmienne środowiskowe, w tym `NEXT_PUBLIC_SITE_URL`,
- podaj domenę główną i sprawdź redirecty oraz politykę SSL.

Przykładowe zmienne środowiskowe:

```bash
NEXT_PUBLIC_SITE_URL=https://krd-ig.com.pl
```

### 2. Vercel

1. Zaloguj się do Vercel.
2. Importuj repozytorium.
3. Wybierz framework: Next.js / Vite-compatible setup.
4. Ustaw zmienne środowiskowe.
5. Uruchom wdrożenie i sprawdź podstrony oraz Open Graph.

### 3. Inny hosting

Na dowolnym hostingu z obsługą Node.js:

- uruchom `pnpm install`
- uruchom `pnpm build`
- wystaw folder `dist` lub uruchom odpowiedni proces serwera zgodnie z wybranym hostingiem
- upewnij się, że domena ma poprawny SSL i strony są dostępne po HTTPS

## SEO i meta

Projekt zawiera podstawowe ustawienia meta dla stron głównych i Open Graph w [app/layout.tsx](app/layout.tsx):

- tytuł strony,
- opis,
- `metadataBase`,
- `robots`,
- `openGraph`,
- `twitter`.

Dla produkcji warto dodatkowo dodać:

- dedykowane meta tagi dla kluczowych podstron,
- canonical URL dla każdej sekcji,
- ogólne statystyki SEO i monitorowanie w Google Search Console,
- opis i nagłówki dla każdej podstrony tematycznej.

## Finalna checklista przed deployem

Przed wdrożeniem warto zweryfikować następujące elementy:

- [ ] build produkcyjny przechodzi bez błędów (`pnpm build`)
- [ ] wszystkie kluczowe podstrony zwracają status `200` w środowisku produkcyjnym
- [ ] tytuły i opisy SEO są unikalne i zgodne z treścią każdej sekcji
- [ ] canonical URL i Open Graph są poprawnie ustawione dla głównej domeny oraz podstron
- [ ] menu i linki prowadzą do istniejących ścieżek, w tym do sekcji zapytań ofertowych
- [ ] sekcje: `Aktualności`, `Zapytania ofertowe`, `Dokumenty`, `Baza wiedzy` mają spójną strukturę i czytelne nazwy
- [ ] prawa autorskie / linki do polityki prywatności i cookies są aktywne
- [ ] adres e-mail, telefon i dane kontaktowe są poprawne i aktualne
- [ ] zmienna `NEXT_PUBLIC_SITE_URL` jest ustawiona na docelową domenę produkcyjną
- [ ] bindingi Cloudflare / dostęp do D1/R2 są poprawnie podpięte, jeśli są używane
- [ ] domena ma aktywny SSL / HTTPS oraz poprawnie ustawione redirecty
- [ ] włączone są podstawowe narzędzia monitorowania: Google Search Console, analytics, logi błędów
- [ ] po deployu przeprowadzono testy ręczne na głównych podstronach i w przeglądarce mobilnej

## Struktura projektu

- `app/` — widoki i układy strony
- `app/components/` — komponenty layoutu i sekcji
- `app/lib/` — dane i logika serwisu
- `db/` — konfiguracja bazy danych
- `public/` — pliki statyczne i grafiki
- `worker/` — worker Cloudflare
- `dist/` — build produkcyjny

## Uwagi wdrożeniowe

- w docelowym środowisku należy zweryfikować realne odnośniki do dokumentów i aktualności,
- domena prod powinna mieć poprawnie ustawione `NEXT_PUBLIC_SITE_URL`,
- warto dodać monitoring błędów i analitykę po wdrożeniu,
- podstrony o charakterze informacyjnym powinny mieć osobne opisy SEO, jeśli to będzie realizowane na głównej domenie.

## Status

Projekt jest w stanie gotowym do wdrożenia i testów produkcyjnych. Został sprawdzony pod kątem kompilacji i builda.
