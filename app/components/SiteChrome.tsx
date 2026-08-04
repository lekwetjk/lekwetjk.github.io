import { primaryNavigation } from "../lib/content";

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
      href="/"
      aria-label="KRD-IG — strona główna"
    >
      <img src="/media/logo-krd-ig.svg" alt="KRD-IG" />
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
            <a href="/dezinformacja">DEZINFORMACJA</a>
            <a href="/zapytania-ofertowe">ZAPYTANIA OFERTOWE</a>
            <a href="/dokumenty">DOKUMENTY</a>
            <a href="/kontakt">KONTAKT</a>
            <a href="https://krd-ig.com.pl/en/" lang="en">
              EN
            </a>
          </nav>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Główna nawigacja">
            {primaryNavigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="button button-primary header-cta" href="/czlonkostwo">
            Członkostwo <Arrow />
          </a>
          <details className="mobile-menu">
            <summary aria-label="Otwórz menu">
              <span />
              <span />
            </summary>
            <nav aria-label="Nawigacja mobilna">
              {primaryNavigation.map((item) => (
                <a href={item.href} key={item.href}>
                  {item.label}
                </a>
              ))}
              <a href="/dezinformacja">DEZINFORMACJA</a>
              <a href="/zapytania-ofertowe">ZAPYTANIA OFERTOWE</a>
              <a href="/dokumenty">DOKUMENTY</a>
              <a href="/czlonkostwo">CZŁONKOSTWO</a>
              <a href="/kontakt">KONTAKT</a>
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
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">SERWIS</h2>
          <a href="/o-izbie">O Izbie</a>
          <a href="/rynek">Rynek i handel</a>
          <a href="/hodowla">Hodowla i ocena</a>
          <a href="/zrownowazony-rozwoj">Jakość i rozwój</a>
          <a href="/aktualnosci">Aktualności</a>
          <a href="/zapytania-ofertowe">Zapytania ofertowe</a>
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">INFORMACJE</h2>
          <a href="/baza-wiedzy">Baza wiedzy</a>
          <a href="/dokumenty">Dokumenty i przetargi</a>
          <a href="/czlonkostwo">Członkostwo</a>
          <a href="/tresc/polityka-prywatnosci">Polityka prywatności</a>
          <a href="/tresc/polityka-cookies">Polityka cookies</a>
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
      <SiteFooter />
    </>
  );
}
