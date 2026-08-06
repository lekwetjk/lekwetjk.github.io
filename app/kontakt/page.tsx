import type { Metadata } from "next";
import { Arrow, PageShell } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Skontaktuj się z KRD-IG — biurem w Warszawie, działem hodowli i oceny drobiu w Poznaniu oraz przedstawicielstwem w Chinach.",
  alternates: {
    canonical: "https://krd-ig.com.pl/kontakt",
  },
  keywords: [
    "kontakt KRD-IG",
    "Warszawa drobiarstwo",
    "Poznań hodowla drobiu",
    "biuro KRD-IG",
    "kontakt z izbą drobiarską",
  ],
  openGraph: {
    title: "Kontakt | KRD-IG",
    description:
      "Adresy, numery telefonów i adresy e-mail KRD-IG — kontakt z organizacją branżową i zespołem merytorycznym.",
    url: "https://krd-ig.com.pl/kontakt",
    type: "website",
  },
};

const people = [
  ["Dariusz Goszczyński", "Prezes Zarządu, Dyrektor Generalny", "d.goszczynski@krd-ig.pl"],
  ["Marta Kędel", "Zastępca Dyrektora Generalnego", "m.kedel@krd-ig.pl"],
  ["lek. wet. Jakub Kubacki", "Dyrektor ds. weterynarii i zrównoważonej produkcji", "j.kubacki@krd-ig.pl"],
  ["Eugeniusz Wencek", "Kierownik Działu Hodowli i Oceny Drobiu", "e.wencek@krd-ig.pl"],
  ["Emilia Smolińska", "Główny Specjalista ds. Administracji i Rozliczeń", "e.smolinska@krd-ig.pl"],
  ["Iwona Kałużna", "Główny Specjalista ds. Hodowli i Oceny Drobiu", "poznan@krd-ig.pl"],
  ["Marta Baranowska", "Specjalista ds. Kadr i Płac", "m.kopytowska@krd-ig.pl"],
];

export default function ContactPage() {
  return (
    <PageShell>
      <section className="contact-hero">
        <div className="shell">
          <p className="eyebrow eyebrow-light">Kontakt</p>
          <h1>Jesteśmy do dyspozycji branży</h1>
        </div>
      </section>
      <section className="contact-offices">
        <div className="shell office-grid">
          <article>
            <p className="eyebrow">Warszawa</p>
            <h2>Krajowa Rada Drobiarstwa — Izba Gospodarcza</h2>
            <address>
              ul. Czackiego 3/5, 00-043 Warszawa
              <br />
              <a href="tel:+48228282389">+48 22 828 23 89</a>
              <br />
              <a href="mailto:krd-ig@krd-ig.com.pl">krd-ig@krd-ig.com.pl</a>
            </address>
          </article>
          <article>
            <p className="eyebrow">Poznań</p>
            <h2>Dział Hodowli i Oceny Drobiu</h2>
            <address>
              ul. Naramowicka 144, 60-975 Poznań
              <br />
              <a href="tel:+48618242651">+48 61 824 26 51/52/53</a>
              <br />
              <a href="mailto:poznan@krd-ig.pl">poznan@krd-ig.pl</a>
            </address>
          </article>
          <article>
            <p className="eyebrow">Szanghaj</p>
            <h2>Przedstawicielstwo KRD-IG w Chinach</h2>
            <address>
              Room 513, Block A WOLICITY, Hunan Road, Pudong, Shanghai
              <br />
              <a href="tel:02120233900">021-20233900</a>
              <br />
              <a href="mailto:maciej@krd-ig.com.cn">maciej@krd-ig.com.cn</a>
            </address>
          </article>
        </div>
      </section>
      <section className="team-section">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Zespół</p>
            <h2>Kontakty merytoryczne</h2>
          </div>
          <div className="team-grid">
            {people.map(([name, role, email]) => (
              <article key={name}>
                <h3>{name}</h3>
                <p>{role}</p>
                <a href={`mailto:${email}`}>
                  {email} <Arrow />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
