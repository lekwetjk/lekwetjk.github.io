import type { ContentLink } from "../lib/content";
import { Arrow } from "./SiteChrome";

function looksLikeHeading(value: string) {
  return (
    value.length < 110 &&
    !/[.!?]$/.test(value) &&
    value.split(/\s+/).length <= 12
  );
}

function stripEmailFromContact(contact: string) {
  return contact
    .replace(/\s*(?:·\s*)?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "")
    .replace(/\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type BoardPerson = {
  name: string;
  role: string;
  company: string;
  address: string;
  contact: string;
  email?: string;
};

const boardMembers: BoardPerson[] = [
  {
    name: "Dariusz Goszczyński",
    role: "Prezes Zarządu KRD-IG",
    company: "Krajowa Rada Drobiarstwa – Izba Gospodarcza",
    address: "",
    contact: "",
  },
  {
    name: "Tomasz Szulc",
    role: "Wiceprezes Zarządu KRD-IG",
    company: "Członek Zarządu Drobex sp. z o.o.",
    address: "ul. Powstańców 19, 86-050 Solec Kujawski",
    contact: "tel. (52) 387 61 03 · sekretariat@drobex.com.pl",
    email: "sekretariat@drobex.com.pl",
  },
  {
    name: "Adam Sojka",
    role: "Wiceprezes Zarządu KRD-IG",
    company: "Prezes Zarządu Grupy Drosed „Drosed” S.A.",
    address: "ul. Sokołowka 154, 08-110 Siedlce",
    contact: "tel. (25) 640-00-00 · sekretariat@drosed.com.pl",
    email: "sekretariat@drosed.com.pl",
  },
  {
    name: "Władysław Piasecki",
    role: "Przewodniczący Rady Izby",
    company: "Prezes Zarządu „BOMADEK” Sp. z o. o.",
    address: "ul. Słoneczna 16, 66-132 Trzebiechów",
    contact: "tel. (68) 351-41-29 · sekretariat@bomadek.pl",
    email: "sekretariat@bomadek.pl",
  },
  {
    name: "Marek Zagórski",
    role: "Wiceprzewodniczący Rady Izby",
    company: "Wipasz S.A.",
    address: "Fort Piłsudskiego 32, 02-704 Warszawa",
    contact: "tel. +48 887-071-217 · info@wipasz.pl",
    email: "info@wipasz.pl",
  },
  {
    name: "Krystyna Karkoszka",
    role: "Członek Rady Izby",
    company: "Prezes Zarządu OVOPOL sp. z o. o.",
    address: "ul. Wojska Polskiego 39, 67-100 Nowa Sól",
    contact: "tel. (68) 387-32-51 · ovopol@ovopol.pl",
    email: "ovopol@ovopol.pl",
  },
  {
    name: "Łukasz Dominiak",
    role: "Dyrektor ds. Public i Government Relations",
    company: "ANIMEX Foods Sp. z o. o. sp.k.",
    address: "ul. Chałubińskiego 8, 00-613 Warszawa",
    contact: "tel. (22) 334-59-00 · pr@animex.pl",
    email: "pr@animex.pl",
  },
  {
    name: "Zbigniew Stanisław Idziaszek",
    role: "Członek Rady Izby",
    company: "Prezes Zarządu IKO Kompania Drobiarska sp. z o.o.",
    address: "",
    contact: "tel. +48 885-500-116 · sekretariat@iko-kompania.com.pl",
    email: "sekretariat@iko-kompania.com.pl",
  },
  {
    name: "Ewa Izabella Pstrągowska – Niesiobędzka",
    role: "Członek Rady Izby",
    company: "P.P.U.H. „PROSPER” Sp. z o. o.",
    address: "ul. Warmińska 14, 14-105 Łukta, woj. warmińsko-mazurskie",
    contact: "tel. (89) 647-50-35 · prosper@prosper.biz.pl",
    email: "prosper@prosper.biz.pl",
  },
  {
    name: "Włodzimierz Franciszek Olszewski",
    role: "Członek Rady Izby",
    company: "Prezes Zarządu „FARMER” Sp. z o. o.",
    address: "ul. Jagielończyka 16/201, 14-200 Iława",
    contact: "tel. (89) 648-76-92 · biuro@farmer-ilawa.pl",
    email: "biuro@farmer-ilawa.pl",
  },
  {
    name: "Kamila Kłos",
    role: "Członek Rady Izby",
    company: "Dyrektor Zakładu Instytut Zootechniki PIB",
    address: "Zakład Doświadczalny Kołuda Wielka, ul. Parkowa 1, 88-160 Janikowo",
    contact: "tel. (52) 351-33-91 · koluda@izoo.krakow.pl",
    email: "koluda@izoo.krakow.pl",
  },
  {
    name: "Kamila Oświęcimska-Rusin",
    role: "Członek Rady Izby",
    company: "Senior Country Business Director Poland, Board Member at Cargill",
    address: "02-675 Warszawa, ul. Wołoska 22",
    contact: "www.cargill.com.pl · tel. +48 22 546 01 00 · warsaw_reception@cargill.com",
    email: "warsaw_reception@cargill.com",
  },
  {
    name: "Piotr Grzonkowski",
    role: "Członek Rady Izby",
    company: "Executive Vice-President of the Management Board, SuperDrob S.A.",
    address: "Armii Krajowej 80, 05-480 Karczew",
    contact: "tel. +48 22 77 90 600 · sekretariat@superdrob.pl",
    email: "sekretariat@superdrob.pl",
  },
];

const partnerOrganisations = [
  {
    name: "AVEC",
    url: "https://avec-poultry.eu/",
    logo: "https://krd-ig.com.pl/wp-content/uploads/2024/08/AVEC_logo-1.webp",
    description:
      "Od 2005 roku KRD-IG reprezentuje polską branżę drobiarską w AVEC. Stowarzyszenie reprezentuje interesy europejskiej branży drobiowej i wypracowuje wspólne rozwiązania dla rynku drobiu w UE.",
  },
  {
    name: "UECBV",
    url: "https://uecbv.eu/",
    logo: "https://uecbv.eu/UECBV2/OWS/Images/galerie/Logo_UECBV2.png",
    description:
      "Europejska organizacja reprezentująca sektor hodowli i handlu żywcem oraz mięsem. UECBV zrzesza federacje z wielu krajów i reprezentuje tysiące firm oraz miejsc pracy.",
  },
  {
    name: "CLITRAVI",
    url: "https://www.clitravi.com/",
    logo: "https://www.clitravi.com/wp-content/uploads/2017/10/logo_clitravi-1.png",
    description:
      "Organizacja branżowa działająca od 1958 roku, reprezentująca interesy europejskiego przemysłu przetwórstwa mięsa w dialogu z instytucjami UE.",
  },
  {
    name: "IPC",
    url: "https://internationalpoultrycouncil.org/",
    logo: "https://internationalpoultrycouncil.org/wp-content/uploads/2025/03/IPC-Logo-25.svg",
    description:
      "Międzynarodowa organizacja reprezentująca globalny sektor drobiu. IPC skupia ponad 75% światowej produkcji mięsa drobiowego i 90% globalnego handlu.",
  },
  {
    name: "WPSA",
    url: "https://www.wpsa.com/",
    logo: "https://wpsa.com/wp-content/uploads/2024/05/Logo-WPSA.png",
    description:
      "Światowa organizacja naukowa rozwijająca wiedzę o drobiarstwie i łącząca badaczy, edukatorów oraz praktyków branży od 1912 roku.",
  },
  {
    name: "ELPHA",
    url: "https://www.elpha.eu/",
    logo: "https://static.wixstatic.com/media/7f1b0f_7bd70fff8a5f46c99f4ddbe17e351e9a%7Emv2.png/v1/fill/w_192%2Ch_192%2Clg_1%2Cusm_0.66_1.00_0.01/7f1b0f_7bd70fff8a5f46c99f4ddbe17e351e9a%7Emv2.png",
    description:
      "Europejskie stowarzyszenie reprezentujące cały łańcuch produkcji żywca i jaj wylęgowych w UE oraz wspierające konkurencyjną i zrównoważoną produkcję.",
  },
  {
    name: "FGŻ",
    url: "https://www.fgzrp.pl/",
    logo: "/media/partners/fgz.svg",
    description:
      "Federacja Gospodarki Żywnościowej RP z siedzibą w Warszawie, współpracująca z KRD-IG od 2008 roku.",
  },
];

export function ArticleBody({
  paragraphs,
  links,
  source,
  slug,
}: {
  paragraphs: string[];
  links: ContentLink[];
  source: string;
  slug?: string;
}) {
  const chinaGuideHeadingPattern =
    /^Poniżej prezentujemy przewodnik eksportera mięsa drobiowego na rynek Chin\.?$/i;
  const chinaGuideDownloadHref =
    slug === "przedstawicielstwo-w-chinach"
      ? links.find((link) => link.document)?.href ??
        "https://krd-ig.com.pl/krd_przewodnik_na-rynek-chinski-ok/"
      : undefined;

  const visibleParagraphs =
    slug === "o-nas"
      ? [
          "Informacja o Krajowej Radzie Drobiarstwa – Izbie Gospodarczej w Warszawie. Krajowa Rada Drobiarstwa istnieje od 1991 roku. Od 11 marca 1998r. Krajowa Rada Drobiarstwa posiada statut Izby Gospodarczej. Aktualnie do KRD-IG należy ponad 100 podmiotów gospodarczych.",
          "Celem działalności Krajowej Rady Drobiarstwa – Izby Gospodarczej jest m.in. dalszy rozwój i unowocześnianie polskiego drobiarstwa, ochrona interesów hodowców i producentów drobiu oraz przetwórców mięsa drobiowego, ich integracja, reprezentowanie krajowego drobiarstwa wobec władz państwowych.",
          "Członkowie KRD – IG realizują około 70 % produkcji żywca drobiu, a w uboju i przetwórstwie mięsa drobiowego około 80% produkcji krajowej.",
          "Podaż w branży drobiarskiej bywa nierzadko większa od popytu, a jego spontaniczny wzrost jest mało prawdopodobny.",
          "By rozszerzać rynek zbytu potrzeba wspólnej strategii promowania drobiu jako żywności i ochrony wizerunku całej branży.",
          "Musimy przekonywać krajowych i zagranicznych konsumentów do zwiększenia spożycia drobiu.",
        ]
      : paragraphs;

  if (slug === "zarzad-i-rada-izby") {
    return (
      <div className="article-layout board-only-layout shell">
        <article className="prose board-profile-layout">
          <div className="board-section">
            <h2 className="article-board-heading">Zarząd</h2>
            <div className="board-people-grid board-people-grid-single">
              {boardMembers.slice(0, 1).map((member) => (
                <article className="board-person-card" key={member.name}>
                  <p className="board-role-label">{member.role}</p>
                  <h3>{member.name}</h3>
                  <p>{member.company}</p>
                  {member.address && <p>{member.address}</p>}
                  {member.contact && <p>{stripEmailFromContact(member.contact)}</p>}
                  {member.email && (
                    <a
                      className="board-email-link"
                      href={`mailto:${member.email}`}
                    >
                      {member.email}
                    </a>
                  )}
                </article>
              ))}
            </div>
            <div className="board-people-grid board-people-grid-paired">
              {boardMembers.slice(1, 3).map((member) => (
                <article className="board-person-card" key={member.name}>
                  <p className="board-role-label">{member.role}</p>
                  <h3>{member.name}</h3>
                  <p>{member.company}</p>
                  {member.address && <p>{member.address}</p>}
                  {member.contact && <p>{stripEmailFromContact(member.contact)}</p>}
                  {member.email && (
                    <a
                      className="board-email-link"
                      href={`mailto:${member.email}`}
                    >
                      {member.email}
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="board-section">
            <h2 className="article-board-heading">
              Rada Krajowej Rady Drobiarstwa – Izby Gospodarczej
            </h2>
            <div className="board-people-grid">
              {boardMembers.slice(3).map((member) => (
                <article className="board-person-card" key={member.name}>
                  <p className="board-role-label">
                    {member.name === "Władysław Piasecki" || member.name === "Marek Zagórski"
                      ? member.role
                      : "Członek"}
                  </p>
                  <h3>{member.name}</h3>
                  {member.name !== "Władysław Piasecki" && member.name !== "Marek Zagórski" && (
                    <p className="board-role">{member.role}</p>
                  )}
                  <p>{member.company}</p>
                  {member.address && <p>{member.address}</p>}
                  {member.contact && <p>{stripEmailFromContact(member.contact)}</p>}
                  {member.email && (
                    <a
                      className="board-email-link"
                      href={`mailto:${member.email}`}
                    >
                      {member.email}
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </article>
      </div>
    );
  }

  if (slug === "o-nas") {
    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          {visibleParagraphs.slice(1).map((paragraph, index) =>
            index > 0 && looksLikeHeading(paragraph) ? (
              <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
            ) : (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
            ),
          )}
          <section className="partner-organisations" aria-labelledby="partner-organisations-title">
            <div className="section-intro partner-organisations-header">
              <p className="eyebrow">Partnerzy i organizacje</p>
              <h2 id="partner-organisations-title">Organizacje, z którymi współpracujemy</h2>
            </div>
            <div className="partner-organisations-grid">
              {partnerOrganisations.map((partner) => (
                <a
                  className="partner-card"
                  href={partner.url}
                  key={partner.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="partner-card-media">
                    <img src={partner.logo} alt={`${partner.name} logo`} />
                  </div>
                  <div className="partner-card-content">
                    <span className="partner-card-badge">Partner branżowy</span>
                    <h3>{partner.name}</h3>
                    <p>{partner.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
          <a className="source-link" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "komisje") {
    const commissionNames = visibleParagraphs.slice(1);

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <div className="commission-grid" aria-label="Komisje KRD-IG">
            {commissionNames.map((commissionName, index) => (
              <article className="commission-card" key={`${index}-${commissionName}`}>
                <span className="commission-card-badge">Komisja KRD-IG</span>
                <h2>{commissionName}</h2>
              </article>
            ))}
          </div>
          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "statut") {
    const isBracketedPoint = (value: string) => /^\s*(?:\d+|[a-z])\)[\s"“”]/i.test(value);
    const isDotPoint = (value: string) => /^\s*(?:\d+|[a-z])\.\s+/.test(value);

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose statut-prose">
          {visibleParagraphs.map((paragraph, index) =>
            index > 0 && looksLikeHeading(paragraph) && !isBracketedPoint(paragraph) && !isDotPoint(paragraph) ? (
              <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
            ) : index > 0 && isDotPoint(paragraph) ? (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>
                <strong>{paragraph}</strong>
              </p>
            ) : (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
            ),
          )}
          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "raporty") {
    const reportTitleIndexes = [1, 4, 5, 7, 8, 10];
    const linksByParagraphIndex = new Map<number, ContentLink>();

    reportTitleIndexes.forEach((paragraphIndex, linkIndex) => {
      const link = links[linkIndex];

      if (link) {
        linksByParagraphIndex.set(paragraphIndex, link);
      }
    });

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          {visibleParagraphs.map((paragraph, index) => {
            const normalized = paragraph.trim();

            if (normalized.toUpperCase() === "POBIERZ") {
              return null;
            }

            const linkedTitle = linksByParagraphIndex.get(index);

            if (index > 0 && looksLikeHeading(paragraph)) {
              return linkedTitle ? (
                <h2 key={`${index}-${paragraph.slice(0, 20)}`}>
                  <a href={linkedTitle.href}>
                    {paragraph}
                  </a>
                </h2>
              ) : (
                <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
              );
            }

            return (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
            );
          })}
          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "handel-zagraniczny") {
    const linkByLabel = new Map(
      links.map((link) => [link.label.trim().toUpperCase(), link]),
    );

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          {visibleParagraphs.map((paragraph, index) => {
            const normalized = paragraph.trim();
            const normalizedUpper = normalized.toUpperCase();
            const linkedReport = linkByLabel.get(normalizedUpper);

            if (linkedReport) {
              const readableLabel = normalized.replace(/^POBIERZ\s+/i, "").trim();

              return (
                <h2 key={`${index}-${paragraph.slice(0, 20)}`}>
                  <a href={linkedReport.href}>{readableLabel}</a>
                </h2>
              );
            }

            if (index > 0 && looksLikeHeading(paragraph)) {
              return <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>;
            }

            return <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>;
          })}
          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "rynek-drobiu-w-polsce-w-liczbach") {
    const reportLinks = Array.from(
      new Map(
        [
          ...links
            .filter((link) => {
              const normalized = link.label.trim().toLowerCase();
              return normalized !== "otwórz źródło" && normalized !== "czytaj dalej";
            })
            .map((link) => ({ label: link.label, href: link.href })),
          {
            label: "Ekonomiczne determinanty rozwoju rynku drobiu w Polsce (ZER)",
            href: "https://sciendo.com/article/10.30858/zer/193043",
          },
          {
            label: "Rynek mięsa drobiowego - raport Banku BGŻ BNP Paribas",
            href: "https://media.bnpparibas.pl/pr/393674/rynek-miesa-drobiowego-znamy-juz-najnowszy-raport-banku-bgz-bnp-pariba",
          },
        ].map((item) => [item.href, item]),
      ).values(),
    );

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Rynek drobiu w Polsce - najważniejsze liczby</h2>
          <p>
            W 2024 roku mięso drobiowe pozostawało najczęściej spożywanym gatunkiem mięsa na
            świecie, a Polska utrzymała silną pozycję w europejskim łańcuchu dostaw.
          </p>
          <p>
            <strong>Polska od lat zajmuje 1. miejsce w UE</strong> pod względem produkcji mięsa
            drobiowego, a krajowe zakłady przetwórcze należą do najnowocześniejszych w Europie.
          </p>
          <p>
            <strong>Blisko 2,1 mln ton</strong> wyniósł wolumen eksportu mięsa drobiowego i
            przetworów, a jego wartość przekroczyła <strong>5,5 mld euro</strong>.
          </p>
          <p>
            Około <strong>63% wolumenu eksportu</strong> trafiło na rynek unijny, co potwierdza
            znaczenie handlu wewnątrz UE dla stabilności sektora.
          </p>

          <h2>Determinanty rozwoju rynku</h2>
          <p>
            Wzrost branży opiera się na rosnącej efektywności produkcji, rozbudowie zaplecza
            technologicznego oraz konsekwentnym wzmacnianiu jakości i bezpieczeństwa żywności.
          </p>
          <p>
            Kluczowe znaczenie mają także: dywersyfikacja rynków zbytu, rozwój produktów o
            wyższej wartości dodanej i utrzymywanie długofalowych relacji eksportowych.
          </p>

          <h2>Raporty i opracowania</h2>
          <div className="resource-box">
            {reportLinks.map((item) => (
              <a href={item.href} key={`${item.href}-${item.label}`}>
                <span>{item.label}</span>
                <Arrow />
              </a>
            ))}
          </div>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "promocja-drobiu") {
    const campaignLinks = Array.from(
      new Map(
        links
          .filter((link) => {
            const normalized = link.label.trim().toLowerCase();
            return normalized !== "otwórz źródło" && normalized !== "czytaj dalej";
          })
          .map((link) => [link.href, link]),
      ).values(),
    );

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Strategia promocji branży mięsa drobiowego w Polsce</h2>
          <p>
            Celem działań promocyjno-edukacyjnych jest wsparcie dalszego rozwoju branży,
            utrzymanie jej rentowności oraz budowa silnego i wiarygodnego wizerunku polskiego
            drobiu na rynku krajowym i zagranicznym.
          </p>
          <p>
            Strategia opiera się na komunikacji wartości odżywczych drobiu, działaniach
            edukacyjnych dotyczących jakości i bezpieczeństwa żywności oraz wzmacnianiu pozycji
            eksporterów poprzez promocję marki polskiego sektora drobiarskiego.
          </p>

          <h2>Trzy filary działań</h2>
          <p>
            <strong>Budowa wartości branży:</strong> wzmacnianie przewag konkurencyjnych,
            reputacji sektora i jakości produktów.
          </p>
          <p>
            <strong>Stymulowanie popytu wewnętrznego:</strong> promocja drobiu jako elementu
            codziennej, zbilansowanej diety.
          </p>
          <p>
            <strong>Wsparcie eksportu:</strong> rozwój obecności polskich producentów na rynkach
            UE i krajów trzecich.
          </p>

          <h2>Kluczowe kierunki</h2>
          <p>
            Działania obejmują edukację konsumentów, budowę zaufania do systemów jakości,
            promowanie walorów żywieniowych i zdrowotnych mięsa drobiowego oraz monitoring rynku
            i konsumpcji.
          </p>

          <h2>Realizowane kampanie</h2>
          <div className="resource-box">
            {campaignLinks.map((link) => (
              <a href={link.href} key={`${link.href}-${link.label}`}>
                <span>{link.label}</span>
                <Arrow />
              </a>
            ))}
          </div>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "dobrostan-zwierzat") {
    const introParagraphs = visibleParagraphs.slice(0, 2);
    const mythFactItems = [
      {
        myth: "Kurczaki na fermach wielkotowarowych są trzymane w klatkach, w wielkim ścisku.",
        fact:
          "Kurczęta fermowe przeznaczone na mięso nie są chowane w klatkach. Obowiązujące normy dozwalają jedynie hodowlę w kurniku na ściółce. Zasady chowu kurczaków określa Rozporządzenie Ministra Rolnictwa i Rozwoju Wsi z dnia 15 lutego 2010 roku (Dz. U. Nr 56 poz. 344). Rozporządzenie to wdraża do prawa polskiego dyrektywę Rady 2007/43/WE, ustanawiającą zasady dotyczące ochrony kurcząt utrzymywanych z przeznaczeniem na produkcję mięsa. Oba te akty prawne określają ściśle przestrzegane wymogi, które muszą spełniać obiekty hodowlane. Jest to na przykład tak zwana obsada drobiu, czyli maksymalne zagęszczenie ptaków, a także dokładnie określony minimalny rozmiar przestrzeni, która powinna przypadać na jednego kurczaka. Ponadto regulowane jest także wyposażenie obiektu w system wentylacji i oświetlenia, a jeżeli to konieczne, także systemy ogrzewania i schładzania.",
      },
      {
        myth:
          "Chów drobiu prowadzony jest w nieludzkich warunkach i w produkcji towarowej nie zwraca się uwagi na dobro zwierząt.",
        fact:
          "Utrzymywanie dobrostanu zwierząt jest jednym z podstawowych wymogów prowadzenia jakiejkolwiek produkcji zwierzęcej. W prawie polskim najważniejszym aktem regulującym kwestie ochrony zwierząt, w tym brojlerów i innych rodzajów drobiu, jest ustawa z dnia 21 sierpnia 1997 r. o ochronie zwierząt (t.j. Dz. U. z 2013 r. poz. 856 z późn. zm.). Ustawa ta stanowi, że każdy, kto utrzymuje zwierzęta gospodarskie, jest obowiązany do zapewnienia im opieki i właściwych warunków bytowania, a warunki chowu nie mogą powodować urazów i uszkodzeń lub innych cierpień. Nieprzestrzeganie tego obowiązku skutkuje karami grzywny czy nawet aresztu. Ustawa wprowadza do polskiego prawa zasady z dyrektywy 2007/43/WE. Dlatego nakłada na właściciela fermy i inne osoby sprawujące opiekę nad drobiem obowiązek posiadania odpowiedniej wiedzy z zakresu chowu tych zwierząt. Zapewnia się ją na przykład poprzez odbywanie specjalistycznych szkoleń. Szczegółowe zasady dotyczące norm utrzymania drobiu zostały ujęte w rozporządzeniu Ministra Rolnictwa i Rozwoju Wsi z dnia 15 lutego 2010 r. w sprawie wymagań i sposobu postępowania przy utrzymywaniu gatunków zwierząt gospodarskich, dla których normy ochrony zostały określone w przepisach Unii Europejskiej. Jeżeli chodzi o kruczęta brojlery, muszą one podlegać kontroli przez opiekuna co najmniej 2 razy dziennie, ze zwróceniem szczególnej uwagi na wszelkie objawy wskazujące na obniżony poziom ich dobrostanu. Stosowanie się do tych przepisów jest stale i na każdym etapie hodowli drobiu kontrolowane przez służby weterynaryjne i Sanepid.",
      },
      {
        myth: "Kurczaki w chowie towarowym pozbawiane są snu.",
        fact:
          "Przekonanie o utrzymywaniu nadmiernego oświetlenia w budynkach hodowlanych i utrzymywaniu go przez 24 godziny na dobę jest błędem. Normy prawne nakazują, aby wszystkie kurniki, w których są utrzymywane brojlery, wyposażano w oświetlenie o intensywności co najmniej 20 luksów przy włączonym oświetleniu, mierzone na poziomie oka ptaka, oświetlające przynajmniej 80 % powierzchni użytkowej. Czasowe ograniczenie poziomu oświetlenia dopuszcza się wyłącznie w wyniku zalecenia lekarza weterynarii. Ponadto w terminie siedmiu dni od umieszczenia kurcząt w budynku i do trzech dni przed przewidywanym ubojem oświetlenie powinno być dostosowane do 24-godzinnego rytmu z okresami zaciemnienia trwającymi co najmniej ogółem 6 godzin, z co najmniej jednym okresem nieprzerwanego zaciemnienia trwającym przynajmniej 4 godziny.",
      },
      {
        myth:
          "Drób chowany na fermach jest narażony na wysoki poziom stresu, co odbija się na jakości mięsa.",
        fact:
          "Normy pochodzące ze wspominanych już przepisów określają jako minimalne dokładnie takie warunki, jakich potrzebują zwierzęta do bezstresowego bytowania. Dodatkowo system hodowli pozbawia ptaki naturalnych stresów, związanych ze zdobywaniem pożywienia i ochroną przed zagrożeniami, co przekłada się na ich stan psychiczny. Chów kurczaków w zamkniętych budynkach lub dokładnie ogrodzonych wybiegach eliminuje kontakt z dzikimi zwierzętami i stałą obawę o atak drapieżnika – źródło największego stresu u wszystkich gatunków zwierząt. Dzięki ciągłemu zapewnieniu dostępu do paszy i wody, ptaki nie muszą walczyć o pożywienie i nie doznają cierpień związanych z głodem, które bardzo często zdarzają się w naturze w sytuacji niedoboru.",
      },
      {
        myth: "W fermach hodowlanych kurczakom ucina się dzioby.",
        fact:
          "W polskim prawie nie dopuszczono możliwości ucinania dziobów kurczętom. Dyrektywy unijne pozwalają na taką praktykę w odpowiednich warunkach, ale decyzję o przyzwoleniu na nią pozostawiono Państwom Członkowskim. W Polsce ucinanie dziobów ptakom traktowane jest prawnie jako znęcanie się nad zwierzętami. Według przepisów zawartych w ustawie o ochronie zwierząt za takie traktowanie drobiu grozi grzywna, ograniczenie wolności lub nawet pozbawienie wolności do 2 lat.",
      },
      {
        myth:
          "Pasze stosowane w hodowli drobiu są „sztuczne”, niedopasowane do potrzeb zwierząt, tylko do produkcji przemysłowej.",
        fact:
          "W Polsce organy Inspekcji Weterynaryjnej sprawują ścisły nadzór nad wytwarzaniem, handlem i zastosowaniem pasz oraz pasz leczniczych. Pasze stosuje się w żywieniu drobiu wedle ściśle określonych wyznaczników – w zależności od wieku, gatunku oraz potrzeb pokarmowych (a w chowie indyków także płci). Jest to ważne zarówno dla jakości produktów, jak i dla ogólnej zasady poszanowania dobrostanu zwierząt. Podstawą stosowanych pasz są zboża, śrut z roślin strączkowych (np. śrut sojowy), kukurydza i tego typu składniki roślinne. Stosowane w żywieniu pasze oprócz witamin i soli mineralnych mogą zawierać inne dozwolone prawem europejskim substancje, takie jak probiotyki, prebiotyki, czy enzymy. Są to jednak w stu procentach przetestowane i nie wpływające na zdrowie konsumentów dodatki. Wykaz wszystkich dozwolonych dodatków paszowych jest zawarty we Wspólnotowym Rejestrze Dodatków Paszowych Unii Europejskiej. Panujące niekiedy przekonanie, że drób wolnowybiegowy ma bardziej naturalną i zbilansowaną dietę także jest błędne. Ptaki hodowane „przy zagrodzie” znajdują często pożywienie w odpadkach lub przy drodze – źródła ani skutków zdrowotnych przyjęcia takich „dodatków” do diety nikt nie jest w stanie przewidzieć.",
      },
      {
        myth: "W paszy dla kurczaków znajdują się szczątki pochodzenia zwierzęcego, w tym szczątki innych kurczaków.",
        fact:
          "Od 2001 roku na terenie Unii Europejskie obowiązuje tak zwany „feed ban”. Pod tym pojęciem kryje się całkowity zakaz stosowania mączek mięsno-kostnych w paszach dla zwierząt gospodarskich. Za złamanie zakazu grożą znaczne kary finansowe, a przestrzeganie prawa w tym zakresie jest kontrolowane przez inspekcję weterynaryjną. Od pewnego czasu dopuszczone jest stosowanie mączki rybnej w żywieniu drobiu. Ma ona jednak specyficzny zapach i przez to nie stanowi powszechnego dodatku do paszy.",
      },
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Dobrostan zwierząt</h2>
          {introParagraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}

          <div className="myth-fact-list" aria-label="Mity i fakty o dobrostanie zwierząt">
            {mythFactItems.map((item, index) => (
              <section className="myth-fact-item" key={`${index}-${item.myth.slice(0, 24)}`}>
                <h3 className="myth-label">MIT</h3>
                <p className="myth-text">{item.myth}</p>
                <h3 className="fact-label">FAKT</h3>
                <p className="fact-text">{item.fact}</p>
              </section>
            ))}
          </div>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "poszanowanie-srodowiska") {
    const paragraphsNormalized = visibleParagraphs.map((paragraph) => paragraph.trim()).filter(Boolean);

    const buildFactRange = (startPrefix: string, endPrefix?: string) => {
      const startIndex = paragraphsNormalized.findIndex((paragraph) =>
        paragraph.startsWith(startPrefix),
      );

      if (startIndex === -1) {
        return [] as string[];
      }

      const endIndex = endPrefix
        ? paragraphsNormalized.findIndex(
            (paragraph, index) => index > startIndex && paragraph.startsWith(endPrefix),
          )
        : -1;

      return paragraphsNormalized.slice(startIndex, endIndex === -1 ? undefined : endIndex);
    };

    const firstMythIndex = paragraphsNormalized.findIndex((paragraph) =>
      paragraph.startsWith("Antybiotyki,"),
    );

    const introParagraphs =
      (firstMythIndex > 0
        ? paragraphsNormalized.slice(0, firstMythIndex)
        : paragraphsNormalized.slice(0, 3)
      ).filter((paragraph) => !/^MIT$/i.test(paragraph) && !/^FAKT$/i.test(paragraph));

    const mythFactItems = [
      {
        myth:
          "Antybiotyki, którymi faszerowany jest drób, trafiają wraz z odchodami ptaków do środowiska, przedostają się do wód gruntowych i powodują antybiotykooporność.",
        factParagraphs: buildFactRange("Zagrożenie,", "Coraz większe fermy"),
      },
      {
        myth:
          "Coraz większe fermy drobiu zanieczyszczają powietrze w promieniu wielu kilometrów nieznośnym odorem odchodów, a hodowcy nie podejmują żadnych działań aby zredukować ten problem.",
        factParagraphs: buildFactRange("Rzeczą oczywistą", "Dynamiczny rozrost produkcji drobiarskiej"),
      },
      {
        myth: "Dynamiczny rozrost produkcji drobiarskiej w Polsce powoduje rosnącą ilość zanieczyszczeń.",
        factParagraphs: buildFactRange("Wysoka produkcja", undefined),
      },
    ].filter((item) => item.factParagraphs.length > 0);

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Poszanowanie środowiska</h2>
          {introParagraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}

          <div className="myth-fact-list" aria-label="Mity i fakty o poszanowaniu środowiska">
            {mythFactItems.map((item, index) => (
              <section className="myth-fact-item" key={`${index}-${item.myth.slice(0, 24)}`}>
                <h3 className="myth-label">MIT</h3>
                <p className="myth-text">{item.myth}</p>
                <h3 className="fact-label">FAKT</h3>
                {item.factParagraphs.map((paragraph, paragraphIndex) => (
                  <p className="fact-text" key={`${index}-${paragraphIndex}-${paragraph.slice(0, 24)}`}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "segmentacja") {
    const normalizedParagraphs = visibleParagraphs
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const frenchMarketTable = [
      {
        segment: "Standard",
        chow: "35 – 42 dni",
        feeding: "Zboża, śruta sojowa i inne, tłuszcze roślinne, witaminy i minerały",
        density: "42 kg/m2",
        range: "Niewymagany",
        area: "Nielimitowana",
      },
      {
        segment: "Certifié",
        chow: "56 dni",
        feeding: "Min. 65% zbóż",
        density: "27,5 – 42 kg/m2",
        range: "Niewymagany",
        area: "Nielimitowana",
      },
      {
        segment: "Label Rouge",
        chow: "81 dni",
        feeding: "Min. 75% zbóż, śruta sojowa i inne, tłuszcze roślinne, witaminy i minerały",
        density: "11 szt./m2",
        range: "2 m2 /szt.",
        area: "Gospodarstwo o max. pow. 1600 m2 a kurnik 400 m2",
      },
      {
        segment: "Eco Reg. 889/2008",
        chow: "81 dni",
        feeding:
          "Min. 90% pasz ekologicznych (dopuszczone surowce roślinne i zwierzęce). Zakaz stosowania surowców GMO",
        density: "21 kg/m2 lub 10 szt./m2",
        range: "4 m2/szt.",
        area: "Max. 580 szt./1 ha",
      },
    ];

    const polishProposalTable = [
      {
        segment: "Standard",
        chow: "",
        feeding: "Zboża, śruta sojowa i inne, tłuszcze roślinne, witaminy i minerały",
        density: "42 kg/m2",
        range: "Niewymagany",
        area: "Nielimitowana",
      },
      {
        segment: "Standard+",
        chow: "35 – 42 dni",
        feeding:
          "Zboża, soja i inne, tłuszcze roślinne, witaminy, minerały. Wiarygodne źródło paszy. Określony % zbóż",
        density: "42 kg/m2",
        range: "Niewymagany",
        area: "Nielimitowana",
      },
      {
        segment: "Premium",
        chow: "56 dni, linie genetyczne o spowolnionym wzroście, chów bez antybiotyków",
        feeding: "Min. 65% zbóż, bez GMO, 100% roślinne",
        density: "33 kg/m2",
        range: "Niewymagany, ale wskazany",
        area: "Nielimitowana, wskazany dostęp do naturalnego światła",
      },
      {
        segment: "Wolny Wybieg",
        chow: "81 dni",
        feeding: "Min. 75% zbóż, śruta sojowa i inne, tłuszcze roślinne, witaminy i minerały",
        density: "35 – 42 dni",
        range: "2 m2 /szt.",
        area: "Gospodarstwo o max. pow. 1600 m2 a kurnik 400 m2",
      },
      {
        segment: "Eco Reg. 889/2008",
        chow: "81 dni",
        feeding:
          "Min. 90% pasz ekologicznych (surowce roślinne i zwierzęce). Zakaz stosowania surowców GMO",
        density: "21 kg/m2 lub 10 szt./m2",
        range: "4 m2/szt.",
        area: "Max. 580 szt./1 ha",
      },
    ];

    const isTableDataParagraph = (value: string) => {
      const normalized = value.trim();

      return /^(Długość chowu|Żywienie|Gęstość obsady|Wybieg|Powierzchnia produkcji)$/i.test(
        normalized,
      ) ||
        /^(Standard|Standard\+|Premium|Wolny Wybieg|Certifi|Certifié|Label Rouge|Eco Reg\. 889\/2008)$/i.test(
          normalized,
        ) ||
        /^(35 – 42 dni|56 dni|81 dni|42 kg\/m2|27,5 – 42 kg\/m2|11 szt\.\/m2|2 m2 \/szt\.|21 kg\/m2 lub 10 szt\.\/m2|4 m2\/szt\.|33 kg\/m2|Max\. 580 szt\.\/1 ha|Nielimitowana|Niewymagany)$/i.test(
          normalized,
        ) ||
        /^Min\. 65% zb/i.test(normalized) ||
        /^Min\. 75% zb/i.test(normalized) ||
        /^Min\. 90% pasz ekologicznych/i.test(normalized) ||
        /^Zboża, śruta sojowa i inne, tłuszcze roślinne, witaminy i minerały$/i.test(normalized) ||
        /^Zboża, soja i inne, tłuszcze roślinne, witaminy, minerały\./i.test(normalized) ||
        /^56 dni, linie genetyczne o spowolnionym wzroście/i.test(normalized) ||
        /^Niewymagany, ale wskazany$/i.test(normalized) ||
        /^Nielimitowana, wskazany dostęp do naturalnego światła$/i.test(normalized) ||
        /^Gospodarstwo o max\. pow\. 1600 m2 a kurnik 400 m2$/i.test(normalized);
    };

    const isSectionHeading = (value: string) => {
      const normalized = value.trim();

      return (
        /^Na czym polega segmentacja rynku drobiu\??i?$/i.test(normalized) ||
        /^Czego obawiają się konsumenci\?$/i.test(normalized) ||
        /^Jak segmentacja rynku odpowiedziałaby na obawy i potrzeby konsumentów\?$/i.test(
          normalized,
        ) ||
        /^Co zapewni konsumentom segmentacja\?$/i.test(normalized) ||
        /^Jak wygląda wzorcowa segmentacja rynku drobiu\?$/i.test(normalized) ||
        /^Podział certyfikowanego mięsa drobiowego we Francji prezentuje się następująco:/i.test(
          normalized,
        ) ||
        /^Jak przeprowadzić segmentację rynku drobiu\?$/i.test(normalized) ||
        /^Kategoria:\s*STANDARD\s*\+$/i.test(normalized) ||
        /^Kategoria:\s*Premium\s*[–-]?/i.test(normalized) ||
        /^Wstępna ropozycja segmentacji polskiego drobiu:/i.test(normalized)
      );
    };

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Segmentacja rynku drobiu</h2>
          {normalizedParagraphs.map((paragraph, index) => {
            if (
              /^Podział certyfikowanego mięsa drobiowego we Francji prezentuje się następująco:/i.test(
                paragraph,
              )
            ) {
              return (
                <div className="segment-table-wrap" key={`${index}-${paragraph.slice(0, 24)}`}>
                  <h2>{paragraph}</h2>
                  <table className="segment-table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Długość chowu</th>
                        <th>Żywienie</th>
                        <th>Gęstość obsady</th>
                        <th>Wybieg</th>
                        <th>Powierzchnia produkcji</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frenchMarketTable.map((row) => (
                        <tr key={row.segment}>
                          <th scope="row">{row.segment}</th>
                          <td>{row.chow}</td>
                          <td>{row.feeding}</td>
                          <td>{row.density}</td>
                          <td>{row.range}</td>
                          <td>{row.area}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (/^Wstępna ropozycja segmentacji polskiego drobiu:/i.test(paragraph)) {
              return (
                <div className="segment-table-wrap" key={`${index}-${paragraph.slice(0, 24)}`}>
                  <h2>{paragraph}</h2>
                  <table className="segment-table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Długość chowu</th>
                        <th>Żywienie</th>
                        <th>Gęstość obsady</th>
                        <th>Wybieg</th>
                        <th>Powierzchnia produkcji</th>
                      </tr>
                    </thead>
                    <tbody>
                      {polishProposalTable.map((row) => (
                        <tr key={row.segment}>
                          <th scope="row">{row.segment}</th>
                          <td>{row.chow}</td>
                          <td>{row.feeding}</td>
                          <td>{row.density}</td>
                          <td>{row.range}</td>
                          <td>{row.area}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (isTableDataParagraph(paragraph)) {
              return null;
            }

            if (isSectionHeading(paragraph)) {
              return <h2 key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</h2>;
            }

            if (/^Gwarancję /i.test(paragraph)) {
              return (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>
                  <strong>{paragraph}</strong>
                </p>
              );
            }

            return <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>;
          })}

          {links.length > 0 && (
            <div className="resource-box">
              <h2>Materiały i odnośniki</h2>
              {links.map((link, index) => (
                <a href={link.href} key={`${link.href}-${index}`}>
                  <span>{link.label === "1" ? "Przypis 1" : link.label}</span>
                  <Arrow />
                </a>
              ))}
            </div>
          )}

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "bezpieczna-produkcja") {
    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Bezpieczna produkcja drobiu</h2>
          <p>
            W unijnym modelu produkcji żywności kluczowe znaczenie ma zasada od pola do stołu,
            czyli ciągły nadzór nad każdym etapem łańcucha produkcyjnego.
          </p>
          <p>
            <strong>Identyfikowalność (traceability)</strong> pozwala odtworzyć drogę produktu od
            hodowli do sprzedaży. Producent ma obowiązek wskazać zarówno dostawcę surowca, jak i
            odbiorcę produktu.
          </p>

          <h2>Systemy bezpieczeństwa żywności</h2>
          <p>
            Na terenie Unii Europejskiej stosowanie hormonów wzrostu w chowie drobiu jest
            prawnie zakazane i podlega surowym sankcjom.
          </p>
          <p>
            Parametry produkcyjne drobiu wynikają przede wszystkim z doboru ras, programu żywienia
            i organizacji chowu, a nie z niedozwolonych metod.
          </p>

          <h2>Bezpieczne pakowanie</h2>
          <p>
            Odpowiednie pakowanie pomaga utrzymać świeżość i jakość mięsa oraz ułatwia kontrolę
            zgodności z wymaganiami sanitarnymi i jakościowymi.
          </p>
          <p>
            W praktyce stosuje się m.in. <strong>MAP</strong> oraz pakowanie próżniowe. Obie metody
            ograniczają ryzyko pogorszenia jakości i wydłużają trwałość produktu.
          </p>

          <h2>Informacje na etykiecie</h2>
          <p>
            Etykieta mięsa drobiowego powinna zawierać m.in. klasę jakości, stan termiczny,
            numer partii, termin przydatności, warunki przechowywania, masę netto, dane
            producenta oraz kraj pochodzenia.
          </p>
          <p>
            <strong>Numer weterynaryjny</strong> i <strong>kraj pochodzenia</strong> są szczególnie
            istotne z punktu widzenia bezpieczeństwa, kontroli i świadomego wyboru konsumenta.
          </p>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "jakosc-i-bezpieczenstwo") {
    const linksByHref = new Map(links.map((link) => [link.href, link]));
    const thematicLinks = [
      { title: "System QAFP", href: "/system-qafp/" },
      { title: "Segmentacja", href: "/segmentacja/" },
      { title: "Zdrowy drób", href: "/zdrowy-drob/" },
      { title: "Bezpieczna produkcja", href: "/bezpieczna-produkcja/" },
    ].map((item) => ({
      title: item.title,
      href: linksByHref.get(item.href)?.href ?? item.href,
    }));

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Jakość i bezpieczeństwo polskiego drobiarstwa</h2>
          <p>
            Priorytetem branży drobiarskiej jest dostarczanie produktów o potwierdzonej jakości,
            pełnej identyfikowalności oraz wysokim poziomie bezpieczeństwa zdrowotnego.
          </p>

          <h2>System QAFP</h2>
          <p>
            System Gwarantowanej Jakości Żywności QAFP to krajowy system certyfikacji, który
            obejmuje kontrolę na etapach hodowli, produkcji i dystrybucji.
          </p>
          <p>
            <strong>Oznaczenie QAFP</strong> potwierdza, że produkt spełnia ściśle określone
            standardy jakościowe i bezpieczeństwa.
          </p>

          <h2>Segmentacja i transparentność</h2>
          <p>
            Segmentacja produktowa porządkuje kategorie żywności według jasno zdefiniowanych
            cech, dzięki czemu odbiorcy otrzymują czytelną informację o charakterystyce i jakości
            kupowanego produktu.
          </p>

          <h2>Zdrowy drób i podejście od pola do stołu</h2>
          <p>
            W unijnym modelu produkcji żywności nadrzędna jest zasada od pola do stołu,
            zakładająca ciągły nadzór nad całym łańcuchem produkcyjnym.
          </p>
          <p>
            <strong>Kluczową rolę odgrywa identyfikowalność (traceability)</strong>, która
            umożliwia monitorowanie pochodzenia i jakości produktów drobiowych na każdym etapie.
          </p>

          <h2>Materiały tematyczne</h2>
          <div className="resource-box">
            {thematicLinks.map((item) => (
              <a href={item.href} key={`${item.href}-${item.title}`}>
                <span>{item.title}</span>
                <Arrow />
              </a>
            ))}
          </div>

          <a className="source-link source-link-inline" href={source}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "eksport-import-z-unii-europejskiej") {
    const sectionSources = [
      {
        title: "Sekcja 0 – Ogólny zakres działalności zakładu",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=1&lng=0",
      },
      {
        title: "Sekcja I – Mięso kopytnych udomowionych",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=2&lng=0",
      },
      {
        title: "Sekcja II – Mięso drobiowe i zajęczaki",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=3&lng=0",
      },
      {
        title: "Sekcja III – Mięso zwierząt dzikich utrzymywanych w warunkach fermowych",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=4&lng=0",
      },
      {
        title: "Sekcja IV – Dziczyzna",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=5&lng=0",
      },
      {
        title: "Sekcja V – Mięso mielone, surowe wyroby mięsne i mięso odkostnione mechanicznie",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=6&lng=0",
      },
      {
        title: "Sekcja VI – Produkty mięsne",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=7&lng=0",
      },
      {
        title: "Sekcja VII – Żywe mięczaki dwuskorupowe",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=8&lng=0",
      },
      {
        title: "Sekcja VIII – Produkty rybołówstwa",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=9&lng=0",
      },
      {
        title: "Sekcja IX – Surowe mleko i produkty mleczne",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=10&lng=0",
      },
      {
        title: "Sekcja X – Jaja i produkty jajeczne",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=11&lng=0",
      },
      {
        title: "Sekcja XI – Żabie udka i ślimaki",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=12&lng=0",
      },
      {
        title: "Sekcja XII – Tłuszcze zwierzęce i skwarki",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=13&lng=0",
      },
      {
        title: "Sekcja XIII – Przetworzone żołądki, pęcherze i jelita",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=14&lng=0",
      },
      {
        title: "Sekcja XIV – Żelatyna",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=15&lng=0",
      },
      {
        title: "Sekcja XV – Kolagen",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=16&lng=0",
      },
      {
        title:
          "Sekcja XVI – Wysoko rafinowany siarczan chondroityny, kwas hialuronowy, inne produkty z hydrolizowanych chrząstek, chitozan, glukozamina, podpuszczka, karuk i aminokwasy",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=17&lng=0",
      },
      {
        title: "Sekcje mięsne (I, II, III, IV, V, VI, XII, XIII)",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=1000&lng=0",
      },
      {
        title:
          "Wykaz zakładów korzystających z krajowych środków dostosowujących (art. 13 ust. 3 rozp. 852/2004 oraz art. 10 ust. 3 rozp. 853/2004)",
        href: "https://zywnosc.wetgiw.gov.pl/spi/zatw/index.php?sekcja=18&lng=0&poprzedniaSekcja=",
      },
      {
        title: "Wykaz ferm jaj konsumpcyjnych nieobjętych dyrektywą 2002/4/WE",
        href: "https://zywnosc.wetgiw.gov.pl/spi/egg_no_reg/",
      },
      {
        title: "Wywóz z Polski poza UE – Żywność",
        href: "https://www.wetgiw.gov.pl/handel-eksport-import/zywnosc",
      },
      {
        title: "Wywóz z Polski poza UE – Zwierzęta i materiał biologiczny",
        href: "https://www.wetgiw.gov.pl/handel-eksport-import/zwierzeta",
      },
      {
        title: "Wywóz z Polski poza UE – Pasze i uboczne produkty pochodzenia zwierzęcego",
        href: "https://www.wetgiw.gov.pl/handel-eksport-import/produkty-pochodne-pasze-uboczne-produkty",
      },
      {
        title: "Wykaz weterynaryjnych świadectw zdrowia w eksporcie do krajów trzecich",
        href: "https://www.wetgiw.gov.pl/handel-eksport-import/wykaz-weterynaryjnych-swiadectw-zdrowia-w-eksporcie-do-krajow-trzecich",
      },
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <p>Eksport / import</p>
          <h2>z Unii Europejskiej</h2>
          <p>
            Listy zakładów uprawnionych do wprowadzania produktów pochodzenia zwierzęcego na
            rynek UE oraz rynek krajowy.
          </p>
          <h2>Rejestry zakładów objętych nadzorem Inspekcji Weterynaryjnej</h2>
          <div className="resource-box">
            {sectionSources.map((item) => (
              <a href={item.href} key={item.href}>
                <span>{item.title}</span>
                <Arrow />
              </a>
            ))}
          </div>
          <a
            className="source-link source-link-inline"
            href="https://www.wetgiw.gov.pl/handel-eksport-import/listy-zakladow"
          >
            Zobacz źródło WetGIW <Arrow />
          </a>
        </article>
      </div>
    );
  }

  const shouldJustifyArticleText = slug === "bezpieczenstwo-bialkowe";

  return (
    <div className="article-layout shell">
      <article className={`prose${shouldJustifyArticleText ? " prose-justified" : ""}`}>
        {visibleParagraphs.map((paragraph, index) => {
          if (
            slug === "przedstawicielstwo-w-chinach" &&
            chinaGuideHeadingPattern.test(paragraph.trim())
          ) {
            return (
              <h2 key={`${index}-${paragraph.slice(0, 20)}`}>
                Przewodnik eksportera mięsa drobiowego na rynek Chin -{" "}
                <a className="inline-download-link" href={chinaGuideDownloadHref}>
                  kliknij tutaj
                </a>
              </h2>
            );
          }

          return index > 0 && looksLikeHeading(paragraph) ? (
            <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
          ) : (
            <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
          );
        })}
      </article>
      <aside className="article-aside">
        {links.length > 0 && (
          <div className="resource-box">
            <h2>Materiały i odnośniki</h2>
            {links.slice(0, 40).map((link) => (
              <a
                href={link.href}
                key={`${link.href}-${link.label}`}
              >
                <span>{link.document ? "Dokument" : link.label}</span>
                <Arrow />
              </a>
            ))}
          </div>
        )}
        <a
          className="source-link"
          href={source}
        >
          Zobacz materiał na obecnej stronie KRD-IG <Arrow />
        </a>
      </aside>
    </div>
  );
}
