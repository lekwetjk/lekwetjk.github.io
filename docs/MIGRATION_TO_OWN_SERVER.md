# Migracja na wlasny serwer i domene

## Stan obecny

Aplikacja dziala jako Cloudflare Worker z baza D1 i bucketem R2. GitHub Pages moze hostowac tylko publiczna, statyczna czesc strony; logowanie, panel administratora, dokumenty i API wymagaja backendu.

## Zalecany wariant

Najmniej ryzykowna migracja to standardowy serwer Next.js na VPS oraz uslugi zarzadzane:

- VPS z Ubuntu 24.04 i Caddy lub Nginx,
- PostgreSQL zarzadzany przez Neon albo Supabase,
- bucket S3-compatible dla dokumentow, np. Cloudflare R2, Backblaze B2, Wasabi lub MinIO,
- DNS domeny `krd-ig.com.pl` kierujacy na nowy serwer po testach.

Nie przenos samego katalogu `dist` na serwer. Ten projekt korzysta z D1, R2 i Cloudflare Worker runtime, wiec najpierw trzeba zastapic te integracje adapterami PostgreSQL/S3 oraz przejsc na standardowy output Next.js.

## Przed migracja

1. Ustal publiczny adres docelowy: `https://krd-ig.com.pl`.
2. Utworz staging, np. `https://staging.krd-ig.com.pl`.
3. Wygeneruj nowy, losowy sekret sesji `AUTH_SECRET` o dlugosci co najmniej 32 bajtow.
4. Wyeksportuj dane D1 i R2 oraz zapisz je poza repozytorium.
5. Usun poufne dokumenty z `private/member-docs` przed udostepnieniem repozytorium osobom trzecim.
6. Przygotuj kopie rekordow DNS, w szczegolnosci MX, SPF, DKIM i DMARC.

## Backup Cloudflare

Uruchom z zalogowanego terminala:

```powershell
npx wrangler d1 export site-creator-d1 --remote --output backup/d1.sql
```

Dokumenty z bucketu `krd-ig-member-documents` wyeksportuj przez panel R2 lub narzedzie S3-compatible. Sprawdz, czy backup zawiera konta, profile, logotypy i dokumenty przed zmiana DNS.

## Serwer

1. Utworz VPS z Ubuntu 24.04 i publicznym IPv4.
2. Dodaj klucz SSH; nie wlaczaj logowania haslem dla roota.
3. Zainstaluj Docker Engine oraz Docker Compose.
4. Uruchom aplikacje i PostgreSQL/S3 na stagingu.
5. Ustaw sekrety tylko na serwerze lub w menedzerze sekretow:

```text
AUTH_SECRET=<losowy-sekret>
DATABASE_URL=<postgres-url>
S3_ENDPOINT=<endpoint-bucketa>
S3_BUCKET=krd-ig-member-documents
S3_ACCESS_KEY_ID=<klucz>
S3_SECRET_ACCESS_KEY=<sekret>
NEXT_PUBLIC_SITE_URL=https://staging.krd-ig.com.pl
```

6. Przed ruchem produkcyjnym przetestuj logowanie, reset hasla, upload dokumentu, pobieranie dokumentu i panel administratora.

## Zmiany aplikacji wymagane przed Node deployem

1. Usun `output: "export"` i Vinext/Cloudflare Vite plugin z produkcyjnego builda.
2. Zastap `drizzle-orm/d1` adapterem PostgreSQL.
3. Zastap binding `MEMBER_DOCUMENTS` klientem S3-compatible.
4. Zastap globalne `env` adapterem konfiguracji serwera.
5. Ustaw rate limiting w Redisie albo PostgreSQL, nie w pamieci procesu.
6. Wymagaj `AUTH_SECRET` w produkcji i usun domyslne konta testowe z produkcyjnego fallbacku.
7. Ustaw jeden kanoniczny URL, sitemap i `robots.txt` na `https://krd-ig.com.pl`.
8. Zostaw tylko jeden workflow CI/CD; GitHub Pages powinien zostac wylaczony po przejsciu na wlasny serwer.

## Przelaczenie domeny

1. Zmniejsz TTL rekordow A/AAAA do 300 sekund na 24 godziny przed przelaczeniem.
2. Skonfiguruj certyfikat TLS na stagingu i produkcji.
3. Zaimportuj swiezy backup danych do PostgreSQL/S3.
4. Wykonaj koncowy test na stagingu.
5. Zmien rekord A/AAAA `krd-ig.com.pl` i `www` na IP nowego serwera.
6. Ustaw przekierowanie `www` do domeny glownej.
7. Monitoruj logi, bledy 4xx/5xx i logowanie przez pierwsze 24 godziny.

## Rollback

Nie usuwaj starego Workera ani bazy D1 przez co najmniej 14 dni. W razie problemu przywroc poprzednie rekordy DNS i przeanalizuj logi ze stagingu przed kolejna proba.