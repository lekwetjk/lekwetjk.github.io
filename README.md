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
