import type { Metadata } from "next";
import { pagesFor } from "../lib/content";
import { Arrow, PageShell } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Członkostwo",
  description:
    "Dołącz do KRD-IG i korzystaj z sieci kontaktów, wsparcia eksperckiego, analiz rynku i działań na rzecz rozwoju branży drobiarskiej.",
  alternates: {
    canonical: "https://krd-ig.com.pl/czlonkostwo",
  },
  keywords: [
    "członkostwo w KRD-IG",
    "organizacja branżowa",
    "drobiarstwo",
    "wsparcie dla firm",
    "KRD-IG",
  ],
  openGraph: {
    title: "Członkostwo | KRD-IG",
    description:
      "Zostań członkiem KRD-IG i korzystaj z praktycznej pomocy, reprezentacji interesów i kontaktów branżowych.",
    url: "https://krd-ig.com.pl/czlonkostwo",
    type: "website",
  },
};

const benefits = [
  "Wpływ na wykorzystanie środków Funduszu Promocji Mięsa Drobiowego",
  "Dostęp do wiedzy, doświadczenia ekspertów i analiz rynkowych",
  "Najnowsze informacje o rynku, regulacjach i handlu zagranicznym",
  "Promocja produktów na krajowych i międzynarodowych targach",
  "Udział w misjach handlowych dedykowanych branży drobiarskiej",
];

export default function MembershipPage() {
  const details = pagesFor([
    "korzysci-z-czlonkostwa",
    "dolacz-do-nas",
    "dla-czlonkow",
    "czlonkowie",
  ]);

  return (
    <PageShell>
      <section className="membership-hero">
        <div className="shell membership-hero-grid">
          <div>
            <p className="eyebrow eyebrow-light">Członkostwo KRD-IG</p>
            <h1>Twórzmy silną branżę wspólnie</h1>
            <p>
              Izba zaprasza przedsiębiorców reprezentujących wszystkie ogniwa
              sektora drobiarskiego — od hodowli i wylęgu po przetwórstwo,
              pasze, naukę i usługi wspierające produkcję.
            </p>
            <a className="button button-white" href="/kontakt">
              Skontaktuj się z Izbą <Arrow />
            </a>
          </div>
          <img src="/media/white-hen.jpg" alt="Biała kura" />
        </div>
      </section>
      <section className="benefit-section">
        <div className="shell benefit-grid">
          <div className="section-intro">
            <p className="eyebrow">Dlaczego warto</p>
            <h2>Realny wpływ i praktyczne wsparcie</h2>
          </div>
          <ol>
            {benefits.map((benefit, index) => (
              <li key={benefit}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {benefit}
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="membership-details">
        <div className="shell directory-grid">
          {details.map((page) => (
            <article className="directory-card" key={page.slug}>
              <h3>{page.title}</h3>
              <p>{page.excerpt}</p>
              <a href={`/tresc/${page.slug}`}>
                Szczegóły <Arrow />
              </a>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
