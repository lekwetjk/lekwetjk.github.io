export const proposedSummaries: Record<string, string> = {
  "aktualnosci": "Komunikaty, wydarzenia i informacje z branży drobiarskiej.",
  "kampanie": "Działania promocyjne i edukacyjne KRD-IG.",
  "dla-czlonkow": "Dokumenty i materiały dostępne dla zalogowanych członków Izby.",
  "dolacz-do-nas": "Zasady przystąpienia do Izby i deklaracja członkowska.",
  "korzysci-z-czlonkostwa": "Reprezentacja interesów branży, współpraca i dostęp do informacji.",
  "akcja-stopdezinformacjizywnosciowej": "Działania na rzecz rzetelnej informacji o żywności i produkcji drobiarskiej.",
  "dezinformacja-zywnosciowa": "Jak rozpoznawać i ograniczać rozpowszechnianie fałszywych informacji o żywności.",
  "e-book-o-dezinformacji-zywnosciowej": "Publikacja poświęcona dezinformacji żywnościowej i odpowiedzialnej komunikacji.",
  "studium-przypadku-biale-wlokna": "Analiza komunikacji dotyczącej białych włókien w mięsie drobiowym.",
  "wazne-linki": "Instytucje, organizacje i źródła informacji dla sektora drobiarskiego.",
  "zapytania-ofertowe": "Ogłoszenia, terminy składania ofert i wyniki postępowań.",
  "cennik": "Opłaty za usługi Działu Hodowli i Oceny Drobiu.",
  "dane-kontaktowe": "Zespół Działu Hodowli i Oceny Drobiu oraz dane kontaktowe.",
  "dzial-hodowli-i-oceny-drobiu": "Zadania działu w zakresie hodowli, oceny i ochrony zasobów genetycznych drobiu.",
  "metodyka-i-biuletyny": "Metody oceny drobiu i biuletyny z wynikami prac hodowlanych.",
  "pierze-i-puch-certyfikacja": "Informacje o certyfikacji pierza i puchu.",
  "rejestry-i-ksiegi": "Rejestry i księgi hodowlane prowadzone dla poszczególnych gatunków drobiu.",
  "wstawienia": "Zestawienia wstawień stad rodzicielskich kur mięsnych według miesięcy i lat.",
  "polityka-cookies": "Informacje dotyczące plików cookies wykorzystywanych w serwisie.",
  "polityka-prywatnosci": "Informacje dotyczące przetwarzania danych osobowych.",
  "bezpieczna-produkcja": "Zasady i działania wspierające bezpieczeństwo produkcji drobiarskiej.",
  "dobrostan-zwierzat": "Warunki utrzymania drobiu oraz zagadnienia dobrostanu zwierząt.",
  "jakosc-i-bezpieczenstwo": "Jakość żywności i bezpieczeństwo na kolejnych etapach produkcji drobiarskiej.",
  "poszanowanie-srodowiska": "Odpowiedzialne wykorzystanie zasobów i ograniczanie wpływu produkcji na środowisko.",
  "segmentacja": "Podział produktów drobiarskich według cech jakościowych i sposobu produkcji.",
  "system-qafp": "System gwarantowanej jakości żywności QAFP i zasady zachowania jakości produktów.",
  "zdrowy-drob": "Zdrowie drobiu, profilaktyka i bezpieczeństwo żywności.",
  "kontakt": "Dane biur KRD-IG i kontakty merytoryczne zespołu.",
  "czlonkowie": "Przedsiębiorstwa zrzeszone w Krajowej Radzie Drobiarstwa - Izbie Gospodarczej.",
  "komisje": "Komisje branżowe działające w strukturze Izby.",
  "krd-ig-w-organizacjach-miedzynarodowych": "Współpraca Izby z międzynarodowymi organizacjami branżowymi.",
  "o-nas": "Misja, historia i zakres działania Krajowej Rady Drobiarstwa - Izby Gospodarczej.",
  "statut": "Statut określający cele, organy i zasady działania Izby.",
  "zarzad-i-rada-izby": "Skład Zarządu, Rady Izby oraz pozostałych organów statutowych.",
  "bezpieczenstwo-bialkowe": "Zagadnienia dostępności białka paszowego i bezpieczeństwa zaopatrzenia sektora.",
  "eksport-import-z-unii-europejskiej": "Wykazy zakładów i informacje dotyczące obrotu produktami pochodzenia zwierzęcego.",
  "globalizacja-rynku": "Polski sektor drobiarski w międzynarodowym otoczeniu gospodarczym.",
  "handel-zagraniczny": "Zagadnienia eksportu, importu i dostępu do rynków zagranicznych.",
  "kraje-trzecie": "Kierunki handlu drobiem poza Unią Europejską i materiały dotyczące dostępu do rynków.",
  "promocja-drobiu": "Strategia i działania promujące polskie produkty drobiarskie.",
  "przedstawicielstwo-w-chinach": "Działalność przedstawicielstwa polskiej branży drobiarskiej w Chinach.",
  "raporty": "Raporty i zestawienia dotyczące produkcji oraz handlu drobiem.",
  "rynek-drobiu-w-polsce-w-liczbach": "Dane o produkcji, eksporcie i znaczeniu gospodarczym polskiej branży drobiarskiej.",
  "unia-europejska": "Rynek unijny i uwarunkowania handlu drobiem w Unii Europejskiej.",
};

export function proposedPageHref(slug: string) {
  if (["kontakt", "aktualnosci", "zapytania-ofertowe"].includes(slug)) return `/${slug}`;
  if (slug === "dla-czlonkow") return "/member/epi-geo";
  return `/tresc/${slug}`;
}

export function proposedSection(slug: string, section: string) {
  if (slug === "zdrowy-drob") return "Zdrowie";
  if (slug === "wazne-linki") return "Źródła i instytucje";
  return section;
}

export const excludedLibrarySlugs = new Set(["kontakt", "aktualnosci", "zapytania-ofertowe", "polityka-cookies", "polityka-prywatnosci", "dla-czlonkow"]);

export function cleanProposedParagraph(value: string) {
  return value.replace(/[\uE000-\uF8FF]/g, "").replace(/(\d)\s+%/g, "$1%").replace(/\s+/g, " ").trim();
}

export function localContentHref(href: string, entries: Array<{ source: string; slug: string; kind: "page" | "post" }>) {
  if (href.startsWith("/wp-content/uploads/")) return `https://krd-ig.com.pl${href}`;
  let url: URL;
  try { url = new URL(href); } catch { return href; }
  if (!["krd-ig.com.pl", "www.krd-ig.com.pl"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol)) return href;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname) || url.pathname.startsWith("/wp-content/")) return href;
  const pathname = url.pathname.replace(/\/$/, "");
  if (!pathname) return href;
  const entry = entries.find((candidate) => {
    try { return new URL(candidate.source).pathname.replace(/\/$/, "") === pathname; } catch { return false; }
  });
  return entry ? `${entry.kind === "page" ? proposedPageHref(entry.slug) : `/aktualnosci/${entry.slug}`}${url.search}${url.hash}` : href;
}