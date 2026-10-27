import { primaryNavigation } from "../lib/content";
import { withBasePath } from "../lib/basePath";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../lib/auth";
import MemberActivityTracker from "./MemberActivityTracker";

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

export function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      ↗
    </span>
  );
}

export function Brand({ inverse = false, language = "pl" }: { inverse?: boolean; language?: SiteLanguage }) {
  if (language === "en") {
    return (
      <a className={`brand brand-en ${inverse ? "brand-en-inverse" : ""}`} href={withBasePath("/en")} aria-label="National Poultry Council - Chamber of Commerce — home">
        <span className="brand-en-mark" aria-hidden="true" style={{ backgroundImage: `url(${withBasePath("/media/logo-krd-ig.svg")})` }} />
        <span className="brand-en-divider" aria-hidden="true" />
        <span className="brand-en-wordmark"><span>NATIONAL POULTRY COUNCIL</span><span>CHAMBER OF COMMERCE</span></span>
      </a>
    );
  }
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

export async function SiteHeader({ language = "pl" }: { language?: SiteLanguage }) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  const isEnglish = language === "en";
  const navItems = isEnglish ? englishPrimaryNavigation : primaryNavigation;
  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-inner">
          <p>{isEnglish ? "National Poultry Council - Chamber of Commerce" : "Krajowa Rada Drobiarstwa — Izba Gospodarcza"}</p>
          <nav aria-label={isEnglish ? "Utility navigation" : "Nawigacja pomocnicza"}>
            {isEnglish ? <>
              <a href={withBasePath("/aktualnosci")}>NEWS</a>
              <a href={withBasePath("/baza-wiedzy")}>DOCUMENTS</a>
              <a href={withBasePath("/en/contact")}>CONTACT</a>
            </> : <>
            <a href={withBasePath("/dezinformacja")}>DEZINFORMACJA</a>
            <a href={withBasePath("/tresc/kampanie")}>KAMPANIE</a>
            <a href={withBasePath("/dokumenty")}>DOKUMENTY</a>
            <a href={withBasePath("/kontakt")}>KONTAKT</a>
            </>}
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
              href={withBasePath(isEnglish ? "/" : "/en")}
              lang={isEnglish ? "pl" : "en"}
              aria-label={isEnglish ? "Polska wersja" : "English version"}
            >
              <img src={withBasePath(isEnglish ? "/media/flags/pl.svg" : "/media/flags/uk.svg")} alt="" aria-hidden="true" />
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
          <nav aria-label={isEnglish ? "Member account" : "Konto członka"} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
            {session ? <>
              <a href={withBasePath("/member/profil")}>{session.name || session.username}</a>
              {session.role === "admin" && <a href={withBasePath("/admin/uzytkownicy")}>Admin</a>}
              <form action="/member/logout" method="post" style={{ margin: 0 }}>
                <button type="submit">{isEnglish ? "Log out" : "Wyloguj"}</button>
              </form>
            </> : <a className="button button-primary header-cta" href={withBasePath("/login/czlonkowie")}>{isEnglish ? "LOG IN" : "ZALOGUJ"}</a>}
          </nav>
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
              {isEnglish ? <>
                <a href={withBasePath("/en/membership")}>MEMBERSHIP</a>
                <a href={withBasePath("/en/contact")}>CONTACT</a>
              </> : <>
              <a href={withBasePath("/dezinformacja")}>DEZINFORMACJA</a>
              <a href={withBasePath("/dokumenty")}>DOKUMENTY</a>
              <a href={withBasePath("/czlonkostwo")}>CZŁONKOSTWO</a>
              <a href={withBasePath("/kontakt")}>KONTAKT</a>
              </>}
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ language = "pl" }: { language?: SiteLanguage }) {
  const isEnglish = language === "en";
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div>
          <Brand inverse language={language} />
          <p className="footer-mission">
            {isEnglish ? "Partner and voice of the Polish poultry sector in Poland, Europe and worldwide." : "Partner i głos polskiego sektora drobiarskiego w kraju, Europie i na świecie."}
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
          <h2 className="footer-section-title">{isEnglish ? "WEBSITE" : "SERWIS"}</h2>
          {isEnglish ? englishPrimaryNavigation.filter((item) => item.label !== "DOCUMENTS").map((item) => <a key={item.href} href={withBasePath(item.href)}>{item.label}</a>) : <>
          <a href={withBasePath("/o-izbie")}>O Izbie</a>
          <a href={withBasePath("/rynek")}>Rynek i handel</a>
          <a href={withBasePath("/hodowla")}>Hodowla i ocena</a>
          <a href={withBasePath("/zrownowazony-rozwoj")}>Jakość i rozwój</a>
          <a href={withBasePath("/aktualnosci")}>Aktualności</a>
          <a href={withBasePath("/zapytania-ofertowe")}>Zapytania ofertowe</a>
          </>}
        </div>
        <div className="footer-column">
          <h2 className="footer-section-title">{isEnglish ? "INFORMATION" : "INFORMACJE"}</h2>
          {isEnglish ? <>
            <a href={withBasePath("/en/library")}>Knowledge library</a>
            <a href={withBasePath("/baza-wiedzy")}>Documents</a>
            <a href={withBasePath("/en/contact")}>Contact</a>
            <a href={withBasePath("/en/privacy")}>Privacy policy</a>
            <a href={withBasePath("/en/cookies")}>Cookie policy</a>
          </> : <>
          <a href={withBasePath("/baza-wiedzy")}>Baza wiedzy</a>
          <a href={withBasePath("/dokumenty")}>Dokumenty i przetargi</a>
          <a href={withBasePath("/czlonkostwo")}>Członkostwo</a>
          <a href={withBasePath("/tresc/polityka-prywatnosci")}>Polityka prywatności</a>
          <a href={withBasePath("/tresc/polityka-cookies")}>Polityka cookies</a>
          </>}
        </div>
        <div className="footer-column footer-contact">
          <h2 className="footer-section-title">{isEnglish ? "CONTACT" : "KONTAKT"}</h2>
          <a href="mailto:krd-ig@krd-ig.com.pl">krd-ig@krd-ig.com.pl</a>
          <a href="tel:+48228282389">+48 22 828 23 89</a>
          <address>
            ul. Czackiego 3/5
            <br />
            00-043 Warszawa
          </address>
          <a className="footer-partner-link" href="https://dobrydrob.pl/" target="_blank" rel="noopener noreferrer" aria-label="Dobry Drób">
            <img src="https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png" alt="Dobry Drób" loading="lazy" />
          </a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>© 2026 Krajowa Rada Drobiarstwa — Izba Gospodarcza</p>
      </div>
    </footer>
  );
}

export function PageShell({ children, language = "pl" }: { children: React.ReactNode; language?: SiteLanguage }) {
  return (
    <>
      <MemberActivityTracker />
      <SiteHeader language={language} />
      <main>{children}</main>
      <SiteFooter language={language} />
    </>
  );
}
