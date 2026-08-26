import { isTenderPost, knowledgePages, newsPosts } from "./lib/content";
import { withBasePath } from "./lib/basePath";
import { Arrow, PageShell } from "./components/SiteChrome";

const latestNews = newsPosts.filter((post) => !isTenderPost(post)).slice(0, 4);

const romanPillarNumbers = ["I", "II", "III", "IV"];

const developmentPillars = [
  {
    icon: "shield",
    href: "/tresc/bezpieczenstwo-bialkowe",
    title: "Bezpieczeństwo białkowe",
    text: "Bezpieczeństwo białkowe to kluczowe zagadnienie dla polskiego drobiarstwa. W obliczu zagrożenia wprowadzenia zakazu importu soi GMO, będącej obecnie głównym źródłem białka w paszy, szukanie alternatywnych rozwiązań, które umniejszyłyby dodatkowo znaczenie importu komponentów pasz, jest jednym z naszych priorytetów.",
  },
  {
    icon: "leaf",
    href: "/tresc/jakosc-i-bezpieczenstwo",
    title: "Zrównoważony rozwój",
    text: "Polityka zrównoważonego rozwoju to podstawowy cel branży drobiarskiej w Unii Europejskiej. Zachowanie oraz propagowanie standardów kontroli produkcji, dobrostanu zwierząt i ochrony środowiska sprawia, że drób z Polski utrzymuje niezwykle wysoką jakość. Dzięki nim tworzymy bezpieczne i atrakcyjne dla konsumentów produkty.",
  },
  {
    icon: "megaphone",
    href: "/tresc/promocja-drobiu",
    title: "Wizerunek i promocja",
    text: "Podaż w branży drobiarskiej bywa nierzadko większa od popytu, a jego spontaniczny wzrost jest mało prawdopodobny. By rozszerzać rynek zbytu potrzeba wspólnej strategii promowania drobiu jako żywności i ochrony wizerunku całej branży. Musimy przekonywać krajowych i zagranicznych konsumentów do zwiększenia spożycia drobiu.",
  },
  {
    icon: "globe",
    href: "/tresc/globalizacja-rynku",
    title: "Globalizacja rynku",
    text: "Polska jest obecnie największym producentem drobiu w UE. Należy także do czołówki eksporterów. Musimy wspólnie szukać nowych rynków zbytu i globalnie promować wysokie europejskie standardy produkcji. Właśnie one są podstawą przewagi konkurencyjnej polskiego drobiu na świecie. Polski drób jest już ceniony w Azji i Afryce.",
  },
];

function PillarIcon({ name }: { name: string }) {
  switch (name) {
    case "shield":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 6 38 11.5V22c0 9.4-6.2 16.8-14 20-7.8-3.2-14-10.6-14-20V11.5L24 6Z" />
          <path d="m18.5 24 3.8 3.8 7.7-8" />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M36 12c-12.2 0-22 9.8-22 22 0 1.7.2 3.4.6 5C24 38.6 33.4 31.8 37.5 18.6 33.8 22.5 28.4 25 22 25" />
          <path d="M16 34c4.7-4.4 10.3-8.2 18-10" />
        </svg>
      );
    case "megaphone":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M9 25h9l18-9v16l-18-9H9v2l7 4-1 7h5l1-5 6 3V18l-6 3-1-5h-5l1 7-7 4v-2Z" />
          <path d="M35 18c2 1.2 3 3 3 6s-1 4.8-3 6" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="16" />
          <path d="M8 24h32" />
          <path d="M24 8c4.5 4.5 7 9.7 7 16s-2.5 11.5-7 16c-4.5-4.5-7-9.7-7-16s2.5-11.5 7-16Z" />
        </svg>
      );
    default:
      return null;
  }
}

const pathways = [
  {
    href: "/rynek",
    index: "01",
    title: "Rynek i handel",
    text: "Dane, raporty, eksport, Unia Europejska i rynki eksportowe.",
  },
  {
    href: "/hodowla",
    index: "02",
    title: "Hodowla i ocena",
    text: "Księgi, rejestry, metodyka, wstawienia i certyfikacja.",
  },
  {
    href: "/zrownowazony-rozwoj",
    index: "03",
    title: "Jakość i rozwój",
    text: "QAFP, bezpieczeństwo produkcji, dobrostan i środowisko.",
  },
  {
    href: "/dezinformacja",
    index: "04",
    title: "Rzetelnie o drobiu",
    text: "Fakty, materiały edukacyjne i przeciwdziałanie manipulacji.",
  },
];

