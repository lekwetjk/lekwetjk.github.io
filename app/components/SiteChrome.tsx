import { primaryNavigation } from "../lib/content";
import { withBasePath } from "../lib/basePath";
import { ChatWidget } from "./ChatWidget";

type SiteLanguage = "pl" | "en";

const englishPrimaryNavigation = [
  { href: "/en/about", label: "ABOUT" },
  { href: "/aktualnosci", label: "NEWS" },
  { href: "/en/market", label: "MARKET" },
  { href: "/en/quality", label: "QUALITY" },
  { href: "/en/library", label: "KNOWLEDGE" },
  { href: "/baza-wiedzy", label: "DOCUMENTS" },
  { href: "/en/membership", label: "MEMBERSHIP" },
];

const englishFooterLinks = {
  service: [
    { href: "/en/about", label: "About us" },
    { href: "/en/market", label: "Market" },
    { href: "/en/quality", label: "Quality" },
    { href: "/aktualnosci", label: "News" },
    { href: "/en/membership", label: "Membership" },
  ],
  info: [
    { href: "/en/library", label: "Knowledge library" },
    { href: "/baza-wiedzy", label: "Documents" },
    { href: "/en/contact", label: "Contact" },
    { href: "/en/privacy", label: "Privacy policy" },
    { href: "/en/cookies", label: "Cookie policy" },
  ],
};

export function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      ↗
    </span>
  );
}

export function Brand({
  inverse = false,
  language = "pl" as SiteLanguage,
}: {
  inverse?: boolean;
  language?: SiteLanguage;
}) {
  const isEnglish = language === "en";
  const logoSrc = "/media/logo-krd-ig.svg";

  if (isEnglish) {
    return (
      <a
        className={`brand brand-en ${inverse ? "brand-en-inverse" : ""}`}
        href={withBasePath("/")}
        aria-label="National Poultry Council - Chamber of Commerce — home"
      >
        <span
          className="brand-en-mark"
          aria-hidden="true"
          style={{ backgroundImage: `url(${withBasePath(logoSrc)})` }}
        />
        <span className="brand-en-divider" aria-hidden="true" />
        <span className="brand-en-wordmark">
          <span>NATIONAL POULTRY COUNCIL</span>
          <span>CHAMBER OF COMMERCE</span>
        </span>
      </a>
    );
  }

  return (
    <a
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      href={withBasePath("/")}
      aria-label="KRD-IG — strona główna"
    >
      <img src={withBasePath(logoSrc)} alt="KRD-IG" />
    </a>
  );
}

