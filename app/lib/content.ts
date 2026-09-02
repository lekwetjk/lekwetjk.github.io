import rawContent from "../data/content.json";
import generatedContentPosts from "../data/generated-posts.json";

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
    id: 899999,
    slug: "ppwr-a-marki-wlasne-odpowiedz-ministerstwa-w-sprawie-statusu-wytworcy",
    title: "PPWR a marki własne: odpowiedź Ministerstwa w sprawie statusu „wytwórcy”",
    date: "2026-09-02T00:00:00",
    year: 2026,
    excerpt:
      "Ministerstwo Klimatu i Środowiska potwierdziło stanowisko KRD-IG: status „wytwórcy” w rozumieniu PPWR posiada podmiot zlecający produkcję pod marką własną, a nie wykonawca produkcji kontraktowej.",
    paragraphs: [
      "PPWR a marki własne: odpowiedź Ministerstwa w sprawie statusu „wytwórcy”.",
      "Od 12 sierpnia 2026 r. stosowane są przepisy rozporządzenia Parlamentu Europejskiego i Rady (UE) 2025/40 w sprawie opakowań i odpadów opakowaniowych (PPWR). Jednym z zagadnień budzących istotne wątpliwości przedsiębiorców jest ustalenie, kto posiada status „wytwórcy” w przypadku produktów wytwarzanych na zlecenie i sprzedawanych pod markami własnymi sieci handlowych.",
      "W praktyce pojawiają się oczekiwania, aby odpowiedzialność za realizację obowiązków wynikających z PPWR przejmowali producenci wykonujący produkcję kontraktową. Problem ten dotyczy różnych sektorów przemysłu spożywczego, w tym branży drobiarskiej, i może wpływać na treść umów oraz relacje przedsiębiorców z sieciami handlowymi.",
      "W związku z tym Krajowa Rada Drobiarstwa – Izba Gospodarcza wystąpiła do Minister Klimatu i Środowiska Pauliny Hennig-Kloski o pilne przedstawienie oficjalnego stanowiska interpretacyjnego. KRD-IG zwróciła się również do Ministra Rolnictwa i Rozwoju Wsi Stefana Krajewskiego z prośbą o interwencję w tej sprawie.",
      "W ocenie KRD-IG, przedstawionej w pismach, art. 3 ust. 1 pkt 13 lit. a PPWR wskazuje, że jeżeli przedsiębiorca zleca zaprojektowanie lub wytworzenie opakowania albo produktu w opakowaniu pod własną nazwą lub własnym znakiem towarowym, to właśnie podmiot zlecający – a nie wykonawca produkcji – posiada status „wytwórcy”. KRD-IG podkreśliła również, że status wynikający z rozporządzenia nie powinien być zmieniany poprzez postanowienia umowne lub praktykę handlową.",
      "W odpowiedzi z 28 sierpnia 2026 r. Departament Gospodarki Odpadami Ministerstwa Klimatu i Środowiska zasadniczo potwierdził ten kierunek interpretacji. Ministerstwo wskazało, że podmiot zlecający zaprojektowanie lub wytworzenie opakowania albo produktu w opakowaniu pod własną nazwą lub znakiem towarowym jest „wytwórcą” w rozumieniu PPWR. Wyjaśniono także, że chociaż „marka własna” nie ma odrębnej definicji prawnej, produkcja pod takim oznaczeniem mieści się w definicji określonej w art. 3 ust. 1 pkt 13 PPWR.",
      "Zgodnie z odpowiedzią Ministerstwa wytwórca może zlecić wykonanie w jego imieniu oceny zgodności oraz wyznaczyć upoważnionego przedstawiciela do wykonywania określonych zadań. Nie może jednak, jeżeli dany model współpracy odpowiada warunkom opisanym w rozporządzeniu, przenieść na inny podmiot samego statusu wytwórcy oraz związanej z nim odpowiedzialności za wykonanie obowiązków wynikających z PPWR.",
      "Należy jednocześnie pamiętać o przewidzianym w rozporządzeniu wyjątku dotyczącym mikroprzedsiębiorstw. Ocena konkretnego przypadku powinna zatem uwzględniać jego pełny stan faktyczny oraz treść zawartych umów.",
      "Zachęcamy przedsiębiorców do zapoznania się z całością korespondencji oraz przeanalizowania jej możliwego wpływu na obowiązki wynikające z PPWR, dokumentację zgodności i relacje kontraktowe z sieciami handlowymi.",
    ],
    links: [
      {
        href: "/media/reports/ppwr-pismo-mkis-hennig-kloska.pdf",
        label:
          "Pismo KRD-IG do Minister Klimatu i Środowiska z 7 sierpnia 2026 r. – pobierz.pdf",
        document: true,
      },
      {
        href: "/media/reports/ppwr-pismo-mrirw-krajewski.pdf",
        label: "Pismo do Ministra Rolnictwa i Rozwoju Wsi z 6 sierpnia 2026 r. – pobierz.pdf",
        document: true,
      },
      {
        href: "/media/reports/ppwr-odpowiedz-dgo-mkis.pdf",
        label:
          "Odpowiedź Departamentu Gospodarki Odpadami MKiŚ z 28 sierpnia 2026 r. – pobierz.pdf",
        document: true,
      },
    ],
    categories: ["Aktualności", "Prawo", "Środowisko"],
    image: "/media/environment.webp",
    source: "https://krd-ig.com.pl/",
  },
  {
    id: 900000,
    slug:
      "wybor-wykonawcy-projektu-zadania-pt-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-proje-2",
    title:
      "WYBÓR WYKONAWCY projektu (zadania) pt. „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym” wraz z przeprowadzeniem przez niezależny podmiot badania efektywności projektu (zadania)",
    date: "2026-08-31T00:00:00",
    year: 2026,
    excerpt:
      "Krajowa Rada Drobiarstwa – Izba Gospodarcza wyłoniła wykonawcę projektu pt. „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym”. Realizację zadania przejmie Instytut Badań Internetu i Mediów Społecznościowych sp. z o.o.",
    paragraphs: [
      "Krajowa Rada Drobiarstwa – Izba Gospodarcza informuje, że w ramach ogłoszonego w dniu 6 sierpnia 2026 r. Zapytania ofertowego dotyczącego projektu (zadania) pt.: „Ochrona wizerunku polskiego sektora drobiarskiego na rynku krajowym” wraz z przeprowadzeniem przez niezależny podmiot badania efektywności projektu (zadania) wyłoniła Wykonawcę, który zrealizuje ten projekt (zadanie).",
      "Do biura KRD-IG wpłynęła 1 oferta. W ramach I etapu oceny – ocena spełnienia warunków formalnych – oferta spełniła wymogi formalno-prawne.",
      "Ocena oferty została dokonana przez Komisję oceniającą (zespół ekspertów KRD-IG). W ramach oceny przedłożonej oferty I etap postępowania – II etap oceny (ocena jakości oferty) został oceniony na 87,66 pkt. na możliwą maksymalną liczbę 100 punktów.",
      "W II etapie postępowania oferta uzyskała 16 pkt. na 18 możliwych. Wobec powyższego, realizację projektu (zadania) będzie prowadził Oferent – Instytut Badań Internetu i Mediów Społecznościowych sp. z o.o.",
      "Dziękujemy wszystkim osobom i firmom, które przygotowały oferty i serdecznie gratulujemy wyłonionemu wykonawcy. Zespół KRD-IG zapowiada dalszy rozwój działań promocyjnych i badawczych w obszarze wizerunku polskiego sektora drobiarskiego na rynku krajowym.",
    ],
    links: [
      {
        href: "https://krd-ig.com.pl/wybor-wykonawcy-projektu-zadania-pt-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-proje-2/",
        label: "Oryginał ogłoszenia na stronie KRD-IG",
        document: false,
      },
    ],
    categories: ["Wybór wykonawcy"],
    image: "/media/post-14353.png",
    source:
      "https://krd-ig.com.pl/wybor-wykonawcy-projektu-zadania-pt-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-proje-2/",
  },
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
    categories: ["Zapytania ofertowe"],
    image: "/media/zo.png",
    source:
      "https://krd-ig.com.pl/zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6/",
  },
  {
    id: 900002,
    slug: "rozpoczyl-sie-audyt-komisji-europejskiej-w-brazylii-czy-po-3-wrzesnia-eksport-drobiu-do-ue-bedzie-wznowiony",
    title:
      "Rozpoczął się audyt Komisji Europejskiej w Brazylii. Czy po 3 września eksport drobiu do UE będzie wznowiony?",
    date: "2026-08-26T00:00:00",
    year: 2026,
    excerpt:
      "Brazylia ma szansę wrócić na unijny rynek drobiu, ale ostateczna decyzja zależy od wyniku audytu i dalszych działań Komisji Europejskiej.",
    paragraphs: [
      "Brazylia ma szansę wrócić na unijny rynek drobiu, ale ostateczna decyzja zależy od wyniku audytu i dalszych działań Komisji Europejskiej.",
      "Od 24 sierpnia do 4 września w Brazylii trwa kontrola mająca potwierdzić zgodność z unijnymi zasadami dotyczącymi antybiotyków.",
      "Nowe przepisy obowiązujące w UE wchodzą w życie 3 września. Jeśli audyt zakończy się pozytywnie, Komisja Europejska może rozważyć wniosek o ponowne włączenie Brazylii do grona krajów uprawnionych do eksportu drobiu i/lub miodu do UE.",
      "Decyzja zostanie poddana głosowaniu w komitecie PAFF, który spotka się 17–18 września, 20–21 października oraz 16–17 listopada.",
      "To oznacza, że choć ryzyko chwilowego zamknięcia rynku nadal istnieje, Brazylia nie traci całkowicie szansy na odzyskanie dostępu do unijnego rynku.",
      "W praktyce kluczowe będzie to, czy audyt potwierdzi zgodność z normami UE, a następnie — kiedy PAFF podejmie ostateczną decyzję.",
      "W skrócie: audyt w sierpniu ma kluczowe znaczenie, a finalna decyzja może zapadać dopiero po kolejnych posiedzeniach PAFF we wrześniu i później.",
    ],
    links: [
      {
        href: "https://www.euractiv.com/news/brazilian-chicken-exports-face-eu-halt-despite-last-minute-audit/",
        label: "Euractiv",
        document: false,
      },
    ],
    categories: ["Aktualności", "Rynek", "Polityka"],
    image: "/media/news/logo-komisji-europejskiej.svg",
    source:
      "https://www.euractiv.com/news/brazilian-chicken-exports-face-eu-halt-despite-last-minute-audit/",
  },
  {
    id: 900003,
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
  {
    id: 900003,
    slug: "szczepienia-przeciwko-nd-w-polsce-doswiadczenia-po-roku-od-obowiazywania-przepisu",
    title: "Szczepienia przeciwko ND w Polsce – doświadczenia po roku od obowiązywania przepisu",
    date: "2026-08-11T10:00:00",
    year: 2026,
    excerpt:
      "Webinar poświęcony praktycznym doświadczeniom z wdrażania obowiązkowych szczepień przeciwko chorobie Newcastle w stadach komercyjnych oraz ich znaczeniu dla immunoprofilaktyki drobiu.",
    paragraphs: [
      "Webinar odbędzie się 11 sierpnia 2026 r. w godzinach 10:00–11:15.",
      "Krajowe przepisy dotyczące obowiązkowego szczepienia kur i indyków w stadach komercyjnych zostały opublikowane 28 kwietnia 2025 r., więc ponad rok temu, a jednocześnie niemal dwa lata od pierwszego ogniska ND w Polsce w 2023 r.",
      "Od dwóch i pół lat na niezliczonych szkoleniach, konferencjach i webinariach temat rzekomego pomoru drobiu jest niemal gwarantowanym punktem każdego wydarzenia. W tym czasie również lekarze weterynarii, hodowcy i Inspekcja Weterynaryjna mierzą się z problemem, jak zaplanować, zorganizować i zweryfikować szczepienia drobiu.",
      "Niestety potrzeba czasu, aby dobrze wykonane szczepienia przyniosły oczekiwane efekty. Ale co oznaczają dobrze wykonane szczepienia i skuteczny program szczepień? Co wpływa na zbudowanie wysokiej, trwałej, populacyjnej odporności drobiu? Jak wykorzystywać wyniki badań laboratoryjnych do zarządzania immunoprofilaktyką stad? I w końcu – jak to wszystko zastosować w praktyce?",
      "Na te i inne pytania odpowiedzą nasi prelegenci – lekarze weterynarii i specjaliści, którzy na co dzień z sukcesami zajmują się profilaktyką i leczeniem tysięcy stad drobiu.",
      "Webinarium skierowane jest do lekarzy weterynarii, pracowników Inspekcji Weterynaryjnej, hodowców i wszystkich, którzy na co dzień mierzą się z wyzwaniem, jakim jest immunoprofilaktyka stad drobiu przeciwko chorobie Newcastle.",
      "Liczba uczestników jest ograniczona, dlatego zarezerwuj swój czas i zarejestruj się już dziś!",
      "Link do rejestracji: https://us06web.zoom.us/meeting/register/oYqzTRTDQpCxF9CA6JwJpA",
    ],
    links: [
      {
        href: "https://us06web.zoom.us/meeting/register/oYqzTRTDQpCxF9CA6JwJpA",
        label: "Zarejestruj się na webinar",
        document: false,
      },
    ],
    categories: ["Aktualności", "Webinarium", "Hodowla"],
    image: "/media/kura.png",
    source: "https://us06web.zoom.us/meeting/register/oYqzTRTDQpCxF9CA6JwJpA",
  },
  {
    id: 900004,
    slug: "ied-2-0-unia-europejska-chce-zmian-w-przepisach-o-ochronie-srodowiska-czy-branza-drobiarska-ma-sie-czego-obawiac",
    title:
      "IED 2.0 - Unia Europejska chce zmian w przepisach o ochronie środowiska. Czy branża drobiarska ma się czego obawiać?",
    date: "2026-08-11T12:00:00",
    year: 2026,
    excerpt:
      "Analiza skutków wpływu projektu ustawy UC99 na instalacje do chowu lub hodowli drobiu, w tym nowe progi WPO, zasady sumowania obsady i terminy dostosowania.",
    paragraphs: [
      "Analiza skutków wpływu projektu ustawy o zmianie ustawy – Prawo ochrony środowiska oraz niektórych innych ustaw, oznaczonego w wykazie prac Rady Ministrów numerem UC99, na instalacje do chowu lub hodowli drobiu.",
      "W dniu 4 sierpnia 2024 r. weszła w życie dyrektywa 2024/1785 z dnia 24 kwietnia 2024 r. dotycząca zmiany dyrektywy 2010/75/UE w sprawie emisji przemysłowych i dyrektywy Rady 1999/31/WE w sprawie składowania odpadów.",
      "Państwa członkowskie UE są zobowiązane do dokonania transpozycji tej dyrektywy do dnia 1 lipca 2026 r.",
      "Zaproponowane zmiany wynikają więc przede wszystkim z konieczności dostosowania polskiego prawa do nowych regulacji wynikających z IED 2.0 dotyczących instalacji wymagających uzyskania pozwolenia zintegrowanego.",
      "Ponadto projektowana ustawa zawiera zmiany wynikające z wystosowanych przez Komisję Europejską zarzutów formalnych (naruszenie nr 2023/2173) dotyczących uchybienia zobowiązaniom wynikającym z przepisów dyrektywy 2010/75/UE.",
      "Zmiany obejmują także elementy pośrednio powiązane z IED dotyczące zasad funkcjonowania krajowego systemu pozwoleń zintegrowanych.",
      "Najważniejszy skutek",
      "Projekt UC99 rozszerzy krąg ferm drobiu objętych regulacjami dotyczącymi emisji przemysłowych, zwłaszcza ferm kur niosek, indyków, kaczek i gęsi. Jednocześnie ma ustanowić dla ferm drobiu odrębny, częściowo uproszczony reżim w porównaniu z typowymi instalacjami przemysłowymi.",
      "Poniższa analiza dotyczy projektu z 10 marca 2026 r., udostępnionego w ramach konsultacji (nie jest to ostateczny tekst).",
      "1. Nowe progi WPO",
      "Obecnie próg dla drobiu wynosi zasadniczo ponad 40 000 szt., niezależnie od gatunku. Projektowane przepisy zastępują ten jednolity próg systemem współczynników przeliczenia obsady (WPO).",
      "Rodzaj drobiu | Próg | Orientacyjna maks. obsada (szt.)",
      "Brojlery | 280 WPO | 40 000",
      "Kury nioski | 300 WPO | 21 429",
      "Indyki | 280 WPO | 9 334",
      "Kaczki | 280 WPO | 28 000",
      "Gęsi | 280 WPO | 14 000",
      "Strusie | 280 WPO | 800",
      "Wyliczenia wynikają ze współczynników: 0,007 dla brojlera, 0,014 dla kury nioski, 0,03 dla indyka, 0,01 dla kaczki, 0,02 dla gęsi i 0,35 dla strusia.",
      "W praktyce dla brojlerów próg pozostanie zasadniczo na obecnym poziomie, fermy niosek mogą wejść do systemu już przy około 21,4 tys. szt., a szczególnie duża zmiana nastąpi dla indyków — próg odpowiada około 9,3 tys. szt.",
      "Przy stadach mieszanych nie można stosować prostego limitu liczby ptaków. Konieczne będzie przeliczenie całej maksymalnej obsady na WPO, przy zastosowaniu dodatkowego współczynnika 0,93 dla kur niosek.",
      "2. Sumowanie instalacji",
      "Projektowane rozporządzenie przewiduje sumowanie WPO kilku instalacji znajdujących się na terenie jednego zakładu oraz instalacji położonych w sąsiadujących zakładach, jeżeli prowadzący pozostają w związku gospodarczym lub prawnym albo pomiędzy instalacjami występuje powiązanie funkcjonalne.",
      "Ma to zapobiegać formalnemu dzieleniu jednej fermy na kilka podmiotów lub budynków znajdujących się poniżej progów. O kwalifikacji będzie więc decydować nie tylko obsada pojedynczego kurnika, lecz także struktura własnościowa, organizacyjna i technologiczna całego przedsięwzięcia.",
      "3. Pozwolenie zintegrowane",
      "W ogólnym opisie UC99 na stronie KPRM wskazano, że uproszczony system dla chowu drobiu i świń mógłby polegać np. na objęciu instalacji zgłoszeniem. Jednak wersja projektu z 10 marca 2026 r. nadal posługuje się obowiązkiem uzyskania pozwolenia zintegrowanego dla instalacji przekraczających odpowiednie progi.",
      "Nie należy więc obecnie zakładać, że wystarczy zwykłe zgłoszenie. Projekt zalicza instalacje chowu drobiu i świń do kategorii I, co w połączeniu z projektowanym art. 378 Prawa ochrony środowiska oznacza, że organem wydającym pozwolenie zintegrowane ma być co do zasady marszałek województwa.",
      "4. Jednolite zasady eksploatacyjne UE",
      "Warunki funkcjonowania ferm mają wynikać z unijnych jednolitych zasad eksploatacyjnych. Mają one obejmować m.in. dopuszczalne wielkości emisji i poziomy efektywności środowiskowej, sposób i częstotliwość monitorowania, żywienie i przygotowywanie pasz, utrzymywanie ptaków w budynkach, gospodarkę nawozami naturalnymi, przechowywanie padłych zwierząt oraz działania zapobiegające zanieczyszczeniom.",
      "W praktyce może to oznaczać konieczność modernizacji systemów wentylacyjnych i żywieniowych, ograniczania emisji amoniaku i pyłu, lepszego zabezpieczenia pomiotu, prowadzenia pomiarów zużycia wody i energii oraz rozbudowania dokumentacji środowiskowej.",
      "Dokładnych wymogów technicznych nie można jeszcze przesądzić, ponieważ Komisja Europejska ma przyjąć jednolite zasady najpóźniej do 1 września 2026 r.; prace nad nimi nadal trwają.",
      "5. Model mieszany obowiązków",
      "Projektowany art. 219b wyłącza stosowanie do ferm drobiu i świń szeregu obowiązków przewidzianych dla innych instalacji przemysłowych. Organ będzie również mógł ograniczyć obowiązek składania wniosku o zmianę pozwolenia do przypadków, w których w fermie nastąpiła istotna zmiana, choć powinien brać pod uwagę skumulowany efekt kolejnych mniejszych zmian.",
      "Oznacza to model mieszany: więcej ferm zostanie objętych regulacją, ale procedury i obowiązki administracyjne mają być dla nich częściowo uproszczone.",
      "6. Odory i udział społeczeństwa",
      "Projekt ma wprost włączyć odory do definicji zanieczyszczenia. Przewiduje też szerszy udział społeczeństwa w postępowaniach związanych z pozwoleniami i dostosowaniem instalacji do wymagań BAT.",
      "Dla ferm drobiu może to zwiększyć znaczenie dokumentacji dotyczącej uciążliwości zapachowych, lokalizacji wentylatorów, sposobu przechowywania pomiotu oraz rozpatrywania skarg mieszkańców.",
      "7. Terminy dostosowania",
      "Terminy dostosowania mają być liczone od publikacji unijnych jednolitych zasad eksploatacyjnych: 4 lata dla instalacji od 600 WPO, 5 lat dla instalacji od 400 WPO oraz 6 lat dla pozostałych instalacji objętych nowymi progami.",
      "Oznacza to zasadniczo okres dostosowawczy przypadający około 2030–2032 r., zależnie od wielkości fermy i daty publikacji aktu KE.",
      "Według OSR projektowanej ustawy zidentyfikowano łącznie około 359 nowych instalacji chowu drobiu i świń, które mogą zostać objęte obowiązkiem uzyskania pozwolenia; dokument nie podaje osobnej liczby wyłącznie dla ferm drobiu.",
      "8. Wniosek",
      "Największe konsekwencje poniosą fermy niosek i indyków, które dziś nie przekraczają progu 40 tys. szt., ale przekroczą nowe progi WPO.",
      "Takie fermy powinny już teraz sprawdzić maksymalną możliwą obsadę, powiązania z sąsiednimi obiektami, stan gospodarki pomiotem oraz zgodność systemów utrzymania i monitoringu z wymaganiami BAT.",
    ],
    links: [
      {
        href: "https://www.gov.pl/web/premier",
        label: "Źródło: strona KPRM",
        document: false,
      },
    ],
    categories: ["Aktualności", "Prawo", "Hodowla", "Środowisko"],
    image: "/media/prawo.png",
    source: "https://www.gov.pl/web/premier",
  },
  {
    id: 900005,
    slug: "nowy-link-zsrir-w-zakladce-dokumenty",
    title: "W zakładce DOKUMENTY dodaliśmy nowy funkcjonalny link do Zintegrowanego Systemu Rolniczej Informacji Rynkowej",
    date: "2026-08-11T14:30:00",
    year: 2026,
    excerpt:
      "W sekcji DOKUMENTY udostępniliśmy nowy odnośnik do Zintegrowanego Systemu Rolniczej Informacji Rynkowej (ZSRIR).",
    paragraphs: [
      "W zakładce DOKUMENTY dodaliśmy nowy funkcjonalny link do Zintegrowanego Systemu Rolniczej Informacji Rynkowej.",
      "Dzięki temu użytkownicy serwisu mogą szybciej przejść bezpośrednio do ZSRIR i korzystać z aktualnych informacji rynkowych.",
    ],
    links: [
      {
        href: "https://zsrir.minrol.gov.pl/about",
        label: "Zintegrowany System Rolniczej Informacji Rynkowej",
        document: false,
      },
    ],
    categories: ["Aktualności", "Dokumenty"],
    image: "/media/partners/zsrir.svg",
    source: "https://zsrir.minrol.gov.pl/about",
  },
];

