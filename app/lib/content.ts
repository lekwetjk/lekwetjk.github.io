import rawContent from "../data/content.json";

export type ContentLink = {
  href: string;
  label: string;
  document: boolean;
};

export type KnowledgePage = {
  id: number;
  slug: string;
  title: string;
  section: string;
  excerpt: string;
  paragraphs: string[];
  links: ContentLink[];
  source: string;
  images: string[];
};

export type NewsPost = {
  id: number;
  slug: string;
  title: string;
  date: string;
  year: number;
  excerpt: string;
  paragraphs: string[];
  links: ContentLink[];
  categories: string[];
  image: string | null;
  source: string;
};

type ContentDatabase = {
  generatedAt: string;
  source: string;
  logo: string;
  pages: KnowledgePage[];
  posts: NewsPost[];
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    count: number;
  }>;
};

export const content = rawContent as ContentDatabase;

function normalizePreviewText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .replace(/([a-ząćęłńóśźż0-9])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([.!?])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{2,})([a-ząćęłńóśźż]{2,})/g, "$1 $2")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

const navigationMarkers = [
  "O KRDIG",
  "O NAS",
  "STATUT",
  "ZARZĄD I RADA IZBY",
  "KOMISJE",
  "CZŁONKOSTWO",
  "WYDARZENIA",
  "AKTUALNOŚCI",
  "KONTAKT",
  "POLITYKA PRYWATNOŚCI",
  "POLITYKA COOKIES",
  "TA STRONA KORZYSTA Z CIASTECZEK",
];

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanContentText(value: string) {
  return normalizeLine(decodeHtmlEntities(value));
}

function isLeakedShortcodeParagraph(value: string) {
  const normalized = normalizeLine(value);

  if (!normalized) {
    return false;
  }

  return /\[\/?dsm_[^\]]+\]/i.test(normalized);
}

function hasNavigationLeak(paragraphs: string[]) {
  const firstParagraphs = paragraphs.slice(0, 80).map((line) =>
    normalizeLine(line).toLocaleUpperCase("pl"),
  );

  let markerHits = 0;
  for (const line of firstParagraphs) {
    for (const marker of navigationMarkers) {
      if (line.includes(marker)) {
        markerHits += 1;
        break;
      }
    }
  }

  return markerHits >= 8;
}

function hasArchiveLeak(links: ContentLink[]) {
  const readMoreCount = links.filter((link) =>
    /czytaj\s+dalej/i.test(link.label),
  ).length;
  return readMoreCount >= 25;
}

function sanitizeNewsPost(post: NewsPost): NewsPost {
  const normalizedParagraphs = post.paragraphs.map(cleanContentText).filter(Boolean);

  const looksCorrupted =
    normalizedParagraphs.length > 220 ||
    post.links.length > 350 ||
    hasNavigationLeak(normalizedParagraphs) ||
    hasArchiveLeak(post.links);

  if (!looksCorrupted) {
    return {
      ...post,
      paragraphs: normalizedParagraphs,
    };
  }

  return {
    ...post,
    paragraphs: [
      "Treść tej aktualności została automatycznie oczyszczona, ponieważ wykryto uszkodzony zrzut z elementami nawigacji lub archiwum.",
      "Skorzystaj z odnośnika do oryginalnego materiału źródłowego, aby zobaczyć pełną i bieżącą treść.",
    ],
    links: [],
  };
}

function normalizeWstawieniaParagraph(value: string) {
  return value
    .replace(/I p łrocze/gi, "I półrocze")
    .replace(/II p łrocze/gi, "II półrocze")
    .replace(/4 513 8168/g, "4 513 816")
    .replace(/3 567 0878/g, "3 567 087")
    .replace(/85 5830/g, "855 830")
    .replace(/Gospodarczejul\./g, "Gospodarczej ul.")
    .replace(/11e-mail:/g, "11 e-mail:")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .trim();
}

function normalizeLinkHref(value: string) {
  const href = String(value ?? "").trim();

  if (!href) {
    return href;
  }

  if (/^mailto:\/+/i.test(href)) {
    return href.replace(/^mailto:\/+/i, "mailto:");
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href)) {
    return `mailto:${href}`;
  }

  if (/^www\./i.test(href)) {
    return `https://${href}`;
  }

  return href;
}

function normalizeLinks(links: ContentLink[]) {
  return links.map((link) => ({
    ...link,
    href: normalizeLinkHref(link.href),
  }));
}