export function SiteHeader({ language = "pl" as SiteLanguage }) {
  const isEnglish = language === "en";
  const navItems = isEnglish ? englishPrimaryNavigation : primaryNavigation;
  const altLinkHref = isEnglish ? withBasePath("/") : withBasePath("/en");
  const langFlagSrc = isEnglish ? "/media/flags/pl.svg" : "/media/flags/uk.svg";

  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-inner">
          <p>{isEnglish ? "National Poultry Council - Chamber of Commerce" : "Krajowa Rada Drobiarstwa — Izba Gospodarcza"}</p>
          <nav aria-label={isEnglish ? "Utility navigation" : "Nawigacja pomocnicza"}>
            {isEnglish ? (
              <>
                <a href={withBasePath("/aktualnosci")}>NEWS</a>
                <a href={withBasePath("/baza-wiedzy")}>DOCUMENTS</a>
                <a href={withBasePath("/en/contact")}>CONTACT</a>
              </>
            ) : (
              <>
                <a href={withBasePath("/dezinformacja")}>DEZINFORMACJA</a>
                <a href={withBasePath("/tresc/kampanie")}>KAMPANIE</a>
                <a href={withBasePath("/dokumenty")}>DOKUMENTY</a>
                <a href={withBasePath("/kontakt")}>KONTAKT</a>
              </>
            )}
            <a
              className="utility-social-link"
              href="https://x.com/krd_ig"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KRD-IG on X"
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
              href={altLinkHref}
              lang={isEnglish ? "pl" : "en"}
              aria-label={isEnglish ? "Polska wersja" : "English version"}
            >
              <img src={withBasePath(langFlagSrc)} alt="" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand language={language} />
          <nav className="desktop-nav" aria-label={isEnglish ? "Main navigation" : "Główna nawigacja"}>
            {navItems.map((item) => (
              <a href={withBasePath(item.href)} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="button button-primary header-cta" href={withBasePath(isEnglish ? "/en/membership" : "/czlonkostwo")}>
            {isEnglish ? "Membership" : "Członkostwo"} <Arrow />
          </a>
          <details className="mobile-menu">
            <summary aria-label={isEnglish ? "Open menu" : "Otwórz menu"}>
              <span />
              <span />
            </summary>
            <nav aria-label={isEnglish ? "Mobile navigation" : "Nawigacja mobilna"}>
              {navItems.map((item) => (
                <a href={withBasePath(item.href)} key={item.href}>
                  {item.label}
                </a>
              ))}
              <a href={withBasePath(isEnglish ? "/en/about" : "/dezinformacja")}>{isEnglish ? "ABOUT" : "DEZINFORMACJA"}</a>
              <a href={withBasePath(isEnglish ? "/baza-wiedzy" : "/dokumenty")}>{isEnglish ? "DOCUMENTS" : "DOKUMENTY"}</a>
              <a href={withBasePath(isEnglish ? "/en/membership" : "/czlonkostwo")}>{isEnglish ? "MEMBERSHIP" : "CZŁONKOSTWO"}</a>
              <a href={withBasePath(isEnglish ? "/en/contact" : "/kontakt")}>{isEnglish ? "CONTACT" : "KONTAKT"}</a>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ language = "pl" as SiteLanguage }) {
  const isEnglish = language === "en";
  const serviceLinks = isEnglish ? englishFooterLinks.service : [
    { href: "/o-izbie", label: "O Izbie" },
    { href: "/rynek", label: "Rynek i handel" },
    { href: "/hodowla", label: "Hodowla i ocena" },
    { href: "/zrownowazony-rozwoj", label: "Jakość i rozwój" },
    { href: "/aktualnosci", label: "Aktualności" },
    { href: "/zapytania-ofertowe", label: "Zapytania ofertowe" },
  ];
  const infoLinks = isEnglish ? englishFooterLinks.info : [
    { href: "/baza-wiedzy", label: "Baza wiedzy" },
    { href: "/dokumenty", label: "Dokumenty i przetargi" },
    { href: "/czlonkostwo", label: "Członkostwo" },
    { href: "/tresc/polityka-prywatnosci", label: "Polityka prywatności" },
    { href: "/tresc/polityka-cookies", label: "Polityka cookies" },
  ];

  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div>
          <Brand inverse language={language} />
          <p className="footer-mission">
            {isEnglish
              ? "Partner and voice of the Polish poultry sector at home, in Europe and worldwide."
              : "Partner i głos polskiego sektora drobiarskiego w kraju, Europie i na świecie."}
          </p>
          <div className="footer-social" aria-label={isEnglish ? "KRD-IG social media" : "Media społecznościowe KRD-IG"}>
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
            <a
              className="footer-partner-link"
              href="https://dobrydrob.pl/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dobry Drób"
            >
              <img
                src="https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png"
                alt="Dobry Drób"
              />
            </a>
          </div>
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">{isEnglish ? "SITE" : "SERWIS"}</h2>
          {serviceLinks.map((item) => (
            <a href={withBasePath(item.href)} key={item.href}>{item.label}</a>
          ))}
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">{isEnglish ? "INFO" : "INFORMACJE"}</h2>
          {infoLinks.map((item) => (
            <a href={withBasePath(item.href)} key={item.href}>{item.label}</a>
          ))}
        </div>
        <div className="footer-column footer-contact">
          <h2 className="footer-section-title">{isEnglish ? "CONTACT" : "KONTAKT"}</h2>
          <a href="mailto:krd-ig@krd-ig.com.pl">krd-ig@krd-ig.com.pl</a>
          <a href="tel:+48228282389">+48 22 828 23 89</a>
          <address>
            {isEnglish ? "ul. Czackiego 3/5" : "ul. Czackiego 3/5"}
            <br />
            00-043 Warszawa
          </address>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>
          {isEnglish
            ? "© 2026 National Poultry Council - Chamber of Commerce"
            : "© 2026 Krajowa Rada Drobiarstwa — Izba Gospodarcza"}
        </p>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  language = "pl" as SiteLanguage,
}: {
  children: React.ReactNode;
  language?: SiteLanguage;
}) {
  return (
    <>
      <SiteHeader language={language} />
      <main>{children}</main>
      <ChatWidget />
      <SiteFooter language={language} />
    </>
  );
}