const supplementalSlugs = new Set(supplementalNewsPosts.map((post) => post.slug));

export const newsPosts = [
  ...(generatedContentPosts as NewsPost[]),
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
  categories: normalizeTenderCategories(post.title, post.categories),
  excerpt: normalizePreviewText(post.excerpt),
}));

function normalizeTenderCategories(title: string, categories: string[]) {
  const normalizedCategories = new Set<string>(categories.filter(Boolean));
  const lowerTitle = title.toLocaleLowerCase("pl");

  const isWinnerTitle = /^wybór wykonawcy\b|^wybor wykonawcy\b|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(lowerTitle);
  const hasWinnerCategory = categories.some((category) => /^wybór wykonawcy$|^wybor wykonawcy$|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(category));

  if (isWinnerTitle || hasWinnerCategory) {
    normalizedCategories.delete("Zapytania ofertowe");
    normalizedCategories.add("Wybór wykonawcy");
    return Array.from(normalizedCategories);
  }

  if (/zapytanie ofertowe/i.test(lowerTitle) || categories.some((category) => /zapytania ofertowe/i.test(category))) {
    normalizedCategories.delete("Wybór wykonawcy");
    normalizedCategories.add("Zapytania ofertowe");
  }

  if (/^wybór wykonawcy\b|^wybor wykonawcy\b|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(lowerTitle) || categories.some((category) => /^wybór wykonawcy$|^wybor wykonawcy$|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(category))) {
    normalizedCategories.add("Wybór wykonawcy");
  }

  if (/zaproszenie do składania ofert|zaproszenie-do-skladania-ofert/i.test(lowerTitle) || categories.some((category) => /zaproszenie do składania ofert|zaproszenie-do-skladania-ofert/i.test(category))) {
    normalizedCategories.add("Zaproszenie do składania ofert");
  }

  if (/wyniki postępowania|wyniki postepowania/i.test(lowerTitle) || categories.some((category) => /wyniki postępowania|wyniki postepowania/i.test(category))) {
    normalizedCategories.add("Wyniki postępowania");
  }

  if (/uniewa|unieważn/i.test(lowerTitle) || categories.some((category) => /uniewa|unieważn/i.test(category))) {
    normalizedCategories.add("Informacja o unieważnieniu");
  }

  return Array.from(normalizedCategories);
}

export function isTenderPost(post: NewsPost) {
  const normalizedCategories = post.categories.map((category) => category.toLocaleLowerCase("pl"));
  const title = post.title.toLocaleLowerCase("pl");

  const hasTenderCategory = normalizedCategories.some((category) =>
    /zapytania ofertowe|zaproszenie do składania ofert|wyniki postępowania|uniewa|unieważn/i.test(category),
  );

  const hasWinnerCategory =
    /^wybór wykonawcy\b|^wybor wykonawcy\b|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(title) ||
    normalizedCategories.some((category) => /^wybór wykonawcy$|^wybor wykonawcy$|\bwybór wykonawcy\b|\bwybor wykonawcy\b/i.test(category));

  return hasTenderCategory || hasWinnerCategory || /zapytanie ofertowe\b/i.test(title);
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
