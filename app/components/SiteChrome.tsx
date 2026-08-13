import { primaryNavigation } from "../lib/content";
import { withBasePath } from "../lib/basePath";
import { ChatWidget } from "./ChatWidget";

export function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      ↗
    </span>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      href={withBasePath("/")}
      aria-label="KRD-IG — strona główna"
    >
      <img src={withBasePath("/media/logo-krd-ig.svg")} alt="KRD-IG" />
    </a>
  );
}

export function SiteHeader() {
  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-inner">
          <p>Krajowa Rada Drobiarstwa — Izba Gospodarcza</p>
          <nav aria-label="Nawigacja pomocnicza">
            <a href={withBasePath("/dezinformacja")}>DEZINFORMACJA</a>
            <a href={withBasePath("/tresc/kampanie")}>KAMPANIE</a>
            <a href={withBasePath("/dokumenty")}>DOKUMENTY</a>
            <a href={withBasePath("/kontakt")}>KONTAKT</a>
            <a
              className="utility-social-link"
              href="https://x.com/krd_ig"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KRD-IG na X"
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M18.9 2H22l-6.77 7.74L23 22h-6.1l-4.79-6.95L6.02 22H2.9l7.24-8.28L1 2h6.25l4.33 6.38L18.9 2Zm-1.07 18.15h1.69L6.33 3.76H4.5l13.33 16.39Z" />
              </svg>
            </a>
            <a
              className="utility-social-link"
              href="https://www.linkedin.com/company/krajowa-rada-drobiarstwa-izba-gospodarcza/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KRD-IG na LinkedIn"
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05c.53-1 1.82-2.05 3.75-2.05 4.02 0 4.77 2.64 4.77 6.08V21h-4v-5.53c0-1.32-.03-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.93V21h-4V9Z" />
              </svg>
            </a>
            <a
              className="utility-lang-link"
              href="https://krd-ig.com.pl/en/"
              lang="en"
              aria-label="English version"
            >
              <img src={withBasePath("/media/flags/uk.svg")} alt="" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Główna nawigacja">
            {primaryNavigation.map((item) => (
              <a href={withBasePath(item.href)} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="button button-primary header-cta" href={withBasePath("/czlonkostwo")}>
            Członkostwo <Arrow />
          </a>
          <details className="mobile-menu">
            <summary aria-label="Otwórz menu">
              <span />
              <span />
            </summary>
            <nav aria-label="Nawigacja mobilna">
              {primaryNavigation.map((item) => (
                <a href={withBasePath(item.href)} key={item.href}>
                  {item.label}
                </a>
              ))}
              <a href={withBasePath("/dezinformacja")}>DEZINFORMACJA</a>
              <a href={withBasePath("/dokumenty")}>DOKUMENTY</a>
              <a href={withBasePath("/czlonkostwo")}>CZŁONKOSTWO</a>
              <a href={withBasePath("/kontakt")}>KONTAKT</a>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div>
          <Brand inverse />
          <p className="footer-mission">
            Partner i głos polskiego sektora drobiarskiego w kraju, Europie i
            na świecie.
          </p>
          <div className="footer-social" aria-label="Media społecznościowe KRD-IG">
            <a
              className="footer-social-link"
              href="https://x.com/krd_ig"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KRD-IG na X"
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M18.9 2H22l-6.77 7.74L23 22h-6.1l-4.79-6.95L6.02 22H2.9l7.24-8.28L1 2h6.25l4.33 6.38L18.9 2Zm-1.07 18.15h1.69L6.33 3.76H4.5l13.33 16.39Z" />
              </svg>
            </a>
            <a
              className="footer-social-link"
              href="https://www.linkedin.com/company/krajowa-rada-drobiarstwa-izba-gospodarcza/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KRD-IG na LinkedIn"
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05c.53-1 1.82-2.05 3.75-2.05 4.02 0 4.77 2.64 4.77 6.08V21h-4v-5.53c0-1.32-.03-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.93V21h-4V9Z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">SERWIS</h2>
          <a href={withBasePath("/o-izbie")}>O Izbie</a>
          <a href={withBasePath("/rynek")}>Rynek i handel</a>
          <a href={withBasePath("/hodowla")}>Hodowla i ocena</a>
          <a href={withBasePath("/zrownowazony-rozwoj")}>Jakość i rozwój</a>
          <a href={withBasePath("/aktualnosci")}>Aktualności</a>
          <a href={withBasePath("/zapytania-ofertowe")}>Zapytania ofertowe</a>
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">INFORMACJE</h2>
          <a href={withBasePath("/baza-wiedzy")}>Baza wiedzy</a>
          <a href={withBasePath("/dokumenty")}>Dokumenty i przetargi</a>
          <a href={withBasePath("/czlonkostwo")}>Członkostwo</a>
          <a href={withBasePath("/tresc/polityka-prywatnosci")}>Polityka prywatności</a>
          <a href={withBasePath("/tresc/polityka-cookies")}>Polityka cookies</a>
        </div>
        <div className="footer-column footer-contact">
          <h2 className="footer-section-title">KONTAKT</h2>
          <a href="mailto:krd-ig@krd-ig.com.pl">krd-ig@krd-ig.com.pl</a>
          <a href="tel:+48228282389">+48 22 828 23 89</a>
          <address>
            ul. Czackiego 3/5
            <br />
            00-043 Warszawa
          </address>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>© 2026 Krajowa Rada Drobiarstwa — Izba Gospodarcza</p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <ChatWidget />
      <SiteFooter />
    </>
  );
}