export default function Home() {
  return (
    <PageShell>
      <section className="home-hero">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">Wspólny głos polskiego drobiarstwa</p>
            <h1>
              Partner branży -
              <br />
              <em>Głos sektora.</em>
            </h1>
            <p>
              Reprezentujemy producentów, hodowców i przetwórców. Wspieramy
              zrównoważoną produkcję, rozwój eksportu oraz rzetelną wiedzę o
              polskim drobiu.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={withBasePath("/o-izbie")}>
                Poznaj KRD-IG <Arrow />
              </a>
              <a className="button button-quiet" href={withBasePath("/aktualnosci")}>
                Najnowsze informacje
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="home-stats" aria-label="Polski drób w liczbach">
        <div className="shell">
          <div className="stats-grid">
            <div className="stats-title">
              <p className="eyebrow eyebrow-light">Rynek</p>
              <h2>Polski drób ma światową skalę</h2>
            </div>
            <div>
              <strong>№ 1</strong>
              <p>producent mięsa drobiowego w Unii Europejskiej</p>
            </div>
            <div>
              <strong>2,4 mln ton*</strong>
              <p>eksportu mięsa i przetworów drobiowych</p>
            </div>
            <div>
              <strong>6,2 mld €*</strong>
              <p>wartości eksportu drobiu i jego przetworów</p>
            </div>
          </div>
          <p className="stats-footnote">* dane za 2025 r.</p>
        </div>
      </section>

      <section className="pillars-section" aria-labelledby="pillars-title">
        <div className="shell">
          <div className="section-intro intro-row pillars-intro">
            <div>
              <p className="eyebrow">Cztery filary rozwoju</p>
              <h2 id="pillars-title">
                <span>CZTERY FILARY ROZWOJU</span>
                <span>POLSKIEGO DROBIARSTWA</span>
              </h2>
            </div>
          </div>
          <div className="pillars-grid">
            {developmentPillars.map((pillar, index) => (
              <article
                className={`pillar-card pillar-card--${pillar.icon}`}
                key={pillar.title}
              >
                <div className="pillar-card-top">
                  <span className="pillar-number">{romanPillarNumbers[index]}</span>
                  <span className="pillar-icon" aria-hidden="true">
                    <PillarIcon name={pillar.icon} />
                  </span>
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
                <a href={withBasePath(pillar.href)}>
                  Zobacz więcej <Arrow />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pathways">
        <div className="shell">
          <div className="section-intro intro-row">
            <div>
              <p className="eyebrow">Najważniejsze obszary</p>
              <h2>Wszystkie informacje na wyciągnięcie ręki</h2>
            </div>
            <p>
              Czytelne ścieżki do danych, dokumentów i wiedzy.
            </p>
          </div>
          <div className="pathway-grid">
            {pathways.map((pathway) => (
              <a href={withBasePath(pathway.href)} className="pathway-card" key={pathway.href}>
                <span>{pathway.index}</span>
                <h3>{pathway.title}</h3>
                <p>{pathway.text}</p>
                <Arrow />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="photo-story">
        <div className="shell photo-story-grid">
          <img
            src={withBasePath("/media/meat-drumsticks.webp")}
            alt="Elementy mięsa drobiowego z przyprawami"
          />
          <div className="photo-story-copy">
            <p className="eyebrow eyebrow-light">Od hodowli do konsumenta</p>
            <h2>Jakość, bezpieczeństwo i odpowiedzialność</h2>
            <p>
              Polski sektor łączy nowoczesne zakłady, weterynarię,
              systemy jakości, troskę o dobrostan oraz konkurencyjność na
              rynkach zagranicznych.
            </p>
            <a className="text-link-light" href={withBasePath("/zrownowazony-rozwoj")}>
              Poznaj standardy produkcji <Arrow />
            </a>
          </div>
        </div>
      </section>

      <section className="latest-section">
        <div className="shell">
          <div className="section-intro intro-row">
            <div>
              <p className="eyebrow">Aktualności</p>
              <h2>W centrum wydarzeń</h2>
            </div>
            <a className="button button-outline" href={withBasePath("/aktualnosci")}>
              Pełne archiwum <Arrow />
            </a>
          </div>
          <div className="latest-grid">
            {latestNews.map((post) => (
              <article className="latest-card" key={post.slug}>
                {post.image && (
                  <img
                    src={withBasePath(post.image)}
                    alt=""
                    loading="lazy"
                    className={
                      post.slug === "polska-odzyskala-status-kraju-wolnego-od-grypy-ptakow-2026"
                        ? "latest-card-image-contain"
                        : undefined
                    }
                  />
                )}
                <div>
                  <p className="latest-meta">
                    {new Intl.DateTimeFormat("pl-PL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(post.date))}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <a href={withBasePath(`/aktualnosci/${post.slug}`)}>
                    Czytaj dalej <Arrow />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="knowledge-feature">
        <div className="shell knowledge-feature-grid">
          <div className="knowledge-gallery">
            <img src={withBasePath("/media/meat-duck.webp")} alt="Świeże mięso kacze" />
            <img src={withBasePath("/media/meat-fillet.webp")} alt="Filet drobiowy" />
            <img
              src={withBasePath("/media/healthy-poultry.webp")}
              alt="Mięso drobiowe i świeże składniki"
            />
          </div>
          <div className="knowledge-copy">
            <p className="eyebrow">Kompletna baza informacji</p>
            <h2>{knowledgePages.length + newsPosts.length} materiały w jednej strukturze</h2>
            <p>
              Serwis obejmuje wszystkie strony tematyczne oraz całe archiwum
              komunikatów, wydarzeń, stanowisk, kampanii i zapytań ofertowych
              dostępnych w obecnej witrynie.
            </p>
            <a className="button button-primary" href={withBasePath("/baza-wiedzy")}>
              Otwórz bazę wiedzy <Arrow />
            </a>
          </div>
        </div>
      </section>

      <section className="membership-cta">
        <div className="shell membership-cta-grid">
          <div>
            <p className="eyebrow eyebrow-light">Członkostwo</p>
            <h2>Razem mamy większy wpływ</h2>
          </div>
          <div>
            <p>
              Dołącz do przedsiębiorców, którzy wspólnie kształtują przyszłość
              polskiego sektora drobiarskiego.
            </p>
            <a className="button button-white" href={withBasePath("/czlonkostwo")}>
              Poznaj korzyści <Arrow />
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
