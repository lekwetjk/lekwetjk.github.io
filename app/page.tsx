import { isTenderPost, knowledgePages, newsPosts } from "./lib/content";
import { Arrow, PageShell } from "./components/SiteChrome";

const latestNews = newsPosts.filter((post) => !isTenderPost(post)).slice(0, 4);

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
              <a className="button button-primary" href="/o-izbie">
                Poznaj KRD-IG <Arrow />
              </a>
              <a className="button button-quiet" href="/aktualnosci">
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
              <strong>№ 1*</strong>
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
          <p className="stats-footnote">* Dane za 2025 rok.</p>
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
              <a href={pathway.href} className="pathway-card" key={pathway.href}>
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
            src="/media/meat-drumsticks.webp"
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
            <a className="text-link-light" href="/zrownowazony-rozwoj">
              Poznaj standardy produkcji <Arrow />
            </a>
          </div>
          <img
            src="/media/poultry-close.webp"
            alt="Biały kurczak w gospodarstwie"
          />
        </div>
      </section>

      <section className="latest-section">
        <div className="shell">
          <div className="section-intro intro-row">
            <div>
              <p className="eyebrow">Aktualności</p>
              <h2>W centrum wydarzeń</h2>
            </div>
            <a className="button button-outline" href="/aktualnosci">
              Pełne archiwum <Arrow />
            </a>
          </div>
          <div className="latest-grid">
            {latestNews.map((post) => (
              <article className="latest-card" key={post.slug}>
                {post.image && <img src={post.image} alt="" loading="lazy" />}
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
                  <a href={`/aktualnosci/${post.slug}`}>
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
            <img src="/media/meat-duck.webp" alt="Świeże mięso kacze" />
            <img src="/media/meat-fillet.webp" alt="Filet drobiowy" />
            <img
              src="/media/healthy-poultry.webp"
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
            <a className="button button-primary" href="/baza-wiedzy">
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
            <a className="button button-white" href="/czlonkostwo">
              Poznaj korzyści <Arrow />
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
