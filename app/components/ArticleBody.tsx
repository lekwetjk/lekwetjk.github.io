import type { ContentLink } from "../lib/content";
import type { ReactNode } from "react";
import { withBasePath } from "../lib/basePath";
import { Arrow } from "./SiteChrome";
import { MembershipSignupForm } from "./MembershipSignupForm";
import { ExternalFavicon } from "./ExternalFavicon";
import { CommissionTicker } from "./CommissionTicker";

function looksLikeHeading(value: string) {
  return (
    value.length < 110 &&
    !/[.!?]$/.test(value) &&
    value.split(/\s+/).length <= 12
  );
}

function looksLikeAllCapsHeading(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 3) {
    return false;
  }
  if (/\d/.test(trimmed)) {
    return false;
  }
  const lettersOnly = trimmed.replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/g, "");
  if (lettersOnly.length < 3) {
    return false;
  }
  return lettersOnly === lettersOnly.toLocaleUpperCase("pl");
}

function stripEmailFromContact(contact: string) {
  return contact
    .replace(/\s*(?:·\s*)?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "")
    .replace(/\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderAddress(address: string) {
  return address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => <p key={`${line}-${index}`}>{line}</p>);
}

function renderContactLine(contact: string) {
  const cleanedContact = stripEmailFromContact(contact);
  return cleanedContact ? <p>{cleanedContact}</p> : null;
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
    address: "Powstańców 19\n86-050 Solec Kujawski",
    contact: "sekretariat@drobex.com.pl",
    email: "sekretariat@drobex.com.pl",
  },
  {
    name: "Adam Sojka",
    role: "Wiceprezes Zarządu KRD-IG",
    company: "Prezes Zarządu Grupy Drosed „Drosed” S. A.",
    address: "ul. Sokołowka 154\n08-110 Siedlce",
    contact: "sekretariat@drosed.com.pl",
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
    logo: "/media/partners/avec.svg",
    description:
      "Od 2005 roku KRD-IG reprezentuje polską branżę drobiarską w AVEC. Stowarzyszenie reprezentuje interesy europejskiej branży drobiowej i wypracowuje wspólne rozwiązania dla rynku drobiu w UE.",
  },
  {
    name: "UECBV",
    url: "https://uecbv.eu/",
    logo: "/media/partners/uecbv.svg",
    description:
      "Europejska organizacja reprezentująca sektor hodowli i handlu żywcem oraz mięsem. UECBV zrzesza federacje z wielu krajów i reprezentuje tysiące firm oraz miejsc pracy.",
  },
  {
    name: "CLITRAVI",
    url: "https://www.clitravi.com/",
    logo: "/media/partners/clitravi.svg",
    description:
      "Organizacja branżowa działająca od 1958 roku, reprezentująca interesy europejskiego przemysłu przetwórstwa mięsa w dialogu z instytucjami UE.",
  },
  {
    name: "IPC",
    url: "https://internationalpoultrycouncil.org/",
    logo: "/media/partners/ipc.svg",
    description:
      "Międzynarodowa organizacja reprezentująca globalny sektor drobiu. IPC skupia ponad 75% światowej produkcji mięsa drobiowego i 90% globalnego handlu.",
  },
  {
    name: "WPSA",
    url: "https://www.wpsa.com/",
    logo: "/media/partners/wpsa.svg",
    description:
      "Światowa organizacja naukowa rozwijająca wiedzę o drobiarstwie i łącząca badaczy, edukatorów oraz praktyków branży od 1912 roku.",
  },
  {
    name: "ELPHA",
    url: "https://www.elpha.eu/",
    logo: "/media/partners/elpha.svg",
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
  const resolvedSource =
    slug === "czlonkowie"
      ? "https://krd-ig.com.pl/czlonkowie/"
      : source;
  const sourceLinkLabel =
    slug === "nowy-link-zsrir-w-zakladce-dokumenty"
      ? "PRZEJDŹ DO STRONY ZSRIR"
      : "Zobacz materiał na obecnej stronie KRD-IG";
  const chinaGuideDownloadHref =
    slug === "przedstawicielstwo-w-chinach"
      ? links.find((link) => link.document)?.href ??
        "https://krd-ig.com.pl/krd_przewodnik_na-rynek-chinski-ok/"
      : undefined;
  const dezinformacjaBriefingPdfHref =
    "https://krd-ig.com.pl/wp-content/uploads/2026/04/Czerwona-kartka-dla-dezinformacji-i-kluczowe-wyzwania-rynkowe.pdf";
  const eurLexDecisionLabel =
    "Decyzja wykonawcza Komisji (UE) 2026/1796 z dnia 16 lipca 2026 r. zmieniająca załącznik do decyzji wykonawczej (UE) 2023/2447 dotyczącej środków nadzwyczajnych w odniesieniu do ognisk wysoce zjadliwej grypy ptaków w niektórych państwach członkowskich";
  const eurLexDecisionHref =
    "https://eur-lex.europa.eu/legal-content/PL/TXT/PDF/?uri=OJ:L_202601796";
  const ijharsAgreementUrlLabel =
    "https://www.gov.pl/web/ijhars/wspolne-zasady-dla-rynku-miesa–ijhars-i-branza-wypracowaly-porozumienia";
  const ijharsAgreementHref =
    links.find((link) => link.label === ijharsAgreementUrlLabel)?.href ??
    "https://www.gov.pl/web/ijhars/wspolne-zasady-dla-rynku-miesa--ijhars-i-branza-wypracowaly-porozumienia";
  const dezinformacjaBriefingPhotos = [
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-29-at-15.39.29-7-1024x768.jpeg",
      alt: "Śniadanie prasowe KRD-IG - zdjęcie 1",
    },
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-29-at-15.39.29-4-1024x767.jpeg",
      alt: "Śniadanie prasowe KRD-IG - zdjęcie 2",
    },
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-29-at-15.39.29-3-768x1024.jpeg",
      alt: "Śniadanie prasowe KRD-IG - zdjęcie 3",
    },
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-29-at-15.39.29-1-819x1024.jpeg",
      alt: "Śniadanie prasowe KRD-IG - zdjęcie 4",
    },
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-29-at-15.39.29-6-1024x767.jpeg",
      alt: "Śniadanie prasowe KRD-IG - zdjęcie 5",
    },
  ];
  const dezinformacjaBriefingLogos = [
    {
      src: "https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png",
      alt: "Logo Dobry Drob",
      href: "https://dobrydrob.pl/",
    },
    {
      src: "https://krd-ig.com.pl/wp-content/uploads/2025/07/logo_Fundusze-Promocji_kolor-1024x888.png",
      alt: "Logo Fundusze Promocji",
      href: "https://www.gov.pl/web/kowr/fundusz-promocji-miesa-drobiowego",
      className: "news-logo-fundusze",
    },
  ];

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

  const isTenderLikeSlug =
    !!slug &&
    /(zapytanie-ofertowe|wybor-wykonawcy|zaproszenie-do-skladania-ofert|wyniki-postepowania|uniewaznienie)/.test(
      slug,
    );
  const shouldHighlightTenderDeadline =
    slug ===
    "zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6";
  const tenderDeadlineParagraphStart =
    "Termin składania ofert upływa 24 sierpnia 2026 r.";
  const resolveArticleHref = (href: string) =>
    /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")
      ? href
      : withBasePath(href);
  let tenderLinkCursor = 0;

  const renderTenderLinkedText = (paragraph: string, keyPrefix: string) => {
    if (!isTenderLikeSlug) {
      return null;
    }

    const text = paragraph.trim();
    if (!text) {
      return null;
    }

    let chosenLink: ContentLink | null = null;
    for (let index = tenderLinkCursor; index < links.length; index += 1) {
      const candidate = links[index];
      if (!candidate?.label) {
        continue;
      }
      if (text.includes(candidate.label)) {
        chosenLink = candidate;
        tenderLinkCursor = index + 1;
        break;
      }
    }

    if (!chosenLink) {
      return null;
    }

    const marker = "__KRD_LINK_MARKER__";
    const markedText = text.replace(chosenLink.label, marker);
    if (!markedText.includes(marker)) {
      return null;
    }

    const [before, after = ""] = markedText.split(marker);
    const anchor = (
      <a className="inline-download-link" href={resolveArticleHref(chosenLink.href)}>
        {chosenLink.label}
      </a>
    );

    return {
      hasLink: true,
      node: (
        <>
          {before}
          {anchor}
          {after}
        </>
      ),
      key: `${keyPrefix}-${chosenLink.href}-${chosenLink.label}`,
    };
  };

  if (slug === "zarzad-i-rada-izby") {
    return (
      <div className="article-layout board-only-layout shell">
        <article className="prose board-profile-layout">
          <div className="board-section">
            <h2 className="article-board-heading">Zarząd</h2>
            <div className="board-people-grid board-people-grid-single">
              {boardMembers.slice(0, 1).map((member) => (
                <article className="board-person-card" key={member.name}>
                  <p className="board-role-label">Członek</p>
                  <h3>{member.name}</h3>
                  <p className="board-role">{member.role}</p>
                  <p>{member.company}</p>
                  {member.address && renderAddress(member.address)}
                  {member.contact && renderContactLine(member.contact)}
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
                  <p className="board-role-label">Członek</p>
                  <h3>{member.name}</h3>
                  <p className="board-role">{member.role}</p>
                  <p>{member.company}</p>
                  {member.address && renderAddress(member.address)}
                  {member.contact && renderContactLine(member.contact)}
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
                  <p className="board-role-label">Członek</p>
                  <h3>{member.name}</h3>
                  <p className="board-role">{member.role}</p>
                  <p>{member.company}</p>
                  {member.address && renderAddress(member.address)}
                  {member.contact && renderContactLine(member.contact)}
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
                >
                  <div className="partner-card-media">
                    <img src={withBasePath(partner.logo)} alt={`${partner.name} logo`} />
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
          <a className="source-link" href={resolvedSource}>
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
          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "wstawienia") {
    const columnLabels = [
      "Styczeń",
      "Luty",
      "Marzec",
      "I kwartał",
      "Dynamika",
      "Kwiecień",
      "Maj",
      "Czerwiec",
      "II kwartał",
      "Dynamika",
      "I półrocze",
      "Dynamika",
      "Lipiec",
      "Sierpień",
      "Wrzesień",
      "III kwartał",
      "Dynamika",
      "Październik",
      "Listopad",
      "Grudzień",
      "IV kwartał",
      "Dynamika",
      "II półrocze",
      "Dynamika",
      "Rok",
      "Dynamika",
    ];

    const rowsStartIndex = visibleParagraphs.findIndex((paragraph) =>
      /^\d{4}$/.test(paragraph.trim()),
    );
    const lastEditIndex = visibleParagraphs.findIndex((paragraph) =>
      /^Ostatnia edycja:/i.test(paragraph.trim()),
    );
    const opracowanieIndex = visibleParagraphs.findIndex((paragraph) =>
      /^Opracowanie:/i.test(paragraph.trim()),
    );

    const dataEndIndex =
      (lastEditIndex !== -1 ? lastEditIndex : opracowanieIndex !== -1 ? opracowanieIndex : visibleParagraphs.length);

    const tableRows: Array<{ year: string; values: string[] }> = [];
    if (rowsStartIndex !== -1) {
      let index = rowsStartIndex;
      while (index < dataEndIndex) {
        const current = visibleParagraphs[index]?.trim();
        if (!current) {
          index += 1;
          continue;
        }

        if (!/^\d{4}$/.test(current)) {
          index += 1;
          continue;
        }

        const year = current;
        index += 1;
        const values: string[] = [];

        while (index < dataEndIndex) {
          const value = visibleParagraphs[index]?.trim();
          if (!value) {
            index += 1;
            continue;
          }
          if (/^\d{4}$/.test(value)) {
            break;
          }
          values.push(value);
          index += 1;
        }

        tableRows.push({ year, values });
      }
    }

    const parsePolishNumber = (value: string) => {
      const cleaned = value.trim();
      if (!cleaned || cleaned === "-" || cleaned === "—") {
        return null;
      }
      const normalized = cleaned.replace(/\*/g, "").replace(/\s+/g, "").replace(/,/g, ".");
      if (!normalized) {
        return null;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const parsePolishPercent = (value: string) => {
      const cleaned = value.trim();
      if (!cleaned || !cleaned.includes("%")) {
        return null;
      }
      const normalized = cleaned.replace(/%/g, "").replace(/\s+/g, "").replace(/,/g, ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const formatPolishInteger = (value: number) =>
      Math.round(value).toLocaleString("pl-PL").replace(/\u00a0/g, " ");
    const formatDynamicsPercent = (current: number, previous: number) =>
      `${((current / previous) * 100).toFixed(1).replace(".", ",")}%`;

    const rowsToFix = new Set(["2020", "2022", "2024", "2025"]);
    const percentColumns = [5, 10, 12, 17, 22, 24, 26];
    const monthlyIndexes = [0, 1, 2, 5, 6, 7, 12, 13, 14, 17, 18, 19];

    const alignedTableRows = tableRows.map((row) => {
      if (!rowsToFix.has(row.year)) {
        return row;
      }

      const values = [...row.values];

      for (const percentColumn of percentColumns) {
        if (values.length >= 26 && values[percentColumn - 1]?.includes("%")) {
          continue;
        }

        const current = values[percentColumn - 1]?.trim() ?? "";
        if (current && !current.includes("%")) {
          values.splice(percentColumn - 1, 0, "");
        }
      }

      while (values.length < 26) {
        values.push("");
      }
      if (values.length > 26) {
        values.length = 26;
      }

      const monthlyValues = monthlyIndexes
        .map((index) => parsePolishNumber(values[index] ?? ""))
        .filter((item): item is number => item !== null);
      const monthlyTotal =
        monthlyValues.length === monthlyIndexes.length
          ? monthlyValues.reduce((sum, item) => sum + item, 0)
          : null;

      if (monthlyTotal !== null) {
        values[24] = formatPolishInteger(monthlyTotal);
      }

      return { ...row, values };
    });

    const normalizedTableRows = alignedTableRows.map((row) => {
      const values = [...row.values];
      while (values.length < 26) {
        values.push("");
      }
      if (values.length > 26) {
        values.length = 26;
      }
      return { ...row, values };
    });

    const comparisonColumns = [
      { metricIndex: 3, dynamicIndex: 4 },
      { metricIndex: 8, dynamicIndex: 9 },
      { metricIndex: 10, dynamicIndex: 11 },
      { metricIndex: 15, dynamicIndex: 16 },
      { metricIndex: 20, dynamicIndex: 21 },
      { metricIndex: 22, dynamicIndex: 23 },
      { metricIndex: 24, dynamicIndex: 25 },
    ];

    const rowByYear = new Map(
      normalizedTableRows
        .map((row) => {
          const year = Number(row.year);
          return Number.isFinite(year) ? [year, row] : null;
        })
        .filter((entry): entry is [number, { year: string; values: string[] }] => entry !== null),
    );

    const tableRowsWithDynamics = normalizedTableRows.map((row) => {
      const year = Number(row.year);
      const previousRow = Number.isFinite(year) ? rowByYear.get(year - 1) : undefined;
      if (!previousRow) {
        return row;
      }

      const values = [...row.values];
      for (const { metricIndex, dynamicIndex } of comparisonColumns) {
        const current = parsePolishNumber(values[metricIndex] ?? "");
        const previous = parsePolishNumber(previousRow.values[metricIndex] ?? "");
        if (current === null || previous === null || previous === 0) {
          continue;
        }
        values[dynamicIndex] = formatDynamicsPercent(current, previous);
      }

      return { ...row, values };
    });

    const maxValueCount = tableRowsWithDynamics.reduce(
      (max, row) => Math.max(max, row.values.length),
      columnLabels.length,
    );

    const extractYearTotal = (values: string[]) => {
      const directTotal = parsePolishNumber(values[24] ?? "");
      if (directTotal !== null) {
        return directTotal;
      }

      for (let index = values.length - 1; index >= 0; index -= 1) {
        const rawValue = values[index]?.trim() ?? "";
        if (!rawValue || rawValue.includes("%")) {
          continue;
        }
        const parsed = parsePolishNumber(rawValue);
        if (parsed !== null) {
          return parsed;
        }
      }

      return null;
    };

    const yearlySeries = tableRowsWithDynamics
      .map((row) => {
        const directTotal = parsePolishNumber(row.values[24] ?? "");
        const fallbackTotal = extractYearTotal(row.values);
        const total = directTotal ?? fallbackTotal;
        if (total === null) {
          return null;
        }

        const isPartialYear = directTotal === null;
        return { year: row.year, total, isPartialYear };
      })
      .filter((item): item is { year: string; total: number; isPartialYear: boolean } => item !== null);

    const chartWidth = 980;
    const chartHeight = 340;
    const chartPadding = { top: 24, right: 24, bottom: 52, left: 80 };
    const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
    const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const mapValueToY = (value: number, minValue: number, maxValue: number) => {
      const span = maxValue - minValue || 1;
      return chartPadding.top + (1 - (value - minValue) / span) * plotHeight;
    };
    const maxTotal = yearlySeries.length > 0 ? Math.max(...yearlySeries.map((point) => point.total)) : 1;
    const minTotal = 0;
    const totalTickStep = 3000000;
    const totalAxisMax = Math.max(
      totalTickStep,
      Math.ceil(maxTotal / totalTickStep) * totalTickStep,
    );
    const totalZeroY = mapValueToY(0, minTotal, totalAxisMax);

    const chartPoints = yearlySeries.map((point, index) => {
      const x =
        chartPadding.left +
        (yearlySeries.length <= 1 ? 0 : (index / (yearlySeries.length - 1)) * plotWidth);
      const y = mapValueToY(point.total, minTotal, totalAxisMax);
      return { ...point, x, y };
    });

    const chartPath =
      chartPoints.length > 0
        ? chartPoints
            .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
            .join(" ")
        : "";
    const yTicks = [] as Array<{ y: number; value: number; label: string }>;
    for (let value = totalAxisMax; value >= minTotal; value -= totalTickStep) {
      yTicks.push({
        y: mapValueToY(value, minTotal, totalAxisMax),
        value,
        label: Math.round(value).toLocaleString("pl-PL"),
      });
    }
    const tickCount = 5;
    const tickDenominator = Math.max(tickCount - 1, 1);
    const barWidth =
      chartPoints.length > 0
        ? Math.min(42, Math.max(12, (plotWidth / chartPoints.length) * 0.56))
        : 16;

    const monthlyColumnsInOrder = [0, 1, 2, 5, 6, 7, 12, 13, 14, 17, 18, 19];
    const getPartialDynamicsFromMonths = (
      currentValues: string[],
      previousValues: string[],
    ) => {
      let currentSum = 0;
      let previousSum = 0;
      let comparedMonths = 0;

      for (const columnIndex of monthlyColumnsInOrder) {
        const current = parsePolishNumber(currentValues[columnIndex] ?? "");
        const previous = parsePolishNumber(previousValues[columnIndex] ?? "");
        if (current === null || previous === null) {
          break;
        }
        currentSum += current;
        previousSum += previous;
        comparedMonths += 1;
      }

      if (comparedMonths === 0 || previousSum === 0) {
        return null;
      }

      return {
        dynamics: (currentSum / previousSum) * 100,
        comparedMonths,
      };
    };

    const yearlyDynamicsSeries = tableRowsWithDynamics
      .map((row) => {
        const year = Number(row.year);
        const directDynamics = parsePolishPercent(row.values[25] ?? "");
        if (directDynamics !== null) {
          return { year: row.year, dynamics: directDynamics, isPartial: false, comparedMonths: 12 };
        }

        const currentTotal = parsePolishNumber(row.values[24] ?? "");
        const previousRow = Number.isFinite(year) ? rowByYear.get(year - 1) : undefined;
        const previousTotal = previousRow
          ? parsePolishNumber(previousRow.values[24] ?? "")
          : null;

        if (currentTotal !== null && previousTotal !== null && previousTotal !== 0) {
          return {
            year: row.year,
            dynamics: (currentTotal / previousTotal) * 100,
            isPartial: false,
            comparedMonths: 12,
          };
        }

        if (!previousRow) {
          return null;
        }

        const partial = getPartialDynamicsFromMonths(row.values, previousRow.values);
        if (!partial) {
          return null;
        }

        return {
          year: row.year,
          dynamics: partial.dynamics,
          isPartial: true,
          comparedMonths: partial.comparedMonths,
        };
      })
      .filter(
        (
          item,
        ): item is {
          year: string;
          dynamics: number;
          isPartial: boolean;
          comparedMonths: number;
        } => item !== null,
      );

    const dynamicsMinBase =
      yearlyDynamicsSeries.length > 0
        ? Math.min(...yearlyDynamicsSeries.map((point) => point.dynamics))
        : 90;
    const dynamicsMaxBase =
      yearlyDynamicsSeries.length > 0
        ? Math.max(...yearlyDynamicsSeries.map((point) => point.dynamics))
        : 110;
    const dynamicsMin = Math.max(0, Math.floor(dynamicsMinBase - 2));
    const dynamicsMax = Math.ceil(dynamicsMaxBase + 2);
    const normalizedDynamicsMin = Math.min(0, dynamicsMin);
    const dynamicsZeroY = mapValueToY(0, normalizedDynamicsMin, dynamicsMax);

    const dynamicsPoints = yearlyDynamicsSeries.map((point, index) => {
      const x =
        chartPadding.left +
        (yearlyDynamicsSeries.length <= 1
          ? 0
          : (index / (yearlyDynamicsSeries.length - 1)) * plotWidth);
      const y = mapValueToY(point.dynamics, normalizedDynamicsMin, dynamicsMax);
      return { ...point, x, y };
    });

    const dynamicsPath =
      dynamicsPoints.length > 0
        ? dynamicsPoints
            .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
            .join(" ")
        : "";

    const dynamicsTicks = Array.from({ length: tickCount }, (_, index) => {
      const ratio = index / tickDenominator;
      const value = dynamicsMax - ratio * (dynamicsMax - normalizedDynamicsMin);
      const y = chartPadding.top + ratio * plotHeight;
      return {
        y,
        label: `${value.toFixed(1).replace(".", ",")}%`,
      };
    });

    const lastEditText =
      lastEditIndex !== -1 ? visibleParagraphs[lastEditIndex].trim() : undefined;
    const formatWstawieniaYearLabel = (year: string) =>
      year === "2026" ? "2026 (I-VI)" : year;
    const opracowanieLines =
      opracowanieIndex !== -1
        ? visibleParagraphs
            .slice(opracowanieIndex + 1)
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

    const opracowanieText = opracowanieLines.join(" ");
    const emailMatch = opracowanieText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const beforeEmail = emailMatch
      ? opracowanieText.slice(0, emailMatch.index).trim()
      : opracowanieText;
    const afterEmail = emailMatch
      ? opracowanieText.slice((emailMatch.index ?? 0) + emailMatch[0].length).trim()
      : "";

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-justified prose-wstawienia">
          <h2>Wstawienia 2015 - 2026</h2>
          <p>
            Liczba piskląt hodowlanych kur mięsnych (stada rodzicielskie - w szt. samic)
            przyjętych do wychowu w latach 2015-2026 wraz z dynamiką zmian wielkości zaplecza (%).
          </p>

          <div className="wstawienia-table-wrap" aria-label="Tabela wstawień 2015-2026">
            <table className="wstawienia-table">
              <thead>
                <tr>
                  <th>Rok</th>
                  {Array.from({ length: maxValueCount }).map((_, index) => (
                    <th key={`wstawienia-header-${index}`}>
                      {columnLabels[index] ?? `Kolumna ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRowsWithDynamics.map((row) => (
                  <tr key={row.year}>
                    <th scope="row">{row.year}</th>
                    {Array.from({ length: maxValueCount }).map((_, index) => (
                      <td key={`${row.year}-${index}`}>{row.values[index] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chartPoints.length > 0 && (
            <section className="wstawienia-chart" aria-label="Wykres rocznych wstawień">
              <h2>Wykres rocznych wstawień (kolumna „Rok”)</h2>
              <div className="wstawienia-chart-figure">
                <input
                  type="radio"
                  id="wstawienia-chart-line"
                  name="wstawienia-chart-mode"
                  className="wstawienia-chart-toggle-input"
                  defaultChecked
                />
                <input
                  type="radio"
                  id="wstawienia-chart-bar"
                  name="wstawienia-chart-mode"
                  className="wstawienia-chart-toggle-input"
                />
                <input
                  type="radio"
                  id="wstawienia-chart-dynamics"
                  name="wstawienia-chart-mode"
                  className="wstawienia-chart-toggle-input"
                />
                <div className="wstawienia-chart-switch" role="group" aria-label="Przełącznik typu wykresu">
                  <label htmlFor="wstawienia-chart-line">Liniowy</label>
                  <label htmlFor="wstawienia-chart-bar">Słupkowy</label>
                  <label htmlFor="wstawienia-chart-dynamics">Dynamika</label>
                </div>
              <svg
                className="wstawienia-chart-canvas"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Wykres rocznych wstawień"
              >
                <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />

                {yTicks.map((tick, index) => (
                  <g key={`y-tick-${index}`}>
                    <line
                      x1={chartPadding.left}
                      y1={tick.y}
                      x2={chartWidth - chartPadding.right}
                      y2={tick.y}
                      className="wstawienia-chart-grid-line"
                    />
                    <text
                      x={chartPadding.left - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="wstawienia-chart-value"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                <line
                  x1={chartPadding.left}
                  y1={totalZeroY}
                  x2={chartWidth - chartPadding.right}
                  y2={totalZeroY}
                  stroke="#b8b5ad"
                />
                <line
                  x1={chartPadding.left}
                  y1={chartPadding.top}
                  x2={chartPadding.left}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="#b8b5ad"
                />

                <g className="wstawienia-series wstawienia-series-line">
                  <path d={chartPath} fill="none" stroke="#1f6c3d" strokeWidth="3" />
                  {chartPoints.map((point) => (
                    <g key={`point-line-${point.year}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={point.isPartialYear ? "#b27a1f" : "#1f6c3d"}
                      />
                      <text
                        x={point.x}
                        y={point.y - 10}
                        textAnchor="middle"
                        className="wstawienia-chart-value wstawienia-chart-point-value"
                      >
                        {Math.round(point.total).toLocaleString("pl-PL")}
                        {point.isPartialYear ? "*" : ""}
                      </text>
                    </g>
                  ))}
                </g>

                <g className="wstawienia-series wstawienia-series-bar">
                  {chartPoints.map((point) => (
                    <g key={`point-bar-${point.year}`}>
                      {(() => {
                        const rawBarX = point.x - barWidth / 2;
                        const minBarX = chartPadding.left;
                        const maxBarX = chartWidth - chartPadding.right - barWidth;
                        const barX = Math.max(minBarX, Math.min(rawBarX, maxBarX));
                        const barLabelX = barX + barWidth / 2;

                        return (
                          <>
                            <rect
                              x={barX}
                              y={Math.min(point.y, totalZeroY)}
                              width={barWidth}
                              height={Math.abs(totalZeroY - point.y)}
                              fill={point.isPartialYear ? "#d4a24a" : "#3e8a57"}
                            />
                            <text
                              x={barLabelX}
                              y={point.y - 8}
                              textAnchor="middle"
                              className="wstawienia-chart-value wstawienia-chart-point-value"
                            >
                              {Math.round(point.total).toLocaleString("pl-PL")}
                              {point.isPartialYear ? "*" : ""}
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  ))}
                </g>

                {chartPoints.map((point) => (
                  <text
                    key={`x-label-${point.year}`}
                    x={point.x}
                    y={chartHeight - chartPadding.bottom + 20}
                    textAnchor="middle"
                    className="wstawienia-chart-year"
                  >
                    {formatWstawieniaYearLabel(point.year)}
                  </text>
                ))}
              </svg>
              {dynamicsPoints.length > 0 && (
                <svg
                  className="wstawienia-chart-canvas wstawienia-chart-canvas-dynamics"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label="Wykres dynamiki rocznej"
                >
                  <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />

                  {dynamicsTicks.map((tick, index) => (
                    <g key={`dynamics-tick-${index}`}>
                      <line
                        x1={chartPadding.left}
                        y1={tick.y}
                        x2={chartWidth - chartPadding.right}
                        y2={tick.y}
                        className="wstawienia-chart-grid-line"
                      />
                      <text
                        x={chartPadding.left - 10}
                        y={tick.y + 4}
                        textAnchor="end"
                        className="wstawienia-chart-value"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  <line
                    x1={chartPadding.left}
                    y1={dynamicsZeroY}
                    x2={chartWidth - chartPadding.right}
                    y2={dynamicsZeroY}
                    stroke="#b8b5ad"
                  />
                  <line
                    x1={chartPadding.left}
                    y1={chartPadding.top}
                    x2={chartPadding.left}
                    y2={chartHeight - chartPadding.bottom}
                    stroke="#b8b5ad"
                  />

                  <path d={dynamicsPath} fill="none" stroke="#a3471f" strokeWidth="3" />
                  {dynamicsPoints.map((point) => (
                    <g key={`dynamics-point-${point.year}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={point.isPartial ? "#b27a1f" : "#a3471f"}
                      />
                      <text
                        x={point.x}
                        y={point.y - 10}
                        textAnchor="middle"
                        className="wstawienia-chart-value wstawienia-chart-point-value"
                      >
                        {`${point.dynamics.toFixed(1).replace(".", ",")}%`}
                        {point.isPartial ? "*" : ""}
                      </text>
                      <text
                        x={point.x}
                        y={chartHeight - chartPadding.bottom + 20}
                        textAnchor="middle"
                        className="wstawienia-chart-year"
                      >
                        {formatWstawieniaYearLabel(point.year)}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
              {dynamicsPoints.some((point) => point.isPartial) && (
                <p className="wstawienia-chart-note">
                  * Dynamika częściowa: porównanie narastająco dla analogicznego okresu
                  rok do roku (np. 2026 vs 2025 dla dostępnych miesięcy).
                </p>
              )}
              {chartPoints.some((point) => point.isPartialYear) && (
                <p className="wstawienia-chart-note">
                  * 2026: wartość częściowa (narastająco), bo pełna wartość roczna nie jest
                  jeszcze dostępna w źródle.
                </p>
              )}
              </div>
            </section>
          )}

          {lastEditText && <p className="wstawienia-meta-line">{lastEditText}</p>}
          {opracowanieText && (
            <p className="wstawienia-meta-line">
              <strong>Opracowanie:</strong>{" "}
              {beforeEmail}
              {emailMatch && (
                <>
                  <a href={`mailto:${emailMatch[0]}`}>{emailMatch[0]}</a>
                  {afterEmail ? ` ${afterEmail}` : ""}
                </>
              )}
            </p>
          )}

          <a className="source-link source-link-inline" href={resolvedSource}>
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
          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "raporty") {
    const reportTitleIndexes = [1, 4, 5, 7, 8, 10];
    const reportItems = Array.from(
      new Map(
        reportTitleIndexes
          .map((paragraphIndex, linkIndex) => {
            const link = links[linkIndex];

            if (!link) {
              return null;
            }

            const paragraphTitle = visibleParagraphs[paragraphIndex]?.trim();
            const fallbackLabel = link.label.replace(/^POBIERZ\s+/i, "").trim();

            return {
              href: link.href,
              label: paragraphTitle || fallbackLabel || `Raport ${linkIndex + 1}`,
            };
          })
          .filter((item): item is { href: string; label: string } => item !== null)
          .filter((item) => {
            if (!item.label) {
              return false;
            }

            const normalized = item.label.toLocaleLowerCase("pl");
            return normalized !== "otwórz źródło" && normalized !== "czytaj dalej";
          })
          .map((item) => [item.href, item]),
      ).values(),
    );

    const introParagraph = visibleParagraphs
      .map((paragraph) => paragraph.trim())
      .find((paragraph) => paragraph && !/^raporty$/i.test(paragraph));

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          <h2>Materiały i raporty</h2>
          {introParagraph && <p>{introParagraph}</p>}
          <ul className="report-material-list">
            {reportItems.map((item) => (
              <li key={item.href}>
                <a className="report-material-link" href={item.href}>
                  <span>{item.label}</span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "kraje-trzecie") {
    const downloadHref =
      "https://krd-ig.com.pl/wp-content/uploads/2024/09/KLUCZOWE-KIERUNKI-EKSPORTOWE-DLA-POLSKIEGO-DROBIARSTWA-1.pdf";
    const countryFlags = new Map<string, { src: string; alt: string }>([
      ["CHINY", { src: "/media/flags/cn.svg", alt: "Flaga Chin" }],
      ["JAPONIA", { src: "/media/flags/jp.svg", alt: "Flaga Japonii" }],
      ["RPA", { src: "/media/flags/za.svg", alt: "Flaga Republiki Południowej Afryki" }],
      ["SINGAPUR", { src: "/media/flags/sg.svg", alt: "Flaga Singapuru" }],
    ]);

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-justified prose-third-countries">
          {visibleParagraphs.map((paragraph, index) => {
            const normalized = paragraph.trim();
            const normalizedUpper = normalized.toLocaleUpperCase("pl");
            const countryFlag = countryFlags.get(normalizedUpper);

            if (normalizedUpper === "POBIERZ") {
              return (
                <h2 className="third-countries-download" key={`${index}-${normalized}`}>
                  <a href={downloadHref}>POBIERZ</a>
                </h2>
              );
            }

            if (countryFlag) {
              return (
                <h2 className="third-countries-country-heading" key={`${index}-${normalized}`}>
                  <img
                    className="third-countries-flag"
                    src={withBasePath(countryFlag.src)}
                    alt={countryFlag.alt}
                    width={36}
                    height={24}
                  />
                  {normalized}
                </h2>
              );
            }

            if (index > 0 && looksLikeHeading(paragraph)) {
              return <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>;
            }

            return <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>;
          })}

          <a className="source-link source-link-inline" href={resolvedSource}>
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
          <a className="source-link source-link-inline" href={resolvedSource}>
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

          <a className="source-link source-link-inline" href={resolvedSource}>
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

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "kampanie") {
    const normalizeText = (value: string) =>
      value
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[„”]/g, '"')
        .toLocaleLowerCase("pl");

    const toSingleSentence = (value: string) => {
      const clean = value.trim().replace(/\s+/g, " ").replace(/\.\.\.$/, ".");
      const firstSentence = clean.match(/^[^.!?]+[.!?]/)?.[0];
      if (firstSentence) {
        return firstSentence.trim();
      }
      return clean.endsWith(".") ? clean : `${clean}.`;
    };

    const datePattern = /^\d{1,2}\s+[a-z]{3}\s+\d{4}$/i;
    const normalizedParagraphs = visibleParagraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
    const dateByTitle = new Map<string, string>();
    const summaryByTitle = new Map<string, string>();

    const knownTitles = new Set(
      links
        .filter((link) => {
          const normalized = link.label.trim().toLocaleLowerCase("pl");
          return normalized !== "otwórz źródło" && normalized !== "czytaj dalej";
        })
        .map((link) => normalizeText(link.label)),
    );

    for (let index = 0; index < normalizedParagraphs.length - 1; index += 1) {
      const current = normalizedParagraphs[index];
      const next = normalizedParagraphs[index + 1];
      if (datePattern.test(next)) {
        dateByTitle.set(normalizeText(current), next);
      }

      const normalizedCurrent = normalizeText(current);
      if (!knownTitles.has(normalizedCurrent)) {
        continue;
      }

      const hasDate = datePattern.test(next);
      const summaryCandidate = hasDate ? normalizedParagraphs[index + 2] : next;
      if (!summaryCandidate) {
        continue;
      }

      const normalizedSummary = normalizeText(summaryCandidate);
      if (datePattern.test(summaryCandidate) || knownTitles.has(normalizedSummary)) {
        continue;
      }

      summaryByTitle.set(normalizedCurrent, toSingleSentence(summaryCandidate));
    }

    const campaignLinks = Array.from(
      new Map(
        links
          .filter((link) => {
            const normalized = link.label.trim().toLocaleLowerCase("pl");
            return normalized !== "otwórz źródło" && normalized !== "czytaj dalej";
          })
          .map((link) => [link.href, link]),
      ).values(),
    ).map((link) => {
      const href = /^https?:\/\//i.test(link.href) ? link.href : withBasePath(link.href);
      return {
        title: link.label.trim(),
        href,
        date: dateByTitle.get(normalizeText(link.label.trim())),
        summary:
          summaryByTitle.get(normalizeText(link.label.trim())) ??
          "Zobacz szczegoly kampanii w materiale zrodlowym.",
      };
    });

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-kampanie">
          <h2>Realizowane kampanie</h2>
          <p>
            Zestawienie obejmuje aktualne i archiwalne działania promocyjno-edukacyjne KRD-IG.
            Poniżej znajduje się uporządkowana lista kampanii wraz z odnośnikami do materiałów.
          </p>

          <ul className="kampanie-list" aria-label="Lista kampanii">
            {campaignLinks.map((item) => (
              <li key={`${item.href}-${item.title}`} className="kampanie-list-item">
                <a href={item.href}>
                  <span className="kampanie-main">
                    <span className="kampanie-title">{item.title.toLocaleUpperCase("pl")}</span>
                    <span className="kampanie-summary">{item.summary}</span>
                  </span>
                  {item.date && <span className="kampanie-date">{item.date}</span>}
                </a>
              </li>
            ))}
          </ul>

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "dolacz-do-nas") {
    const downloadHref =
      links.find((link) => link.label.trim().toLocaleUpperCase("pl") === "POBIERZ")?.href ??
      "https://krd-ig.com.pl/wp-content/uploads/2025/02/Deklaracja-przystapienia-do-Izby-2023.doc";

    const voivodeships = [
      "kujawsko-pomorskie",
      "lubelskie",
      "lubuskie",
      "łódzkie",
      "małopolskie",
      "mazowieckie",
      "opolskie",
      "podkarpackie",
      "podlaskie",
      "pomorskie",
      "śląskie",
      "świętokrzyskie",
      "warmińsko-mazurskie",
      "wielkopolskie",
      "zachodniopomorskie",
    ];

    const businessScopes = [
      "Ferma hodowlana",
      "Ferma reprodukcyjna",
      "Ferma zarodowa",
      "Jednostka naukowo-badawcza",
      "Produkcja jaj spożywczych",
      "Produkcja puchu i pierza",
      "Produkcja towarzysząca",
      "Produkcja/mieszalnia pasz",
      "Przetwórstwo",
      "Ubojnia",
      "Zakład wylęgowy",
      "Inne",
    ];

    const poultrySpecies = ["Kurczak", "Kaczka", "Gęś", "Indyk", "Perliczka", "Inne"];
    const assortments = ["Świeże", "Mrożone", "Przetwory", "Inne"];
    const certifications = ["BRC", "Halal", "IFS", "Kosher", "QAFP", "Red Tractor", "Inne"];
    const exportPermits = [
      "Arabia Saudyjska",
      "Białoruś",
      "Chiny",
      "Egipt",
      "Japonia",
      "Kanada",
      "Korea Pd.",
      "Kuba",
      "RPA",
      "Singapur",
      "Tajwan",
      "Ukraina",
      "USA",
      "Wietnam",
      "Inne",
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-dolacz">
          <p>{visibleParagraphs[0]}</p>
          <p>{visibleParagraphs[1]}</p>

          <section className="dolacz-download" aria-label="Pobierz deklarację członkowską">
            <h2>POBIERZ</h2>
            <a className="dolacz-download-link" href={downloadHref}>
              Pobierz deklarację członkowską
            </a>
          </section>

          <section className="dolacz-section">
            <h2>Wypełnij formularz i dołącz do nas</h2>
            <p>
              Uzupełnij dane firmy i wybierz pola działalności, aby przesłać kompletne zgłoszenie
              członkowskie.
            </p>
          </section>

          <MembershipSignupForm
            voivodeships={voivodeships}
            businessScopes={businessScopes}
            poultrySpecies={poultrySpecies}
            assortments={assortments}
            certifications={certifications}
            exportPermits={exportPermits}
          />

          <a className="source-link source-link-inline" href={resolvedSource}>
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

          <a className="source-link source-link-inline" href={resolvedSource}>
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
        <article className="prose prose-poszanowanie-icons">
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

          <a className="source-link source-link-inline" href={resolvedSource}>
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

    const normalizeSegmentHeadingText = (value: string) =>
      value
        .replace(/^\s*##+\s*/u, "")
        .replace(
          /^Na czym polega segmentacja rynku drobiu\?i$/iu,
          "Na czym polega segmentacja rynku drobiu?",
        )
        .trim();

    const normalizeSegmentDisplayText = (value: string) =>
      normalizeSegmentHeadingText(value)
        .replace(/^\*\*(.+)\*\*$/u, "$1")
        .trim();

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
      const normalized = normalizeSegmentHeadingText(value);

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
            const displayParagraph = normalizeSegmentDisplayText(paragraph);

            if (
              /^Podział certyfikowanego mięsa drobiowego we Francji prezentuje się następująco:/i.test(
                displayParagraph,
              )
            ) {
              return (
                <div className="segment-table-wrap" key={`${index}-${paragraph.slice(0, 24)}`}>
                  <h2>{displayParagraph}</h2>
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

            if (/^Wstępna ropozycja segmentacji polskiego drobiu:/i.test(displayParagraph)) {
              return (
                <div className="segment-table-wrap" key={`${index}-${paragraph.slice(0, 24)}`}>
                  <h2>{displayParagraph}</h2>
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

            if (isTableDataParagraph(displayParagraph)) {
              return null;
            }

            if (isSectionHeading(displayParagraph)) {
              const headingText = normalizeSegmentDisplayText(displayParagraph);

              return <h2 key={`${index}-${paragraph.slice(0, 24)}`}>{headingText}</h2>;
            }

            if (/^Gwarancj[ęe]/i.test(displayParagraph)) {
              return (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>
                  <strong>{displayParagraph}</strong>
                </p>
              );
            }

            return <p key={`${index}-${paragraph.slice(0, 24)}`}>{displayParagraph}</p>;
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

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "akty-prawne") {
    const normalizedParagraphs = visibleParagraphs
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const domainHeadings = new Set(["POLSKA", "UNIA EUROPEJSKA"]);
    const categoryHeadingPattern =
      /^(Bezpieczeństwo żywności|Jakość żywności oraz normy handlowe|Warunki hodowli i dobrostan drobiu|Farmacja weterynaryjna i pozostałości leków|Produkcja ekologiczna|Choroby zakaźne drobiu|Produkty uboczne pochodzenia zwierzęcego, odpady, utylizacja, ochrona środowiska|Inne)$/i;
    const legalActPattern = /^(Ustawa|Rozporządzenie|Dyrektywa)\b/i;

    type LegalListItem =
      | { type: "domain"; text: string }
      | { type: "category"; text: string }
      | { type: "act"; text: string; href: string };

    const legalItems: LegalListItem[] = [];
    let currentDomain = "";
    let currentCategory = "";
    let linkCursor = 0;

    for (const paragraph of normalizedParagraphs) {
      const upper = paragraph.toLocaleUpperCase("pl");

      if (domainHeadings.has(upper)) {
        currentDomain = upper;
        currentCategory = "";
        legalItems.push({ type: "domain", text: upper });
        continue;
      }

      if (categoryHeadingPattern.test(paragraph)) {
        currentCategory = paragraph;
        legalItems.push({ type: "category", text: paragraph });
        continue;
      }

      if (/^\(Dz\./i.test(paragraph) && legalItems.length > 0) {
        const lastItem = legalItems[legalItems.length - 1];
        if (lastItem.type === "act") {
          lastItem.text = `${lastItem.text} ${paragraph}`;
        }
        continue;
      }

      if (!legalActPattern.test(paragraph)) {
        continue;
      }

      const assignedLink = links[linkCursor];
      const href = assignedLink ? resolveArticleHref(assignedLink.href) : resolvedSource;
      linkCursor += 1;

      if (!currentDomain) {
        currentDomain = "POLSKA";
        legalItems.push({ type: "domain", text: currentDomain });
      }

      legalItems.push({ type: "act", text: paragraph, href });
    }

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose legal-acts-prose">
          <div className="legal-acts-list" aria-label="Lista aktów prawnych">
            {legalItems.map((item, index) => {
              if (item.type === "domain") {
                return (
                  <h2 className="legal-domain-heading" key={`legal-domain-${index}-${item.text}`}>
                    {item.text}
                  </h2>
                );
              }

              if (item.type === "category") {
                return (
                  <h3 className="legal-category-heading" key={`legal-category-${index}-${item.text}`}>
                    {item.text}
                  </h3>
                );
              }

              return (
                <article className="legal-act-card" key={`legal-act-${index}-${item.text.slice(0, 28)}`}>
                  <p>
                    <a
                      className="legal-act-title-link"
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.text}
                    </a>
                  </p>
                </article>
              );
            })}
          </div>

          <a className="source-link source-link-inline" href={resolvedSource}>
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

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "jakosc-i-bezpieczenstwo") {
    const qualityPictogram = (kind: string) => {
      if (kind === "shield") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2L4 5v6c0 5 3.5 9.4 8 11 4.5-1.6 8-6 8-11V5l-8-3z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M8.2 12.3l2.4 2.3 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      }
      if (kind === "certificate") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="4" y="3.5" width="16" height="13" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M7 7h10M7 10h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M10 16.5l-1 4 3-1.4 3 1.4-1-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      }
      if (kind === "label") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3.5 11l7.5-7.5h7.5v7.5L11 18.5 3.5 11z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
            <circle cx="15.5" cy="8.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.7"/>
          </svg>
        );
      }
      if (kind === "layers") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3zM4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
        );
      }
      if (kind === "chain") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 8.5h6.5M13.5 15.5H20M10.5 8.5l3 7M8 15.5l2.5-7M13.5 8.5l2.5 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="4" cy="8.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.7"/>
            <circle cx="20" cy="15.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.7"/>
          </svg>
        );
      }
      if (kind === "trace") {
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M15.2 15.2L20 20M8 10.5h5M10.5 8v5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        );
      }
      return null;
    };

    const qualityBlock = (kind: string, content: ReactNode) => (
      <div className="jakosc-block">
        <span className="jakosc-pictogram">{qualityPictogram(kind)}</span>
        <div className="jakosc-block-content">{content}</div>
      </div>
    );

    const thematicLinks = [
      { title: "System QAFP", href: withBasePath("/tresc/system-qafp") },
      { title: "Segmentacja", href: withBasePath("/tresc/segmentacja") },
      { title: "Zdrowy drób", href: withBasePath("/tresc/zdrowy-drob") },
      { title: "Bezpieczna produkcja", href: withBasePath("/tresc/bezpieczna-produkcja") },
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-jakosc-blocks">
          <h2>Jakość i bezpieczeństwo polskiego drobiarstwa</h2>
          {qualityBlock(
            "shield",
            <p>
              Priorytetem branży drobiarskiej jest dostarczanie produktów o potwierdzonej jakości,
              pełnej identyfikowalności oraz wysokim poziomie bezpieczeństwa zdrowotnego.
            </p>,
          )}

          <h2>System QAFP</h2>
          {qualityBlock(
            "certificate",
            <p>
              System Gwarantowanej Jakości Żywności QAFP to krajowy system certyfikacji, który
              obejmuje kontrolę na etapach hodowli, produkcji i dystrybucji.
            </p>,
          )}
          {qualityBlock(
            "label",
            <p>
              <strong>Oznaczenie QAFP</strong> potwierdza, że produkt spełnia ściśle określone
              standardy jakościowe i bezpieczeństwa.
            </p>,
          )}

          <h2>Segmentacja i transparentność</h2>
          {qualityBlock(
            "layers",
            <p>
              Segmentacja produktowa porządkuje kategorie żywności według jasno zdefiniowanych
              cech, dzięki czemu odbiorcy otrzymują czytelną informację o charakterystyce i jakości
              kupowanego produktu.
            </p>,
          )}

          <h2>Zdrowy drób i podejście od pola do stołu</h2>
          {qualityBlock(
            "chain",
            <p>
              W unijnym modelu produkcji żywności nadrzędna jest zasada od pola do stołu,
              zakładająca ciągły nadzór nad całym łańcuchem produkcyjnym.
            </p>,
          )}
          {qualityBlock(
            "trace",
            <p>
              <strong>Kluczową rolę odgrywa identyfikowalność (traceability)</strong>, która
              umożliwia monitorowanie pochodzenia i jakości produktów drobiowych na każdym etapie.
            </p>,
          )}

          <h2>Materiały tematyczne</h2>
          <div className="resource-box">
            {thematicLinks.map((item) => (
              <a href={item.href} key={`${item.href}-${item.title}`}>
                <span>{item.title}</span>
                <Arrow />
              </a>
            ))}
          </div>

          <a className="source-link source-link-inline" href={resolvedSource}>
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

  if (slug === "metodyka-i-biuletyny") {
    const metodykaHref = "https://krd-ig.com.pl/metodyka-1-2026/";

    const biuletyn2020 = [
      { label: "Okładka i spis treści", href: "https://krd-ig.com.pl/okladka-afiliacja_2020/" },
      { label: "Rozdział 1", href: "https://krd-ig.com.pl/rozdzial-1_2020/" },
      { label: "Rozdział 2", href: "https://krd-ig.com.pl/rozdzial-2_2020/" },
      { label: "Rozdział 3", href: "https://krd-ig.com.pl/rozdzial-3_2020/" },
      { label: "Rozdział 4", href: "https://krd-ig.com.pl/rozdzial-4_2020/" },
      { label: "Rozdział 5", href: "https://krd-ig.com.pl/rozdzial-5_2020/" },
      { label: "Rozdział 6", href: "https://krd-ig.com.pl/rozdzial-6_2020/" },
      { label: "Rozdział 7", href: "https://krd-ig.com.pl/rozdzial-7_2020/" },
      { label: "Rozdział 8", href: "https://krd-ig.com.pl/rozdzial-8_2020/" },
      { label: "Rozdział 9", href: "https://krd-ig.com.pl/rozdzial-9_2020/" },
    ];

    const biuletyn2021 = [
      { label: "Okładka i spis treści", href: "https://krd-ig.com.pl/okladka-afiliacja_2021/" },
      { label: "Rozdział 1", href: "https://krd-ig.com.pl/rozdzial-1_2021/" },
      { label: "Rozdział 2", href: "https://krd-ig.com.pl/rozdzial-2_2021/" },
      { label: "Rozdział 3", href: "https://krd-ig.com.pl/rozdzial-3_2021/" },
      { label: "Rozdział 4", href: "https://krd-ig.com.pl/rozdzial-4_2021/" },
      { label: "Rozdział 5", href: "https://krd-ig.com.pl/rozdzial-5_2021/" },
      { label: "Rozdział 6", href: "https://krd-ig.com.pl/rozdzial-6_2021/" },
      { label: "Rozdział 7", href: "https://krd-ig.com.pl/rozdzial-7_2021/" },
      { label: "Rozdział 8", href: "https://krd-ig.com.pl/rozdzial-8_2021/" },
      { label: "Rozdział 9", href: "https://krd-ig.com.pl/rozdzial-9_2021/" },
    ];

    const biuletyn2022 = [
      { label: "Okładka i spis treści", href: "https://krd-ig.com.pl/okladka-afiliacja_2022/" },
      { label: "Rozdział 1", href: "https://krd-ig.com.pl/rozdzial-1_2022/" },
      { label: "Rozdział 2", status: "w opracowaniu" },
      { label: "Rozdział 3", href: "https://krd-ig.com.pl/rozdzial-3_2022/" },
      { label: "Rozdział 4", href: "https://krd-ig.com.pl/rozdzial-4_2022/" },
      { label: "Rozdział 5", status: "w opracowaniu" },
      { label: "Rozdział 6", href: "https://krd-ig.com.pl/rozdzial-6_2022/" },
      { label: "Rozdział 7", href: "https://krd-ig.com.pl/rozdzial-7_2022/" },
      { label: "Tabela 65", href: "https://krd-ig.com.pl/rozdzial-7_2022/" },
      { label: "Rozdział 8", href: "https://krd-ig.com.pl/rozdzial-8_2022/" },
      { label: "Rozdział 9", href: "https://krd-ig.com.pl/rozdzial-9_2022/" },
      { label: "Spis treści", href: "https://krd-ig.com.pl/spis-tresci-strona-3_2022/" },
    ];

    const biuletyny2023 = [
      { label: "Biuletyn kur mięsnych (2023)", status: "w opracowaniu" },
      { label: "Biuletyn indyków (2023)", href: "https://krd-ig.com.pl/biuletyn-indyki-2023/" },
      { label: "Biuletyn kur nieśnych (2023)", status: "w opracowaniu" },
      {
        label: "Biuletyn drobiu wodnego (2023)",
        href: "https://krd-ig.com.pl/wp-content/uploads/2025/10/Biuletyn_Drob_wodny_2023.pdf",
      },
    ];

    const biuletyny2024 = [
      { label: "Biuletyn kur mięsnych (2024)", status: "w opracowaniu" },
      { label: "Biuletyn indyków (2024)", href: "https://krd-ig.com.pl/biuletyn-indyki-2024/" },
      { label: "Biuletyn kur nieśnych (2024)", status: "w opracowaniu" },
      {
        label: "Biuletyn drobiu wodnego (2024)",
        href: "https://krd-ig.com.pl/wp-content/uploads/2025/10/Biuletyn_Drob_wodny_2024.pdf",
      },
    ];

    const legalBases = [
      {
        label:
          "Ustawa z dnia 10.12.2020 r. o organizacji hodowli i rozrodzie zwierząt gospodarskich (Dz.U. 2021 poz. 36)",
        href: "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20210000036/O/D20210036.pdf",
      },
      {
        label:
          "Rozporządzenie MRiRW z dnia 1.07.2021 r. w sprawie szczegółowych wymagań dla prowadzenia księgi hodowlanej (Dz.U. 2021 poz. 1248)",
        href: "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20210001248/O/D20211248.pdf",
      },
      {
        label:
          "Rozporządzenie MRiRW z dnia 24.01.2022 r. w sprawie upoważnienia do prowadzenia oceny wartości użytkowej i genetycznej (Dz.U. 2022 poz. 177)",
        href: "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20220000177/O/D20220177.pdf",
      },
    ];

    const ksiegi2023 = [
      {
        category: "Kury nieśne",
        items: [
          {
            label: "MIENIA",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_KURY-NIESNE_MESSA_2023.pdf",
          },
          {
            label: "RSZEW",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_KURY-NIESNE_RSZEW_2023.pdf",
          },
          {
            label: "UR KRAKÓW",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_KUR_UR-KRAKOW_2023.pdf",
          },
          { label: "A. SKÓRNICKA", status: "w opracowaniu" },
        ],
      },
      {
        category: "Kaczki",
        items: [
          {
            label: "ADAM BELT",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_KACZKI_ADAM-BELT__2023.pdf",
          },
          { label: "IZ-PIB DWORZYSKA", status: "w opracowaniu" },
        ],
      },
      {
        category: "Gęsi",
        items: [
          {
            label: "IZ-PIB KOŁUDA WIELKA",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI-_GESI_KOLUDA_2023.pdf",
          },
          {
            label: "UR KRAKÓW",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_GESI_UR-KRAKOW_2023.pdf",
          },
          {
            label: "UP WROCŁAW",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_GESI_UP_WROCLAW_2023.pdf",
          },
          {
            label: "M. ŁAJKOWSKA - KOŁODZIEJ",
            href: "https://krd-ig.com.pl/wp-content/uploads/2025/07/KSIEGI_GESI_KOLODZIEJ_2023.pdf",
          },
        ],
      },
    ];

    const ksiegi2024 = [
      {
        category: "Kury nieśne",
        items: ["MIENIA", "RSZEW", "UR KRAKÓW", "A. SKÓRNICKA"],
      },
      {
        category: "Kaczki",
        items: ["ADAM BELT", "IZ-PIB DWORZYSKA"],
      },
      {
        category: "Gęsi",
        items: ["IZ-PIB KOŁUDA WIELKA", "UR KRAKÓW", "UP WROCŁAW", "M. ŁAJKOWSKA - KOŁODZIEJ"],
      },
    ];

    const renderLinkList = (
      items: Array<{ label: string; href?: string; status?: string }>,
      listKey: string,
    ) => (
      <ul className="metodyka-list">
        {items.map((item, index) => (
          <li key={`${listKey}-${index}-${item.label}`}>
            {item.href ? (
              <a href={item.href}>
                <span>{item.label}</span>
                <Arrow />
              </a>
            ) : (
              <span className="metodyka-list-muted">
                {item.label} - {item.status ?? "w opracowaniu"}
              </span>
            )}
          </li>
        ))}
      </ul>
    );

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose metodyka-prose">
          <h2>Zakres i metodyka (wersja 1.2026)</h2>
          {renderLinkList([{ label: "POBIERZ", href: metodykaHref }], "metodyka-main")}

          <h2>Biuletyn wyników oceny wartości użytkowej drobiu - 2020</h2>
          {renderLinkList(biuletyn2020, "biuletyn-2020")}

          <h2>Biuletyn wyników oceny wartości użytkowej drobiu - 2021</h2>
          {renderLinkList(biuletyn2021, "biuletyn-2021")}

          <h2>Biuletyn wyników oceny wartości użytkowej drobiu - 2022</h2>
          {renderLinkList(biuletyn2022, "biuletyn-2022")}

          <h2>Biuletyny wyników oceny wartości użytkowej drobiu - 2023</h2>
          {renderLinkList(biuletyny2023, "biuletyny-2023")}

          <h2>Biuletyny wyników oceny wartości użytkowej drobiu - 2024</h2>
          {renderLinkList(biuletyny2024, "biuletyny-2024")}

          <h2>Księgi hodowlane drobiu</h2>
          <h3>Podstawy prawne</h3>
          {renderLinkList(legalBases, "legal-bases")}

          <h3>Księgi - 2023</h3>
          {ksiegi2023.map((group) => (
            <section key={`ksiegi-2023-${group.category}`}>
              <h4>{group.category}</h4>
              {renderLinkList(group.items, `ksiegi-2023-${group.category}`)}
            </section>
          ))}

          <h3>Księgi - 2024</h3>
          {ksiegi2024.map((group) => (
            <section key={`ksiegi-2024-${group.category}`}>
              <h4>{group.category}</h4>
              <ul className="metodyka-list">
                {group.items.map((item) => (
                  <li key={`ksiegi-2024-${group.category}-${item}`}>
                    <span className="metodyka-list-muted">{item} - w opracowaniu</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "cennik") {
    const cennikDocumentHref =
      "https://krd-ig.com.pl/wp-content/uploads/2026/02/Cennik-od-01.02.2026-r.pdf";

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose">
          {visibleParagraphs.map((paragraph, index) => {
            const normalizedUpper = paragraph.trim().toLocaleUpperCase("pl");

            if (normalizedUpper === "POBIERZ") {
              return (
                <h2 key={`${index}-cennik-download`}>
                  <a className="cennik-download-link" href={cennikDocumentHref}>POBIERZ</a>
                </h2>
              );
            }

            return index > 0 && looksLikeHeading(paragraph) ? (
              <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
            ) : (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
            );
          })}
          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "dane-kontaktowe") {
    const specialists = [
      { name: "Eugeniusz Wencek", phone: "698 630 690", email: "e.wencek@krd-ig.pl" },
      { name: "Iwona Kałużna", phone: "698 688 013", email: "poznan@krd-ig.pl" },
      { name: "Aleksandra Głębocka", phone: "698 630 688", email: "a.glebocka@krd-ig.pl" },
      { name: "Dominik Kędzierski", phone: "698 630 691", email: "d.kedzierski@krd-ig.pl" },
      { name: "Agnieszka Sobierajska", phone: "698 630 696", email: "a.sobierajska@krd-ig.pl" },
      { name: "Mateusz Grzelak", phone: "698 630 689", email: "m.grzelak@krd-ig.pl" },
      { name: "Marta Pałyszka", phone: "698 630 692", email: "m.palyszka@krd-ig.pl" },
      { name: "Wojciech Suchocki", phone: "698 630 697", email: "w.suchocki@krd-ig.pl" },
      { name: "Łukasz Kozak", phone: "698 630 694", email: "l.kozak@krd-ig.pl" },
      { name: "Krzysztof Winiarski", phone: "698 630 695", email: "k.winiarski@krd-ig.pl" },
    ];

    const coverageRows = [
      {
        specialist: "Mateusz Grzelak",
        phone: "698 630 689",
        email: "m.grzelak@krd-ig.pl",
        coverage:
          "kujawsko-pomorskie (wszystkie), pomorskie (wszystkie), zachodniopomorskie (wszystkie), warmińsko-mazurskie (iławski, nowomiejski, Miłomłyn)",
      },
      {
        specialist: "Marta Pałyszka",
        phone: "698 630 692",
        email: "m.palyszka@krd-ig.pl",
        coverage:
          "lubelskie (wszystkie), małopolskie (brzeski, dąbrowski, gorlicki, nowosądecki, tarnowski, Tarnów, Nowy Sącz), mazowieckie (białobrzeski, garwoliński, grodziski, grójecki, kozienicki, lipski, łosicki, miński, otwocki, piaseczyński, pruszkowski, przysuski, radomski, siedlecki, sokołowski, szydłowiecki, węgrowski, wołomiński, zwoleński, żyrardowski, Radom, Siedlce), podkarpackie (wszystkie), świętokrzyskie (wszystkie)",
      },
      {
        specialist: "Wojciech Suchocki",
        phone: "698 630 697",
        email: "w.suchocki@krd-ig.pl",
        coverage:
          "lubuskie (wszystkie), wielkopolskie (chodzieski, czarnkowsko-trzcianecki, gnieźnieński, gostyński, grodziski, jarociński, kaliski, kępiński, kościański, krotoszyński, leszczyński, międzychodzki, nowotomyski, obornicki, ostrowski, ostrzeszowski, pilski, pleszewski, poznański, rawicki, słupecki, szamotulski, średzki, śremski, wągrowiecki, wolsztyński, wrzesiński, złotowski, Poznań, Kalisz, Leszno)",
      },
      {
        specialist: "Krzysztof Winiarski",
        phone: "698 630 695",
        email: "k.winiarski@krd-ig.pl",
        coverage:
          "śląskie (wszystkie), mazowieckie (mławski, sierpecki, żuromiński), dolnośląskie (wszystkie), małopolskie (bocheński, chrzanowski, krakowski, limanowski, miechowski, myślenicki, nowotarski, olkuski, oświęcimski, proszowicki, suski, tatrzański, wadowicki, wielicki), wielkopolskie (kolski, koniński, turecki, Konin)",
      },
      {
        specialist: "Łukasz Kozak",
        phone: "698 630 694",
        email: "l.kozak@krd-ig.pl",
        coverage: "opolskie (wszystkie)",
      },
      {
        specialist: "Agnieszka Sobierajska",
        phone: "698 630 696",
        email: "a.sobierajska@krd-ig.pl",
        coverage:
          "podlaskie (wszystkie), łódzkie (wszystkie), mazowieckie (ciechanowski, gostyniński, legionowski, makowski, nowodworski, ostrołęcki, ostrowski, płocki, płoński, przasnyski, pułtuski, sochaczewski, warszawski zachodni, wyszkowski), warmińsko-mazurskie (bartoszycki, braniewski, działdowski, elbląski, ełcki, giżycki, gołdapski, kętrzyński, lidzbarski, mrągowski, nidzicki, olecki, olsztyński, ostródzki, piski, szczycieński, węgorzewski)",
      },
    ];


    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose hodowla-contact-prose">
          <section className="hodowla-contact-grid">
            <article className="hodowla-contact-card">
              <h2>Dział Hodowli i Oceny Drobiu</h2>
              <p>ul. Naramowicka 144, skr. poczt. 11, 60-975 Poznań</p>
              <p>
                <a href="tel:+48618242651">+48 61 824 26 51/52</a>
                <br />
                <a href="tel:+48618242653">+48 61 824 26 53</a>
              </p>
              <p>
                <a href="mailto:poznan@krd-ig.pl">poznan@krd-ig.pl</a>
              </p>
            </article>

            <article className="hodowla-contact-card">
              <h2>Kierownik Działu KRD-IG</h2>
              <p>
                <strong>dr inż. Eugeniusz Wencek</strong>
              </p>
              <p>
                <a href="tel:+48618244911">tel. 61 824 49 11</a>
                <br />
                <a href="tel:+48698630690">kom. 698 630 690</a>
              </p>
              <p>
                <a href="mailto:e.wencek@krd-ig.pl">e.wencek@krd-ig.pl</a>
              </p>
            </article>
          </section>

          <h2>
            Wykaz telefonów komórkowych oraz adresów mailowych specjalistów ds. hodowli i oceny
            drobiu
          </h2>
          <div className="segment-table-wrap">
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Lp.</th>
                  <th>Imię i nazwisko</th>
                  <th>Numer telefonu</th>
                  <th>Adres e-mailowy</th>
                </tr>
              </thead>
              <tbody>
                {specialists.map((item, index) => (
                  <tr key={`specialist-${item.name}`}>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>
                      <a href={`tel:+48${item.phone.replace(/\s+/g, "")}`}>{item.phone}</a>
                    </td>
                    <td>
                      <a href={`mailto:${item.email}`}>{item.email}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="hodowla-contact-grid">
            <article className="hodowla-contact-card">
              <h2>Informatyk</h2>
              <p>
                <strong>Rafał Michałowski</strong>
              </p>
              <p>
                <a href="mailto:rmich@krd-ig.pl">rmich@krd-ig.pl</a>
              </p>
            </article>

            <article className="hodowla-contact-card">
              <h2>Specjalista ds. finansowo-księgowych</h2>
              <p>
                <strong>Urszula Frankowska</strong>
              </p>
              <p>
                <a href="mailto:u.frankowska@krd-ig.pl">u.frankowska@krd-ig.pl</a>
              </p>
              <p>
                Dział Windykacji: <a href="tel:+48698630688">698 630 688</a>
              </p>
            </article>
          </section>

          <h2>TERYTORIALNY ZASIĘG DZIAŁANIA specjalistów ds. hodowli i oceny drobiu</h2>
          <div className="segment-table-wrap">
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Lp.</th>
                  <th>Wykonujący ocenę</th>
                  <th>Województwo (powiaty)</th>
                </tr>
              </thead>
              <tbody>
                {coverageRows.map((item, index) => (
                  <tr key={`coverage-${item.specialist}`}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.specialist}</strong>
                      <br />
                      <a href={`tel:+48${item.phone.replace(/\s+/g, "")}`}>{item.phone}</a>
                      <br />
                      <a href={`mailto:${item.email}`}>{item.email}</a>
                    </td>
                    <td>
                      <div className="coverage-lines">
                        {(item.coverage.match(/[^,]+?\([^)]*\)|[^,]+/g) ?? [item.coverage]).map(
                          (entry, entryIndex) => {
                            const line = entry.trim();
                            const parts = line.match(/^([^()]+)\((.*)\)$/);

                            return (
                              <div className="coverage-line" key={`${item.specialist}-${entryIndex}`}>
                                {parts ? (
                                  <>
                                    <strong className="coverage-region">{parts[1].trim()}</strong>
                                    <span> ({parts[2].trim()})</span>
                                  </>
                                ) : (
                                  <strong className="coverage-region">{line}</strong>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  const shouldJustifyArticleText =
    slug === "bezpieczenstwo-bialkowe" ||
    slug === "globalizacja-rynku" ||
    slug === "przedstawicielstwo-w-chinach";
  const shouldUseFullWidthArticleLayout =
    slug === "globalizacja-rynku" ||
    slug === "bezpieczenstwo-bialkowe" ||
    slug === "przedstawicielstwo-w-chinach";

  if (
    slug ===
    "polish-poultry-na-alimentaria-2026-rekordowa-edycja-rekordowa-energia-rekordowa-polska"
  ) {
    const exhibitors = [
      "P.D. DROBEX sp. z o.o.",
      "DROSED HOLDING S.A.",
      "EFARM Maciej Rosner",
      "Food Park Kowal sp. z o.o.",
      "IMEX POLAND sp. z o.o.",
      "INDYKPOL S.A.",
      "KPS Food Pionki sp. z o.o.",
      "PMiW ŁUKOSZ sp. z o.o.",
      "SUPERDROB S.A.",
      "Zakład Drobiarski w Stasinie sp. z o.o.",
    ];

    const completedActions = [
      "przygotowanie nowoczesnego, atrakcyjnego stoiska POLISH POULTRY,",
      "kompleksowa obsługa kulinarna i organizacja koktajlu branżowego,",
      "produkcja materiałów promocyjnych,",
      "udział firm drobiarskich,",
      "promocja marek „Polski drób” i „Polska Smakuje”.",
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-justified prose-alimentaria">
          <p>
            Targi Alimentaria 2026 w Barcelonie przejdą do historii zarówno jako rekordowa
            edycja wydarzenia, jak i jeden z najmocniejszych występów polskiej branży
            drobiarskiej na arenie międzynarodowej. W roku, w którym Polska pełniła rolę kraju
            partnerskiego, marka POLISH POULTRY była widoczna, rozpoznawalna i intensywnie obecna
            w najważniejszych rozmowach biznesowych.
          </p>

          <h2>Polska siła w Barcelonie</h2>
          <p>Na wspólnym stoisku POLISH POULTRY zaprezentowało się 10 firm sektora:</p>
          <ul className="alimentaria-list">
            {exhibitors.map((company) => (
              <li key={company}>{company}</li>
            ))}
          </ul>
          <p>
            Przez cztery intensywne dni przedstawiciele firm prowadzili rozmowy B2B, prezentowali
            ofertę produktową i budowali relacje z partnerami z całego świata. Ogromnym
            zainteresowaniem cieszyły się degustacje. Ponad 1500 porcji pozwoliło odwiedzającym
            poznać smak, jakość i różnorodność polskiego drobiu.
          </p>
          <p>
            Stoisko POLISH POULTRY stało się jednym z najbardziej obleganych miejsc w hali,
            przestrzenią spotkań, negocjacji i inspirujących rozmów, która jednocześnie wzmacniała
            wizerunek Polski jako solidnego, nowoczesnego i elastycznego partnera biznesowego.
          </p>

          <h2>Rekordowe targi, wyjątkowa widoczność Polski</h2>
          <p>
            Alimentaria 2026 zgromadziła ponad 3200 wystawców z blisko 70 krajów oraz ponad 100
            tys. odwiedzających. Polska jako kraj partnerski była w centrum uwagi, a polskie
            stoiska odwiedził m.in. król Hiszpanii Filip VI, podkreślając rangę i prestiż
            wydarzenia.
          </p>
          <p>
            Międzynarodowy charakter targów oraz obecność kluczowych decydentów branży stworzyły
            idealne warunki do promocji polskiego drobiu i wzmacniania relacji handlowych z
            partnerami z Europy, Ameryki Łacińskiej, Bliskiego Wschodu i Azji.
          </p>

          <h2>Zrealizowane działania, realne efekty</h2>
          <p>Wszystkie zaplanowane działania zostały wykonane, w tym:</p>
          <ul className="alimentaria-list">
            {completedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <p>
            Efekt? Wzrost rozpoznawalności polskiego drobiu, wzmocnienie relacji z dotychczasowymi
            partnerami oraz pozyskanie nowych kontaktów o dużym potencjale eksportowym. Wspólna
            prezentacja branży pokazała jej siłę, profesjonalizm i spójność strategiczną, czyli
            dokładnie to, czego oczekują globalni odbiorcy.
          </p>

          <h2>Dziękujemy</h2>
          <p>
            Dziękujemy wszystkim współwystawcom, partnerom i gościom, którzy odwiedzili stoisko
            POLISH POULTRY. Dzięki Waszej energii i zaangażowaniu stworzyliśmy przestrzeń, która
            doskonale pokazała potencjał polskiego drobiu na rynku międzynarodowym.
          </p>
          <p>Do zobaczenia na kolejnych wydarzeniach. Wracamy jeszcze silniejsi!</p>

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "pierze-i-puch-certyfikacja") {
    const markerText = "5. regulamin audytów pochodzenia pierza i puchu";
    const a4StartIndex = visibleParagraphs.findIndex(
      (paragraph) => paragraph.trim().toLocaleLowerCase("pl") === markerText,
    );

    const renderPierzeParagraph = (
      paragraph: string,
      absoluteIndex: number,
      keyPrefix: string,
    ) => {
      const trimmedParagraph = paragraph.trim();
      const isParagraphPoint = /^\s*(?:\d+|[a-z])\)\s+/i.test(trimmedParagraph);
      const isSectionMarker = /^\s*§\s*\d+\s*$/.test(trimmedParagraph);
      const isSectionHeading =
        looksLikeAllCapsHeading(trimmedParagraph) ||
        isSectionMarker ||
        (absoluteIndex > 0 &&
          looksLikeHeading(trimmedParagraph) &&
          trimmedParagraph.length <= 55);

      if (isSectionHeading && !isParagraphPoint) {
        return <h2 key={`${keyPrefix}-${absoluteIndex}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>;
      }

      return (
        <p
          key={`${keyPrefix}-${absoluteIndex}-${paragraph.slice(0, 20)}`}
          className={isParagraphPoint ? "pierze-legal-point" : undefined}
        >
          {paragraph}
        </p>
      );
    };

    const renderPierzeSegment = (
      paragraphs: string[],
      startIndex: number,
      keyPrefix: string,
    ) => {
      const elements: ReactNode[] = [];

      for (let index = 0; index < paragraphs.length; index += 1) {
        const current = paragraphs[index]?.trim() ?? "";
        const intro = paragraphs[index + 1]?.trim() ?? "";
        const rowA = paragraphs[index + 2]?.trim() ?? "";
        const rowB = paragraphs[index + 3]?.trim() ?? "";
        const rowC = paragraphs[index + 4]?.trim() ?? "";

        const isRequirementsBlock =
          current.toLocaleLowerCase("pl") === "rodzaje wymagań" &&
          intro.startsWith("W ramach certyfikacji") &&
          rowA.startsWith("Zalecane") &&
          rowB.startsWith("Ważne") &&
          rowC.startsWith("Bardzo ważne");

        if (isRequirementsBlock) {
          const splitRequirement = (line: string) => {
            const [label, ...rest] = line.split(/[–-]/);
            return {
              label: (label ?? "").trim(),
              description: rest.join("-").trim(),
            };
          };

          const requirementRows = [rowA, rowB, rowC].map(splitRequirement);

          elements.push(
            <h2 key={`${keyPrefix}-${startIndex + index}-rodzaje-wymagan`}>Rodzaje wymagań</h2>,
          );
          elements.push(
            <p key={`${keyPrefix}-${startIndex + index + 1}-rodzaje-wymagan-intro`}>{intro}</p>,
          );
          elements.push(
            <div
              key={`${keyPrefix}-${startIndex + index}-rodzaje-wymagan-table`}
              className="pierze-requirements-wrap"
              aria-label="Tabela rodzajów wymagań"
            >
              <table className="pierze-requirements-table">
                <thead>
                  <tr>
                    <th>Waga Wymagania</th>
                    <th>Opis wymagania</th>
                  </tr>
                </thead>
                <tbody>
                  {requirementRows.map((row) => (
                    <tr key={`${keyPrefix}-${row.label}`}>
                      <td>{row.label}</td>
                      <td>{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );

          index += 4;
          continue;
        }

        const docsMatrixIntro =
          current.toLocaleLowerCase("pl") ===
            "regulamin przeprowadzania audytów określa trzy rodzaje wymagań:" &&
          (paragraphs[index + 1]?.trim().toLocaleLowerCase("pl") ?? "") === "wymaganie" &&
          (paragraphs[index + 2]?.trim().toLocaleLowerCase("pl") ?? "") ===
            "rodzaj dokumentów";

        if (docsMatrixIntro) {
          const zalecaneLine = paragraphs[index + 3]?.trim() ?? "";
          const wazneLine = paragraphs[index + 4]?.trim() ?? "";
          const wazneLine2 = paragraphs[index + 5]?.trim() ?? "";
          const wazneLine3 = paragraphs[index + 6]?.trim() ?? "";
          const bardzoWazneLabel = paragraphs[index + 7]?.trim() ?? "";
          const bardzoWazneLine = paragraphs[index + 8]?.trim() ?? "";
          const bardzoWazneLine2 = paragraphs[index + 9]?.trim() ?? "";
          const bardzoWazneLine3 = paragraphs[index + 10]?.trim() ?? "";

          const clean = (value: string) => value.replace(/^\s*#+\s*/g, "").trim();
          const splitFirstWord = (value: string) => {
            const normalized = clean(value);
            const match = normalized.match(/^(Zalecane|Ważne)\s+(.+)$/i);
            if (!match) {
              return { label: normalized, detail: "" };
            }
            return { label: match[1], detail: match[2].trim() };
          };

          const zalecane = splitFirstWord(zalecaneLine);
          const wazne = splitFirstWord(wazneLine);
          const bardzoWazneLabelNormalized = clean(bardzoWazneLabel);

          const docsRows = [
            {
              requirement: zalecane.label || "Zalecane",
              docs: [zalecane.detail].filter(Boolean),
            },
            {
              requirement: wazne.label || "Ważne",
              docs: [wazne.detail, clean(wazneLine2), clean(wazneLine3)].filter(Boolean),
            },
            {
              requirement: bardzoWazneLabelNormalized || "Bardzo ważne",
              docs: [
                clean(bardzoWazneLine),
                clean(bardzoWazneLine2),
                clean(bardzoWazneLine3),
              ].filter(Boolean),
            },
          ];

          elements.push(
            <h2 key={`${keyPrefix}-${startIndex + index}-wymaganie-rodzaj-dokumentow`}>
              Wymaganie i rodzaj dokumentów
            </h2>,
          );
          elements.push(
            <div
              key={`${keyPrefix}-${startIndex + index}-wymaganie-rodzaj-dokumentow-table`}
              className="pierze-requirements-wrap"
              aria-label="Tabela wymagań i rodzaju dokumentów"
            >
              <table className="pierze-requirements-table">
                <thead>
                  <tr>
                    <th>Wymaganie</th>
                    <th>Rodzaj dokumentów</th>
                  </tr>
                </thead>
                <tbody>
                  {docsRows.map((row) => (
                    <tr key={`${keyPrefix}-${row.requirement}`}>
                      <td>{row.requirement}</td>
                      <td>
                        <ul className="pierze-documents-list">
                          {row.docs.map((doc) => (
                            <li key={`${keyPrefix}-${row.requirement}-${doc}`}>{doc}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );

          index += 10;
          continue;
        }

        const terminologyIntro =
          current.toLocaleLowerCase("pl") === "terminologia i skróty" &&
          (paragraphs[index + 1]?.trim().toLocaleLowerCase("pl") ?? "").startsWith(
            "podmiot zewnętrzny",
          ) &&
          (paragraphs[index + 2]?.trim().toLocaleLowerCase("pl") ?? "").startsWith(
            "podmiot wewnętrzny",
          ) &&
          (paragraphs[index + 3]?.trim().toLocaleLowerCase("pl") ?? "").startsWith(
            "wnioskodawca",
          ) &&
          (paragraphs[index + 4]?.trim().toLocaleLowerCase("pl") ?? "").startsWith(
            "wystawca",
          ) &&
          (paragraphs[index + 5]?.trim().toLocaleLowerCase("pl") ?? "").startsWith(
            "dostawca",
          );

        if (terminologyIntro) {
          const splitTermDefinition = (line: string) => {
            const normalized = line.replace(/^\s*#+\s*/g, "").trim();
            const parts = normalized.split(/[–-]/);
            const termNormalized = (parts.shift() ?? "")
              .replace(/\s+/g, " ")
              .replace(/indywidualn\s+y/gi, "indywidualny")
              .trim();
            return {
              term: termNormalized,
              definition: parts.join("-").trim(),
            };
          };

          const termsRows = [];
          let consumed = 0;
          for (let rowIndex = index + 1; rowIndex < paragraphs.length; rowIndex += 1) {
            const rawLine = paragraphs[rowIndex] ?? "";
            const normalizedLine = rawLine.trim().replace(/^\s*#+\s*/g, "");
            if (!normalizedLine) {
              break;
            }

            if (/^(PROCES AUDYTU)\b/i.test(normalizedLine)) {
              break;
            }

            if (!normalizedLine.includes("–") && !normalizedLine.includes("-")) {
              break;
            }

            const row = splitTermDefinition(rawLine);
            if (!row.term || !row.definition) {
              break;
            }

            termsRows.push(row);
            consumed += 1;
          }

          if (termsRows.length === 0) {
            termsRows.push(
              splitTermDefinition(paragraphs[index + 1] ?? ""),
              splitTermDefinition(paragraphs[index + 2] ?? ""),
              splitTermDefinition(paragraphs[index + 3] ?? ""),
              splitTermDefinition(paragraphs[index + 4] ?? ""),
              splitTermDefinition(paragraphs[index + 5] ?? ""),
            );
            consumed = 5;
          }

          elements.push(
            <h2 key={`${keyPrefix}-${startIndex + index}-terminologia-i-skroty`}>
              TERMINOLOGIA I SKRÓTY
            </h2>,
          );
          elements.push(
            <div
              key={`${keyPrefix}-${startIndex + index}-terminologia-i-skroty-table`}
              className="pierze-requirements-wrap"
              aria-label="Tabela terminologii i skrótów"
            >
              <table className="pierze-requirements-table pierze-terms-table">
                <thead>
                  <tr>
                    <th>Pojęcie</th>
                    <th>Opis</th>
                  </tr>
                </thead>
                <tbody>
                  {termsRows.map((row) => (
                    <tr key={`${keyPrefix}-${row.term}`}>
                      <td>{row.term}</td>
                      <td>{row.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );

          index += consumed;
          continue;
        }

        const requestDataListIntro =
          current.startsWith("1) dane Wnioskodawcy") &&
          (paragraphs[index + 1]?.trim() ?? "").startsWith(
            "2) nazwę, siedzibę i adres dostawcy pierza i puchu",
          ) &&
          (paragraphs[index + 2]?.trim() ?? "").startsWith("a) podmiot zewnętrzny") &&
          (paragraphs[index + 3]?.trim() ?? "").startsWith("3) numer i datę wystawienia") &&
          (paragraphs[index + 4]?.trim() ?? "").startsWith("4) asortyment pozyskanego pierza") &&
          (paragraphs[index + 5]?.trim() ?? "").startsWith("5) dane dotyczące uzysku towaru");

        if (requestDataListIntro) {
          const stripListMarker = (line: string) =>
            line.replace(/^\s*(?:\d+|[a-z])\)\s*/i, "").trim();

          const supplierKindsLine = paragraphs[index + 2]?.trim() ?? "";
          const supplierMatch = supplierKindsLine.match(/a\)\s*([^;]+);?\s*b\)\s*([^;]+);?/i);
          const supplierKinds = supplierMatch
            ? [supplierMatch[1].trim(), supplierMatch[2].trim()]
            : [stripListMarker(supplierKindsLine)];

          const listItems = [
            {
              text: stripListMarker(paragraphs[index] ?? ""),
            },
            {
              text: stripListMarker(paragraphs[index + 1] ?? ""),
              children: supplierKinds,
            },
            {
              text: stripListMarker(paragraphs[index + 3] ?? ""),
            },
            {
              text: stripListMarker(paragraphs[index + 4] ?? ""),
            },
            {
              text: stripListMarker(paragraphs[index + 5] ?? ""),
            },
          ];

          elements.push(
            <section
              key={`${keyPrefix}-${startIndex + index}-pierze-request-data-list`}
              className="pierze-request-data-list"
              aria-label="Zakres danych we wniosku"
            >
              <ol>
                {listItems.map((item) => (
                  <li key={`${keyPrefix}-${item.text.slice(0, 32)}`}>
                    <span>{item.text}</span>
                    {item.children && (
                      <ul>
                        {item.children.map((child) => (
                          <li key={`${keyPrefix}-${child.slice(0, 28)}`}>{child}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>,
          );

          index += 5;
          continue;
        }

        const deliveryTermsListIntro =
          current.startsWith("1) dostarczenia przez Wnioskodawcę będącym podmiotem wewnętrznym") &&
          (paragraphs[index + 1]?.trim() ?? "").startsWith(
            "2) dostarczenia przez Wnioskodawcę będącym podmiotem zewnętrznym",
          );

        if (deliveryTermsListIntro) {
          const stripListMarker = (line: string) =>
            line.replace(/^\s*(?:\d+|[a-z])\)\s*/i, "").trim();

          const listItems = [
            stripListMarker(paragraphs[index] ?? ""),
            stripListMarker(paragraphs[index + 1] ?? ""),
          ];

          elements.push(
            <section
              key={`${keyPrefix}-${startIndex + index}-pierze-delivery-terms-list`}
              className="pierze-request-data-list"
              aria-label="Warunki dostarczenia wniosku"
            >
              <ol>
                {listItems.map((item, itemIndex) => (
                  <li key={`${keyPrefix}-delivery-${startIndex + index}-${itemIndex}`}>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>,
          );

          index += 1;
          continue;
        }

        const terminologyDetailsListIntro =
          current.startsWith("1) Asortyment") &&
          (paragraphs[index + 1]?.trim() ?? "").startsWith("2) Puch") &&
          (paragraphs[index + 2]?.trim() ?? "").startsWith("3) Półpuch") &&
          (paragraphs[index + 3]?.trim() ?? "").startsWith("4) Pióra") &&
          (paragraphs[index + 4]?.trim() ?? "").includes("Surowiec");

        if (terminologyDetailsListIntro) {
          const stripListMarker = (line: string) =>
            line.replace(/^\s*(?:\d+|[a-z])\)\s*/i, "").trim();

          const listItems = [
            stripListMarker(paragraphs[index] ?? ""),
            stripListMarker(paragraphs[index + 1] ?? ""),
            stripListMarker(paragraphs[index + 2] ?? ""),
            stripListMarker(paragraphs[index + 3] ?? ""),
            stripListMarker(paragraphs[index + 4] ?? ""),
          ];

          elements.push(
            <section
              key={`${keyPrefix}-${startIndex + index}-pierze-terminology-details-list`}
              className="pierze-request-data-list"
              aria-label="Definicje asortymentu materiału pierzarskiego"
            >
              <ol>
                {listItems.map((item, itemIndex) => (
                  <li key={`${keyPrefix}-terminology-details-${startIndex + index}-${itemIndex}`}>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>,
          );

          index += 4;
          continue;
        }

        elements.push(renderPierzeParagraph(paragraphs[index], startIndex + index, keyPrefix));
      }

      return elements;
    };

    const preA4Paragraphs =
      a4StartIndex === -1 ? visibleParagraphs : visibleParagraphs.slice(0, a4StartIndex);
    const a4Paragraphs = a4StartIndex === -1 ? [] : visibleParagraphs.slice(a4StartIndex);

    return (
      <div
        className={`article-layout${shouldUseFullWidthArticleLayout ? " article-layout-full" : ""} shell`}
      >
        <article className={`prose${shouldJustifyArticleText ? " prose-justified" : ""} prose-pierze`}>
          {renderPierzeSegment(preA4Paragraphs, 0, "pierze-pre")}

          {a4Paragraphs.length > 0 && (
            <section className="pierze-a4-sheet" aria-label="Regulamin audytów pochodzenia pierza i puchu">
              {renderPierzeSegment(a4Paragraphs, a4StartIndex, "pierze-a4")}
            </section>
          )}

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  if (slug === "wazne-linki") {
    const primaryWaznyLink = {
      title: "Zintegrowany System Rolniczej Informacji Rynkowej",
      href: "https://zsrir.minrol.gov.pl/about",
      logoOverride: withBasePath("/media/partners/zsrir.svg"),
    };

    const headingTitles = visibleParagraphs
      .map((paragraph) => paragraph.trim())
      .filter(
        (paragraph, index) =>
          index > 0 && looksLikeHeading(paragraph) && paragraph.toLocaleLowerCase("pl") !== "link",
      );

    const fallbackHrefByTitle = new Map<string, string>([
      ["ministerstwo rolnictwa i rozwoju wsi", "https://www.gov.pl/web/rolnictwo"],
      ["krajowe centrum hodowli zwierząt", "https://www.kchz.agro.pl/"],
      ["narodowy instytut kultury i dziedzictwa wsi", "https://nikidw.edu.pl/"],
      ["krajowy ośrodek wsparcia rolnictwa", "https://www.kowr.gov.pl/"],
      ["gospodarz.tv – tv rolnicza", "https://gospodarz.tv/"],
      ["portal rolniczy", "https://www.piagro.pl/"],
      ["agencja restrukturyzacji i modernizacji rolnictwa", "https://www.arimr.gov.pl/"],
      ["instytut ekonomiki rolnictwa i gospodarki żywościowej", "https://ierigz.waw.pl/"],
      ["główny inspektorat weterynarii", "https://www.wetgiw.gov.pl/"],
      ["główny urząd statystyczny", "https://www.stat.gov.pl/"],
      ["pierwszy portal rolny", "https://www.ppr.pl/index.html"],
      ["portal spożywczy", "https://www.portalspozywczy.pl/"],
      ["farmer.pl – portal nowoczesnego rolnika", "https://www.farmer.pl/"],
      ["rolnicy, serwis rolniczy, portal rolny", "https://rolnicy.com/"],
      ["rolnicza telewizja interaktywna agronews", "https://www.agronews.com.pl/"],
      ["portal ue", "https://european-union.europa.eu/index_en"],
    ]);

    const cleanHref = (rawHref: string, title: string) => {
      const cleaned = rawHref.trim().replace(/%20/g, "").replace(/\s+/g, "");

      if (/^https?:\/\/www\.gov\.pl\/web\/rolnictwo$/i.test(cleaned)) {
        return "https://www.gov.pl/web/rolnictwo";
      }

      if (/^https?:\/\/european-union\.europa\.eu\/index_en$/i.test(cleaned)) {
        return "https://european-union.europa.eu/index_en";
      }

      if (/^https?:\/\//i.test(cleaned) || cleaned.startsWith("mailto:") || cleaned.startsWith("tel:")) {
        return cleaned;
      }

      if (cleaned.startsWith("/")) {
        return `https://krd-ig.com.pl${cleaned}`;
      }

      const fallback = fallbackHrefByTitle.get(title.toLocaleLowerCase("pl"));
      return fallback ?? cleaned;
    };

    const fallbackEntries = headingTitles
      .map((title) => {
        const href = fallbackHrefByTitle.get(title.toLocaleLowerCase("pl"));
        return href ? { title, href } : null;
      })
      .filter((item): item is { title: string; href: string } => item !== null);

    const byLinks = headingTitles
      .map((title, index) => {
        const link = links[index];
        if (!link?.href) {
          return null;
        }
        return {
          title,
          href: cleanHref(link.href, title),
        };
      })
      .filter((item): item is { title: string; href: string } => item !== null);

    const generatedCards = (byLinks.length > 0 ? byLinks : fallbackEntries).map((item) => {
      const normalizedTitle = item.title.toLocaleLowerCase("pl");
      const logoOverride =
        normalizedTitle === "ministerstwo rolnictwa i rozwoju wsi"
          ? withBasePath("/media/partners/mrirw.ico")
          : normalizedTitle === "portal rolniczy"
          ? withBasePath("/media/partners/piagro.svg")
          : normalizedTitle === "krajowy ośrodek wsparcia rolnictwa"
            ? withBasePath("/media/partners/kowr.svg")
            : normalizedTitle === "agencja restrukturyzacji i modernizacji rolnictwa"
              ? withBasePath("/media/partners/arimr.svg")
              : normalizedTitle === "główny urząd statystyczny"
                ? withBasePath("/media/partners/gus.svg")
                : normalizedTitle === "portal spożywczy"
                  ? withBasePath("/media/partners/portal-spozywczy.svg")
                  : normalizedTitle === "pierwszy portal rolny"
                    ? withBasePath("/media/partners/ppr.svg")
                    : normalizedTitle === "portal ue"
                      ? withBasePath("/media/partners/portal-ue.svg")
                      : normalizedTitle === "główny inspektorat weterynarii"
                        ? withBasePath("/media/partners/giw.ico")
            : normalizedTitle === "instytut ekonomiki rolnictwa i gospodarki żywościowej"
              ? withBasePath("/media/partners/ierigz.svg")
              : normalizedTitle === "gospodarz.tv – tv rolnicza"
                ? withBasePath("/media/partners/gospodarz.svg")
          : undefined;

      return {
        ...item,
        logoOverride,
      };
    });

    const linkCards = [
      primaryWaznyLink,
      ...generatedCards.filter(
        (item) =>
          item.href.toLocaleLowerCase("pl") !== primaryWaznyLink.href.toLocaleLowerCase("pl") &&
          item.title.toLocaleLowerCase("pl") !== primaryWaznyLink.title.toLocaleLowerCase("pl"),
      ),
    ];

    return (
      <div className="article-layout article-layout-full shell">
        <article className="prose prose-wazne-linki">
          <h2>Szybki dostęp do najważniejszych linków</h2>

          <div className="wazne-linki-grid" aria-label="Ważne linki instytucjonalne">
            {linkCards.map((item) => (
              <a
                className="wazne-link-card"
                href={item.href}
                key={`${item.title}-${item.href}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="wazne-link-logo" aria-hidden="true">
                  <ExternalFavicon href={item.href} title={item.title} logoSrc={item.logoOverride} />
                </span>

                <span className="wazne-link-content">
                  <span className="wazne-link-title">{item.title}</span>
                  <span className="wazne-link-cta">
                    Przejdź do strony <Arrow />
                  </span>
                </span>
              </a>
            ))}
          </div>

          <a className="source-link source-link-inline" href={resolvedSource}>
            Zobacz materiał na obecnej stronie KRD-IG <Arrow />
          </a>
        </article>
      </div>
    );
  }

  return (
    <div
      className={`article-layout${shouldUseFullWidthArticleLayout ? " article-layout-full" : ""} shell`}
    >
      <article
        className={`prose${shouldJustifyArticleText ? " prose-justified" : ""}${slug === "pierze-i-puch-certyfikacja" ? " prose-pierze" : ""}`}
      >
        {visibleParagraphs.map((paragraph, index) => {
          const trimmedParagraph = paragraph.trim();

          const tenderLinked = renderTenderLinkedText(
            trimmedParagraph,
            `${index}-${paragraph.slice(0, 20)}`,
          );

          if (slug === "czlonkowie" && index < 2) {
            const label = index === 0 ? "CZŁONKOWIE" : "KRD-IG";
            return (
              <p className="member-title-lockup" key={`${index}-${label}`}>
                {label}
              </p>
            );
          }

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

          if (
            slug === "kampania-stopdezinformacjizywnosciowej-i-kluczowe-wyzwania-rynkowe" &&
            paragraph.trim().toLocaleLowerCase("pl") === "śniadanie prasowe"
          ) {
            return (
              <h2 key={`${index}-${paragraph.slice(0, 20)}`}>
                <a href={dezinformacjaBriefingPdfHref}>Śniadanie prasowe - komunikat</a>
              </h2>
            );
          }

          if (
            shouldHighlightTenderDeadline &&
            trimmedParagraph.startsWith(tenderDeadlineParagraphStart)
          ) {
            return (
              <p className="tender-deadline-highlight" key={`${index}-${paragraph.slice(0, 20)}`}>
                {paragraph}
              </p>
            );
          }

          if (
            slug === "jednolite-zasady-wspolczynnika-w-pr-wzmacniaja-przejrzystosc-rynku-drobiu" &&
            paragraph.includes(ijharsAgreementUrlLabel)
          ) {
            const [beforeLink, afterLink = ""] = paragraph.split(ijharsAgreementUrlLabel);

            return (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>
                {beforeLink}
                <a className="inline-download-link" href={ijharsAgreementHref}>
                  {ijharsAgreementUrlLabel}
                </a>
                {afterLink}
              </p>
            );
          }

          if (slug === "komunikat-14643" && paragraph.includes(eurLexDecisionLabel)) {
            const [beforeLink, afterLink = ""] = paragraph.split(eurLexDecisionLabel);

            return (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>
                {beforeLink}
                <a className="inline-download-link" href={eurLexDecisionHref}>
                  {eurLexDecisionLabel}
                </a>
                {afterLink}
              </p>
            );
          }

          if (slug === "wstawienia") {
            return <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>;
          }

          if (slug === "pierze-i-puch-certyfikacja") {
            const isParagraphPoint = /^\s*(?:\d+|[a-z])\)\s+/i.test(trimmedParagraph);
            const isSectionMarker = /^\s*§\s*\d+\s*$/.test(trimmedParagraph);
            const isSectionHeading =
              looksLikeAllCapsHeading(trimmedParagraph) ||
              isSectionMarker ||
              (index > 0 && looksLikeHeading(trimmedParagraph) && trimmedParagraph.length <= 55);

            if (isSectionHeading && !isParagraphPoint) {
              return <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>;
            }

            return (
              <p
                key={`${index}-${paragraph.slice(0, 20)}`}
                className={isParagraphPoint ? "pierze-legal-point" : undefined}
              >
                {paragraph}
              </p>
            );
          }

          if (
            slug === "szczepienia-przeciwko-nd-w-polsce-doswiadczenia-po-roku-od-obowiazywania-przepisu" &&
            /^Link do rejestracji:\s*https?:\/\//i.test(trimmedParagraph)
          ) {
            const href = trimmedParagraph.replace(/^Link do rejestracji:\s*/i, "").trim();

            return (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>
                <strong>Link do rejestracji: </strong>
                <a
                  className="inline-download-link"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {href}
                </a>
              </p>
            );
          }

          if (
            slug ===
              "ied-2-0-unia-europejska-chce-zmian-w-przepisach-o-ochronie-srodowiska-czy-branza-drobiarska-ma-sie-czego-obawiac" &&
            (/^Rodzaj drobiu\s*\|\s*Próg\s*\|\s*Orientacyjna maks\. obsada \(szt\.\)$/i.test(trimmedParagraph) ||
              /^Rodzaj drobiu\s+Próg\s+Orientacyjna maks\. obsada \(szt\.\)$/i.test(trimmedParagraph))
          ) {
            const rows = [
              {
                species: "Obecny próg (dla porównania)",
                threshold: "-",
                stock: "> 40 000 (niezależnie od gatunku)",
              },
              { species: "Brojlery", threshold: "280 WPO", stock: "40 000" },
              { species: "Kury nioski", threshold: "300 WPO", stock: "21 429" },
              { species: "Indyki", threshold: "280 WPO", stock: "9 334" },
              { species: "Kaczki", threshold: "280 WPO", stock: "28 000" },
              { species: "Gęsi", threshold: "280 WPO", stock: "14 000" },
              { species: "Strusie", threshold: "280 WPO", stock: "800" },
            ];

            return (
              <div
                className="ied-threshold-table-wrap"
                key={`${index}-${paragraph.slice(0, 20)}`}
                style={{
                  margin: "20px 0 34px",
                  overflowX: "auto",
                  padding: "12px",
                  border: "1px solid #d5dde6",
                  borderRadius: "10px",
                  background: "transparent",
                }}
              >
                <table
                  className="ied-threshold-table"
                  style={{
                    width: "100%",
                    minWidth: "620px",
                    borderCollapse: "collapse",
                    border: "1px solid #b9c2cc",
                    fontSize: "15px",
                    lineHeight: "1.45",
                    background: "transparent",
                  }}
                >
                  <caption
                    style={{
                      textAlign: "left",
                      padding: "2px 4px 12px",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    Progi WPO dla instalacji drobiarskich (projekt UC99)
                  </caption>
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #d9e0e8",
                          textAlign: "left",
                          fontWeight: 700,
                          background: "transparent",
                        }}
                      >
                        Rodzaj drobiu
                      </th>
                      <th
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #d9e0e8",
                          textAlign: "center",
                          fontWeight: 700,
                          background: "transparent",
                        }}
                      >
                        Próg
                      </th>
                      <th
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #d9e0e8",
                          textAlign: "right",
                          fontWeight: 700,
                          background: "transparent",
                        }}
                      >
                        Orientacyjna maks. obsada (szt.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.species} style={{ background: "transparent" }}>
                        <th
                          scope="row"
                          style={{
                            padding: "12px 14px",
                            border: "1px solid #d9e0e8",
                            textAlign: "left",
                            fontWeight: 600,
                            background: "transparent",
                          }}
                        >
                          {row.species}
                        </th>
                        <td
                          className="ied-col-threshold"
                          style={{
                            padding: "12px 14px",
                            border: "1px solid #d9e0e8",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                            background: "transparent",
                          }}
                        >
                          {row.threshold}
                        </td>
                        <td
                          className="ied-col-stock"
                          style={{
                            padding: "12px 14px",
                            border: "1px solid #d9e0e8",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                            background: "transparent",
                          }}
                        >
                          {row.stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (
            slug ===
              "ied-2-0-unia-europejska-chce-zmian-w-przepisach-o-ochronie-srodowiska-czy-branza-drobiarska-ma-sie-czego-obawiac" &&
            [
              "Obecny próg (dla porównania) | - | > 40 000 (niezależnie od gatunku)",
              "Brojlery | 280 WPO | 40 000",
              "Kury nioski | 300 WPO | 21 429",
              "Indyki | 280 WPO | 9 334",
              "Kaczki | 280 WPO | 28 000",
              "Gęsi | 280 WPO | 14 000",
              "Strusie | 280 WPO | 800",
              "Obecny próg (dla porównania)\t-\t> 40 000 (niezależnie od gatunku)",
              "Brojlery\t280 WPO\t40 000",
              "Kury nioski\t300 WPO\t21 429",
              "Indyki\t280 WPO\t9 334",
              "Kaczki\t280 WPO\t28 000",
              "Gęsi\t280 WPO\t14 000",
              "Strusie\t280 WPO\t800",
            ].includes(trimmedParagraph)
          ) {
            return null;
          }

          if (tenderLinked?.hasLink) {
            const shouldRenderAsHeading = index > 0 && looksLikeHeading(trimmedParagraph);
            return shouldRenderAsHeading ? (
              <h2 key={tenderLinked.key}>{tenderLinked.node}</h2>
            ) : (
              <p key={tenderLinked.key}>{tenderLinked.node}</p>
            );
          }

          return index > 0 && looksLikeHeading(paragraph) ? (
            <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
          ) : (
            <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
          );
        })}
        {slug === "kampania-stopdezinformacjizywnosciowej-i-kluczowe-wyzwania-rynkowe" && (
          <section className="news-media-section" aria-label="Zdjęcia i logo kampanii">
            <h2>Zdjęcia</h2>
            <div className="news-media-gallery">
              {dezinformacjaBriefingPhotos.map((photo) => (
                <figure key={photo.src}>
                  <img src={photo.src} alt={photo.alt} loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="news-media-logos">
              {dezinformacjaBriefingLogos.map((logo) => (
                <a href={logo.href} key={logo.src} target="_blank" rel="noopener noreferrer">
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    loading="lazy"
                    className={logo.className}
                  />
                </a>
              ))}
            </div>
          </section>
        )}
        {slug === "szczepienia-przeciwko-nd-w-polsce-doswiadczenia-po-roku-od-obowiazywania-przepisu" && (
          <section className="news-media-section" aria-label="Prelegenci webinaru">
            <h2>Prelegenci</h2>
            <div className="news-media-gallery">
              <figure>
                <img
                  src="/media/pawel-gawlik.png"
                  alt="lek. wet. Paweł Gawlik"
                  className="speaker-photo speaker-photo-pawel"
                  style={{ objectPosition: "50% 40%" }}
                  loading="lazy"
                />
                <figcaption>
                  <strong>lek. wet. Paweł Gawlik</strong>
                  <br />
                  Absolwent Wydziału Medycyny Weterynaryjnej UWM w Olsztynie (2007). Specjalista chorób drobiu i
                  ptaków ozdobnych. Od początku swojej kariery zawodowej związany jest z branżą drobiarską.
                  Z Animal Pharma (Grupa AviOne) współpracuje od 2007 roku. Obecnie pełni funkcję kierownika gabinetu
                  weterynaryjnego, konsultanta stad rodzicielskich, koordynatora ds. integracji oraz Project Managera.
                  Aktywnie uczestniczy w profilaktyce i leczeniu stad drobiu. Specjalizuje się w opiece nad stadami brojlera
                  kurzego, nioski reprodukcyjnej i wylęgarniami. Współtworzy programy profilaktyki i zapobiegania chorobom
                  urzędowo zwalczanym. Jego doświadczenie, praktyczne podejście i zaangażowanie w rozwój sektora drobiarskiego
                  sprawiają, że jest ekspertem cenionym zarówno przez producentów, jak i środowisko weterynaryjne.
                </figcaption>
              </figure>
              <figure>
                <img
                  src="/media/jakub-wojciechowski.png"
                  alt="lek. wet. Jakub Wojciechowski"
                  className="speaker-photo speaker-photo-jakub"
                  style={{ objectPosition: "50% 40%" }}
                  loading="lazy"
                />
                <figcaption>
                  <strong>lek. wet. Jakub Wojciechowski</strong>
                  <br />
                  Absolwent Wydziału Medycyny Weterynaryjnej UWM w Olsztynie (2012). Specjalista chorób drobiu.
                  Na co dzień zarządza oddziałem Vet-Lab Brudzew, gdzie zajmuje się szeroko pojętym sektorem drobiarskim.
                  W pracy zawodowej opiera się na diagnostyce laboratoryjnej i profilaktyce. Do jego zadań należy m.in.
                  praktyczne opracowywanie programów szczepień (w tym przeciwko ND), a także monitorowanie ich skuteczności
                  na fermach. Jest aktywnym uczestnikiem europejskiego projektu EU-JAMRAI 2 (WP 6.2, WG Poultry).
                  W ramach grupy roboczej angażuje się w wypracowanie i wdrażanie praktycznych rozwiązań mających na celu
                  ograniczenie lekooporności (AMR) oraz optymalizację zużycia antybiotyków w produkcji drobiu.
                </figcaption>
              </figure>
              <figure>
                <img
                  src="/media/sara-losiak.png"
                  alt="lek. wet. Sara Losiak"
                  className="speaker-photo speaker-photo-sara"
                  style={{ objectPosition: "50% 40%" }}
                  loading="lazy"
                />
                <figcaption>
                  <strong>lek. wet. Sara Losiak</strong>
                  <br />
                  Ukończyła studia weterynaryjne na UWM w Olsztynie w 2014 roku. Staż odbywała w klinice drobiu
                  Staphorst w Holandii. Pracowała jako lekarz drobiu w Dierenkliniek Den Ham, gdzie zajmowała się opieką
                  nad fermami drobiu rzeźnego, profilaktyką zdrowotną stad oraz programami szczepień.
                  Od 2022 roku jest związana z Gezondheidscentrum voor Pluimvee (GVP) w Emmen w Holandii.
                  Centrum Zdrowia Drobiu jest wyspecjalizowaną praktyką weterynaryjną świadczącą usługi dla firm działających
                  w hodowli drobiu w Holandii i Niemczech. Na co dzień wspiera producentów drobiu w zakresie zdrowia stad,
                  bioasekuracji oraz optymalizacji wyników produkcyjnych.
                </figcaption>
              </figure>
            </div>
            <div className="news-callout-box">
              <p>
                <strong>Rejestracja:</strong>
              </p>
              <p style={{ marginTop: "8px" }}>
                <a
                  className="inline-download-link"
                  href="https://us06web.zoom.us/meeting/register/oYqzTRTDQpCxF9CA6JwJpA"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", fontWeight: 700 }}
                >
                  Zarejestruj się na webinar
                </a>
              </p>
            </div>
          </section>
        )}
        {slug === "czlonkowie" && (
          <CommissionTicker />
        )}
        {slug === "czlonkowie" && (
          <iframe
            className="czlonkowie-map-frame"
            title="Mapa członków KRD-IG"
            src="https://test.mapcreator.pl/krdig/index.php?menu=hidden"
            loading="eager"
            width="100%"
            height="768"
          />
        )}
        {slug === "czlonkowie" && (
          <p style={{ marginTop: "10px" }}>
            Jeśli mapa nie wyświetla się poprawnie, otwórz ją w nowej karcie: {" "}
            <a
              className="inline-download-link"
              href="https://test.mapcreator.pl/krdig/index.php?menu=hidden"
              target="_blank"
              rel="noopener noreferrer"
            >
              Otwórz mapę członków KRD-IG
            </a>
          </p>
        )}
        {slug === "czlonkowie" && (
          <p>Dodatkowe warstwy mapy i funkcjonalności dostępne są po zalogowaniu</p>
        )}
        {slug === "polska-odzyskala-status-kraju-wolnego-od-grypy-ptakow-2026" && (
          <p>
            Opublikowana deklaracja jest dostępna na stronie WOAH pod linkiem: <a className="inline-download-link" href="https://www.woah.org/app/uploads/2026/08/2026-08-poland-hpai-selfd.pdf" target="_blank" rel="noopener noreferrer">https://www.woah.org/en/what-we-offer/self-declared-disease-status</a>
          </p>
        )}
        <a className="source-link source-link-inline" href={resolvedSource}>
          {sourceLinkLabel} <Arrow />
        </a>
      </article>
    </div>
  );
}