export const knowledgePages = content.pages.map((page) => ({
  ...page,
  paragraphs: page.paragraphs
    .map(cleanContentText)
    .map((paragraph) =>
      page.slug === "wstawienia"
        ? normalizeWstawieniaParagraph(paragraph)
        : paragraph,
    )
    .filter((paragraph) => paragraph && !isLeakedShortcodeParagraph(paragraph)),
  title:
    page.slug === "czlonkowie"
      ? page.title.replace(/KRDIG/g, "KRD-IG")
      : page.title,
  excerpt:
    page.slug === "akcja-stopdezinformacjizywnosciowej"
      ? "Akcja #StopDezinformacjiŻywnościowej wspiera rzetelne informowanie o mięsie drobiowym i przeciwdziała szkodliwej dezinformacji żywnościowej."
      : page.slug === "wstawienia"
        ? "Wstawienia 2015 - 2026. Liczba piskląt hodowlanych kur mięsnych (stada rodzicielskie - w szt. samic) przyjętych do wychowu wraz z dynamiką zmian wielkości zaplecza (%)."
      : normalizePreviewText(page.excerpt),
  links: normalizeLinks(page.links),
}));

const supplementalNewsPosts: NewsPost[] = [
  {
    id: 900001,
    slug:
      "zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6",
    title:
      "ZAPYTANIE OFERTOWE dot. projektu: „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym” wraz z przeprowadzeniem przez niezależny podmiot badania efektywności projektu (zadania)",
    date: "2026-08-06T00:00:00",
    year: 2026,
    excerpt:
      "Krajowa Rada Drobiarstwa – Izba Gospodarcza zaprasza do przygotowania i przedstawienia oferty dotyczącej projektu pt. „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym” wraz z przeprowadzeniem przez niezależny podmiot badania efektywności projektu (zadania). Termin składania ofert upływa 24 sierpnia 2026 r. o godz. 10:00.",
    paragraphs: [
      "Krajowa Rada Drobiarstwa – Izba Gospodarcza zaprasza do przygotowania i przedstawienia oferty dotyczącej projektu pt. „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym” wraz z przeprowadzeniem przez niezależny podmiot badania efektywności projektu (zadania).",
      "Termin składania ofert upływa 24 sierpnia 2026 r. o godz. 10:00.",
      "Treść Zaproszenia —> pobierz.pdf",
      "Załączniki (1-7) do Zapytania ofertowego —> pobierz.pdf",
      "Załączniki (1-7) do Zapytania ofertowego w formie edytowalnej —> pobierz.docx",
      "Załącznik nr 5 do Zapytania ofertowego w formacie .xls —> pobierz.xls",
    ],
    links: [
      {
        href: "https://krd-ig.com.pl/wp-content/uploads/2026/08/1.-Zaproszenie-do-skladania-ofert-OCHRONA-WIZERUNKU-KRAJ-2026.pdf",
        label: "pobierz.pdf",
        document: true,
      },
      {
        href: "https://krd-ig.com.pl/wp-content/uploads/2026/08/2-Zalaczniki-1-7-do-Zapytania-ofertowego.pdf",
        label: "pobierz.pdf",
        document: true,
      },
      {
        href: "https://krd-ig.com.pl/wp-content/uploads/2026/08/2-Zalaczniki-1-7-do-Zapytania-ofertowego.docx",
        label: "pobierz.docx",
        document: true,
      },
      {
        href: "https://krd-ig.com.pl/wp-content/uploads/2026/08/3.-Zalacznik-nr-5-do-Zapytania-ofertowego-KOSZTORYS.xlsx",
        label: "pobierz.xls",
        document: true,
      },
    ],
    categories: ["Aktualności", "Zapytania ofertowe"],
    image: "/media/zo.png",
    source:
      "https://krd-ig.com.pl/zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6/",
  },
  {
    id: 900002,
    slug: "nowa-strategia-ue-dla-hodowli-wazny-sygnal-dla-sektora-drobiarskiego",
    title: "Nowa strategia UE dla hodowli – ważny sygnał dla sektora drobiarskiego",
    date: "2026-08-07T00:00:00",
    year: 2026,
    excerpt:
      "Komisja Europejska przedstawiła nową strategię UE dla sektora hodowlanego, która stawia na konkurencyjność, bezpieczeństwo żywnościowe, dobrostan zwierząt i odporność produkcji. Dla branży drobiarskiej oznacza to zarówno nowe wymagania, jak i szanse na dalszy rozwój.",
    paragraphs: [
      "7 lipca 2026 r. Komisja Europejska przedstawiła EU Livestock Strategy, dokument określający długoterminowe podejście UE do produkcji zwierzęcej. Strategia podkreśla strategiczne znaczenie hodowli dla bezpieczeństwa żywnościowego, gospodarki oraz funkcjonowania obszarów wiejskich.",
      "Jednym z najważniejszych elementów strategii jest zapowiedź dalszych zmian w zakresie dobrostanu kur niosek i brojlerów. Komisja planuje do końca 2026 r. przedstawić propozycje zmian przepisów, obejmujące m.in. stopniowe wycofywanie systemów klatkowych, rozwój praktycznych wskaźników dobrostanu oraz rozwiązania dotyczące uśmiercania jednodniowych kogucików.",
      "Dla producentów oznacza to konieczność dalszego dostosowywania gospodarstw i inwestowania w technologie poprawiające warunki utrzymania zwierząt.",
      "Strategia dużą wagę przywiązuje również do zapobiegania chorobom zwierząt. Rozwijane mają być systemy monitorowania, kontroli i zwalczania chorób oraz wykorzystanie narzędzi cyfrowych.",
      "Dla sektora drobiarskiego szczególne znaczenie ma to w kontekście grypy ptaków. Wzmocnienie bioasekuracji i wcześniejsze wykrywanie zagrożeń mają ograniczać ryzyko strat produkcyjnych oraz zakłóceń w handlu.",
      "Kolejnym ważnym kierunkiem jest zwiększenie dostępności europejskich źródeł białka paszowego. Strategia jest powiązana z unijnym Protein Action Plan, którego celem jest rozwój produkcji roślin białkowych i nasion oleistych w UE.",
      "Komisja zwraca uwagę na potrzebę utrzymania konkurencyjności europejskich producentów. Istotnym elementem ma być stosowanie, w granicach zgodnych z zasadami WTO, warunków wzajemności wobec produktów importowanych.",
      "Strategia wskazuje także na potrzebę zwiększenia inwestycji w cyfryzację, efektywność produkcji, dobrostan, ochronę środowiska i adaptację do zmian klimatu.",
      "Polska jest jednym z najważniejszych producentów drobiu w UE, dlatego kierunek wyznaczony przez Komisję Europejską będzie miał bezpośrednie znaczenie dla krajowych gospodarstw i przedsiębiorstw.",
      "Najbliższe lata mogą oznaczać konieczność inwestycji w systemy utrzymania zwierząt, dalsze zwiększanie wymagań dotyczących bioasekuracji, rozwój technologii monitorowania zdrowia i dobrostanu, rosnące znaczenie efektywności wykorzystania paszy i energii oraz nowe wymagania środowiskowe.",
      "Strategia UE dla sektora hodowlanego nie jest więc zapowiedzią ograniczania produkcji drobiarskiej. To przede wszystkim sygnał, że europejskie drobiarstwo ma pozostać ważnym elementem bezpieczeństwa żywnościowego, ale będzie musiało dalej inwestować w dobrostan, bioasekurację, efektywność i nowoczesne technologie.",
    ],
    links: [
      {
        href: "https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1834",
        label: "Komisja Europejska",
        document: false,
      },
    ],
    categories: ["Aktualności", "Polityka", "Hodowla"],
    image: "/media/news/logo-komisji-europejskiej.svg",
    source: "https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1834",
  },
];

