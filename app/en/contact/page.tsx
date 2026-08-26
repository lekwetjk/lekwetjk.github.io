import type { Metadata } from "next";
import { Arrow, PageShell } from "../../components/SiteChrome";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the National Poultry Council - Chamber of Commerce office in Warsaw, the poultry breeding and evaluation department in Poznan and the representation in China.",
  alternates: {
    canonical: "https://krd-ig.com.pl/en/contact",
  },
};

const people = [
  ["Dariusz Goszczynski", "President of the Management Board, General Director", "d.goszczynski@krd-ig.pl"],
  ["Marta Kedel", "Deputy General Director", "m.kedel@krd-ig.pl"],
  ["Jakub Kubacki, DVM", "Director of Veterinary Affairs and Sustainable Production", "j.kubacki@krd-ig.pl"],
  ["Eugeniusz Wencek", "Head of the Poultry Breeding and Evaluation Department", "e.wencek@krd-ig.pl"],
  ["Emilia Smolinska", "Chief Specialist for Administration and Settlements", "e.smolinska@krd-ig.pl"],
  ["Iwona Kaluzna", "Chief Specialist for Poultry Breeding and Evaluation", "poznan@krd-ig.pl"],
  ["Marta Baranowska", "Human Resources and Payroll Specialist", "m.kopytowska@krd-ig.pl"],
];

export default function EnglishContactPage() {
  return (
    <PageShell language="en">
      <section className="contact-hero">
        <div className="shell">
          <p className="eyebrow eyebrow-light">Contact</p>
          <h1>We are here for the industry</h1>
        </div>
      </section>
      <section className="contact-offices">
        <div className="shell office-grid">
          <article>
            <p className="eyebrow">Warsaw</p>
            <h2>National Poultry Council - Chamber of Commerce</h2>
            <address>
              ul. Czackiego 3/5, 00-043 Warsaw
              <br />
              <a href="tel:+48228282389">+48 22 828 23 89</a>
              <br />
              <a href="mailto:krd-ig@krd-ig.com.pl">krd-ig@krd-ig.com.pl</a>
            </address>
          </article>
          <article>
            <p className="eyebrow">Poznan</p>
            <h2>Poultry Breeding and Evaluation Department</h2>
            <address>
              ul. Naramowicka 144, 60-975 Poznan
              <br />
              <a href="tel:+48618242651">+48 61 824 26 51/52/53</a>
              <br />
              <a href="mailto:poznan@krd-ig.pl">poznan@krd-ig.pl</a>
            </address>
          </article>
          <article>
            <p className="eyebrow">Shanghai</p>
            <h2>KRD-IG Representation in China</h2>
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
            <p className="eyebrow">Team</p>
            <h2>Expert contacts</h2>
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