const supplementalSlugs = new Set(supplementalNewsPosts.map((post) => post.slug));

export const newsPosts = [
  ...supplementalNewsPosts,
  ...content.posts
    .filter((post) => !supplementalSlugs.has(post.slug))
    .map((post) => ({
      ...sanitizeNewsPost({
        ...post,
        links: normalizeLinks(post.links),
      }),
      excerpt: normalizePreviewText(post.excerpt),
    })),
].map((post) => ({
  ...sanitizeNewsPost({
    ...post,
    links: normalizeLinks(post.links),
  }),
  excerpt: normalizePreviewText(post.excerpt),
}));

export function isTenderPost(post: NewsPost) {
  return (
    post.categories.includes("Zapytania ofertowe") ||
    post.title.toLocaleUpperCase("pl").startsWith("WYBÓR WYKONAWCY")
  );
}

export function tenderPosts() {
  return newsPosts.filter(isTenderPost);
}

export function pageBySlug(slug: string) {
  return knowledgePages.find((page) => page.slug === slug);
}

export function postBySlug(slug: string) {
  return newsPosts.find((post) => post.slug === slug);
}

export function pagesFor(slugs: string[]) {
  const position = new Map(slugs.map((slug, index) => [slug, index]));
  return knowledgePages
    .filter((page) => position.has(page.slug))
    .sort(
      (left, right) =>
        (position.get(left.slug) ?? 0) - (position.get(right.slug) ?? 0),
    );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export const primaryNavigation = [
  { href: "/o-izbie", label: "O IZBIE" },
  { href: "/aktualnosci", label: "AKTUALNOŚCI" },
  { href: "/rynek", label: "RYNEK I HANDEL" },
  { href: "/hodowla", label: "HODOWLA I OCENA" },
  { href: "/zrownowazony-rozwoj", label: "JAKOŚĆ I ROZWÓJ" },
  { href: "/baza-wiedzy", label: "BAZA WIEDZY" },
  { href: "/zapytania-ofertowe", label: "ZAPYTANIA OFERTOWE" },
];
