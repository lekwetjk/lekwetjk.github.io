import type { NewsPost } from "./content";

// Manual corrections to the audited legacy records, not a general text filter.
// Keep the raw import/export intact. Managed publications take precedence later.
const legacySlugs: Record<number, string> = {
  14223: "czerwona-kartka-dla-dezinformacji",
  14102: "polish-poultry-na-alimentaria-2026-rekordowa-edycja-rekordowa-energia-rekordowa-polska",
  14048: "food-hospitality-vietnam-2026",
  13472: "polski-i-europejski-drob-na-filipinach-targi-wofex-2025-filipiny",
  12925: "branza-drobiarska-w-korei-poludniowej",
  12829: "polska-obecnosc-na-targach-sial-china-2025-polish-poultry",
  12815: "kampania-promujaca-mieso-indycze-2024-skuteczna-promocja-szeroki-zasieg-konkretne-rezultaty",
  10327: "indyk-ma-wiele-do-dania-podsumowanie-pazdziernika-2024",
  10325: "sial-paris-2024-wydarzenie-na-ktorym-nie-moglo-nas-zabraknac",
  10323: "indyk-ma-wiele-do-dania-podsumowanie-wrzesnia-2024",
  12807: "kampania-drob-z-europejskim-paszportem-na-targach-sial-china-2024",
  12881: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-alimentaria",
  10369: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-anuga-2023",
  10372: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-ife",
  10375: "promocja-polskiego-drobiu-na-targach-sial-paryz-2020",
  10378: "ogolnopolska-kampania-telewizyjna-i-radiowa-promocja-miesa-indyczego-na-rynku-krajowym",
  10381: "kampania-szeroko-zasiegowa-ogolnopolska-promocja-miesa-kurczecego-na-rynku-krajowym",
  10384: "obchody-dnia-dziecka-podczas-pikniku-poznaj-dobra-zywnosc-polska-smakuje",
  10367: "piknik-z-okazji-dnia-dziecka-na-dziedzincu-w-ogrodach-i-na-dziedzincu-kancelarii-prezesa-rady-ministrow",
  10364: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-ife-w-londynie",
  10361: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-anuga-2021",
  10358: "falsz-wkurza-kampania-krajowej-rady-drobiarstwa-izby-gospodarczej",
  10121: "promocja-polskiego-drobiu-i-jego-przetworow-na-targach-anuga-2019",
  10109: "indyk-z-europy-pod-skrzydlami-jakosci",
  10115: "europejski-drob-to-jest-nasz-drob",
  10105: "drob-z-europejskim-paszportem-na-rynkach-chin-hongkongu-i-japonii",
};

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
const videoLinks = (text: string) =>
  text.replace(/https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g, (url) => `[${url}](${url})`);
const heading = (text: string) => `## ${text}`;
const punctuation = (text: string) => text.replace(/\s+([,.!:;])/g, "$1");

function joinAdjacentLists(paragraphs: string[]) {
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    if (/^- /m.test(paragraph) && paragraph.split("\n").every((line) => /^- /.test(line)) &&
        result.length && result[result.length - 1].split("\n").every((line) => /^- /.test(line))) {
      result[result.length - 1] += `\n${paragraph}`;
    } else {
      result.push(paragraph);
    }
  }
  return result;
}

export function correctCampaignPost(post: NewsPost): NewsPost {
  if (post.managed || !post.categories.includes("Kampanie")) return post;

  if (post.slug === "wybierz-twoje-wartosci") {
    return {
      ...post,
      paragraphs: joinAdjacentLists(post.paragraphs.map((text) =>
        text === "**Cele kampanii:**" ? heading("Cele kampanii") : text)),
    };
  }
  if (legacySlugs[post.id] !== post.slug) return post;

  const p = post.paragraphs;
  let correction: Partial<Pick<NewsPost, "title" | "excerpt" | "paragraphs" | "links">> = {};
  switch (post.id) {
    case 14223:
      correction = {
        excerpt: "Szymon Marciniak ambasadorem polskiego drobiu.",
        paragraphs: [
          "„Czerwona kartka dla dezinformacji” — Szymon Marciniak ambasadorem polskiego drobiu.",
          "Strona kampanii: [www.stopdezinformacjizywnosciowej.pl](https://www.stopdezinformacjizywnosciowej.pl/).",
        ],
      };
      break;
    case 14102:
      correction = {
        excerpt: punctuation(p[0]),
        paragraphs: [
          punctuation(p[0]), heading(p[1]),
          p[2].replace("POLISH POULTR Y", "POLISH POULTRY").replace("sektora :", "sektora:"),
          list(p[3].split(" / ")), ...p.slice(4, 6), heading(p[6]),
          punctuation(p[7]), p[8], heading(p[9]), p[10],
          list(p.slice(11, 16).map(punctuation)), punctuation(p[16]),
          heading(p[17]), punctuation(p[18]), p[19],
        ],
      };
      break;
    case 14048:
      // The complete lead and factual dates/geography are already preserved.
      break;
    case 13472:
      correction = {
        paragraphs: p.filter((text) => !/^(?:[1-7]|enjoy)$/.test(text)),
      };
      break;
    case 12925:
      correction = {
        title: "Branża drobiarska w Korei Południowej – inauguracja kampanii „Europejski drób – z naszych ferm na Twój stół”",
        paragraphs: [
          ...p.slice(0, 5).map((text) => text.replaceAll("m.in .", "m.in.")),
          `${p[5]} ${p[6]}`.replace("targi w Seoulu Food & Hotel", "targi Seoul Food & Hotel w Seulu"),
          p[7],
        ],
        links: post.links.filter((link) => !/^https?:\/\/m\.in\/?$/.test(link.href)),
      };
      break;
    case 12829:
      correction = {
        excerpt: p[0],
        paragraphs: p.map((text) => text.replace("Przedstawicieli polskich firm", "Przedstawiciele polskich firm")),
      };
      break;
    case 12815:
      correction = {
        excerpt: p[0],
        paragraphs: [
          p[0], heading(p[1]), p[2], p[3], heading(p[4]), p[5],
          list(p.slice(6, 10)),
          "W ramach kampanii uruchomiono stronę indykajemy.pl, zawierającą bazę przepisów, porady oraz narzędzia kalkulacyjne dla HoReCa.",
          heading(p[11]), p[12], heading(p[13]), p[14],
        ],
        links: [],
      };
      break;
    case 10327:
      correction = {
        excerpt: p[0],
        paragraphs: [
          p[0], heading("Programy telewizyjne"), p[1], list(p.slice(2, 5).map(videoLinks)),
          "W październiku aktualizowano stronę kampanii indykajemy.pl.",
          "Reklama digitalowa zapewniła obecność kampanii na polskich portalach informacyjnych i branżowych, m.in. [interia.pl](https://www.interia.pl/), [wp.pl](https://www.wp.pl/) oraz foodservice24.pl.",
          heading("Współpraca z twórcami internetowymi"),
          "Podjęto współpracę ze znanymi blogerami kulinarnymi i kucharzami, m.in.:",
          list([
            "[Olga Smile](https://www.olgasmile.com/)",
            "[Beata i Igor Gratkowscy](https://www.instagram.com/praktykulinarni/)",
            "[Svetlana Tuchak](https://www.instagram.com/fit_przepisy_od_baletnicy/)",
            "[Tomasz Strzelczyk](https://www.instagram.com/oddaszfartucha/)",
            "[Martyna Sobczak](https://www.instagram.com/maste_official/)",
            "[Monika Molecka](https://www.instagram.com/pysznieczyprzepysznie/)",
            "[Natalia Maszkowska Food & Travel](https://www.instagram.com/nathallae/)",
          ]),
          p[8], heading("Handel i wydarzenia kulinarne"),
          list([p[9], videoLinks(p[10])]),
          "[Raport za październik 2024 (PDF)](/media/reports/KRD-indyk_pazdziernik.pdf)",
          p[13],
        ],
        links: [
          ...post.links.filter((link) =>
            !/indykajemy\.pl|KRD-indyk_pazdziernik\.pdf/.test(link.href)),
          {
            href: "/media/reports/KRD-indyk_pazdziernik.pdf",
            label: "Raport za październik 2024 (PDF)",
            document: true,
          },
        ],
      };
      break;
    case 10325:
      correction = {
        excerpt: p[0],
        paragraphs: p.map((text) => punctuation(text.replace("280 m2", "280 m²"))),
      };
      break;
    case 10323: {
      const lead = "KRD-IG realizuje multikanałową kampanię promującą mięso indycze na rynku krajowym, która ma na celu zwiększenie jego konsumpcji na co dzień, a nie tylko od święta. Mięso indycze jest zalecane w diecie, ale wciąż zbyt rzadko pojawia się w codziennym menu. Popularyzacja oraz podkreślenie odżywczych i kulinarnych zalet indyka zmierzają do przełamania barier, które obecnie ograniczają jego spożycie.";
      correction = {
        excerpt: lead,
        paragraphs: [
          lead, heading("Programy telewizyjne"), p[1],
          list([videoLinks(p[2]), "Dzień dobry TVN — materiał kulinarny."]),
          "Powstała strona kampanii indykajemy.pl z przepisami na dania z indyka oraz sekcją dla HoReCa.",
          "Reklama internetowa w postaci banerów display na portalach konsumenckich (m.in. [interia.pl](https://www.interia.pl/), [wp.pl](https://www.wp.pl/)) oraz branżowych HoReCa (foodservice24.pl, e-restauracja.pl, hurt&detal i horectrends.pl) dotarła do szerokiego grona odbiorców.",
          heading("Wydarzenia kulinarne"), p[6], list(p.slice(7, 9).map(videoLinks)),
          "[Raport za wrzesień 2024 (PDF)](/media/reports/KRD_Indyk_wrzesien.pdf)",
          p[11], p[12],
        ],
        links: [
          ...post.links.filter((link) =>
            !/indykajemy\.pl|dziendobry\.tvn\.pl|KRD_Indyk_wrzesien\.pdf/.test(link.href)),
          { href: "/media/reports/KRD_Indyk_wrzesien.pdf", label: "Raport za wrzesień 2024 (PDF)", document: true },
        ],
      };
      break;
    }
    case 12807:
      correction = {
        excerpt: punctuation(p[0]),
        paragraphs: [
          ...p.slice(0, 5).map(punctuation),
          "Kampania została sfinansowana ze środków Unii Europejskiej oraz Funduszu Promocji Mięsa Drobiowego.",
        ],
      };
      break;
    case 12881: {
      const lead = "Handel zagraniczny z Półwyspem Iberyjskim od lat zajmuje wysoką pozycję w klasyfikacji eksportu polskiego mięsa drobiowego. Hiszpania stanowi istotny kierunek w handlu zagranicznym, będąc łącznikiem między Europą a Ameryką Łacińską.";
      correction = {
        excerpt: lead,
        paragraphs: [
          lead, p[1], p[2],
          p[3].replace("POLISH POUTRY ,", "POLISH POULTRY,").replace("110 m2", "110 m²").replace("usytułowane", "usytuowane"),
          "W ramach wspólnego stoiska polskiej branży drobiarskiej udział wzięli:",
          list([
            "producenci: DROBEX / DROSED HOLDING / FOOD PARK / INDYKPOL / INDYK ŚLĄSK / ŁUKOSZ / SUPERDROB;",
            "trader: MEAT TEAM POLAND.",
          ]),
          ...p.slice(5),
        ],
      };
      break;
    }
    case 10369:
      correction = {
        paragraphs: [
          post.excerpt.replace(/\s+/g, " "),
          punctuation(p[0]),
          "Targi ANUGA spotkały się z bardzo dużym zainteresowaniem zarówno odwiedzających, jak i wystawców, potwierdzając swoje znaczenie jako największej platformy biznesowej na świecie. W targach udział wzięło 7 850 wystawców ze 118 krajów, w tym 248 firm z Polski. Udział firm spoza Niemiec wyniósł 94%. Wystawcy zaprezentowali swoje produkty na powierzchni 300 000 m² przed gronem blisko 140 000 odwiedzających z 200 krajów.",
          punctuation(p[2].replace("sp.j.", "sp. j.").replace("sp. zo.o.", "sp. z o.o.")),
          p[3],
        ],
      };
      break;
    case 10372:
      correction = {
        paragraphs: [
          "Czas trwania kampanii: 2 stycznia – 31 marca 2023 r.",
          p[0],
          p[1].replace("jak i krajach trzecich", "jak i w krajach trzecich").replace("), wymaga", ") wymagają").replace(/,$/, "."),
          "Przedmiotem zadania była organizacja stoiska i zapewnienie jego efektywnego funkcjonowania w czasie targów IFE 2023. Stoisko było usytuowane w sektorze mięsnym i zostało zaprojektowane tak, aby każda z firm miała własną przestrzeń do rozmów biznesowych.",
          "Prócz przestrzeni biznesowej na stoisku znalazła się strefa kulinarna, gdzie odbywały się pokazy i degustacje dań na bazie polskiego drobiu. Przyciągały one uwagę zwiedzających i pomagały stworzyć pozytywną atmosferę rozmów biznesowych.",
          p[5],
        ],
      };
      break;
    case 10375:
      correction = {
        title: "Promocja polskiego drobiu na targach SIAL Paryż 2022 – projekt zaplanowany na 2020 r.",
        paragraphs: [
          "Projekt realizowany w terminie od 15 stycznia 2020 do 31 października 2022 r. Targi zaplanowane pierwotnie na 2020 r. odbyły się w 2022 r.",
          p[0].replace("targach SIAL, nie", "targach SIAL nie"),
          p[1].replace("tegorocznej edycji targów IFE", "edycji targów SIAL w 2022 r.").replace("spowodowanej sytuacją", "spowodowany sytuacją"),
          ...p.slice(2),
        ],
      };
      break;
    case 10378:
      correction = {
        title: post.title.replace("radiowa–", "radiowa –"),
        paragraphs: [
          post.excerpt, p[0],
          "Główne akcenty kampanii położono na prostotę i szybkość przyrządzania mięsa z indyka. Triki kulinarne pokazywały, jak przygotować mięso, aby było kruche i soczyste, podkreślając jego wysoką jakość, smakowitość i dietetyczność.",
          heading("Grupa docelowa"), p[3],
          p[4].replace("Eskadra , która", "Eskadra, która"), p[5],
          heading("Kanały komunikacji"),
          list([
            p[6].replace("Kanały dotarcia wykorzystane w komunikacji do konsumentów : ", "").replace("stacja główne", "stacja główna"),
            p[7].replace("anteny :", "anteny:").replace("VOX,RMF", "VOX, RMF"),
            p[8],
          ]),
          heading("Emisje i działania niestandardowe"), p[9], p[10],
        ],
      };
      break;
    case 10381:
      correction = {
        title: "Kampania szerokozasięgowa, ogólnopolska – „Promocja mięsa kurczęcego na rynku krajowym”",
        excerpt: p[0].replace("Szeroko zasięgowa", "Szerokozasięgowa"),
        paragraphs: [
          p[0].replace("Szeroko zasięgowa", "Szerokozasięgowa"),
          "Kampania realizowana jest przez agencję [Brandcomm Polska](https://www.brandcomm.agency/), która jest jednocześnie autorem koncepcji kreatywnej spotu TV oraz radiowego (formaty spotu – 30 i 15 sekund). Agencja wyłoniona została w ramach konkurencyjnej procedury wyboru wykonawcy. Kampania finansowana jest ze środków Funduszu Promocji Mięsa Drobiowego.",
          heading("Grupa docelowa"),
          "Główna grupa mediowa – wszystkie osoby w wieku 20–49 lat.",
          heading("Kanały komunikacji"),
          list([
            "TELEWIZJA – medium wiodące. Komunikację o szerokim zasięgu dobrano pod kątem preferencji grupy docelowej, opierając ją na stacjach TVP, Polsat, TVN oraz PTV (zasięg Rodzina).",
            "RADIO – kampania uzupełniająca, emitowana przez: RMF, Radio Zet, PR 1, Eska, Złote Przeboje, Wawa, Pogoda, Plus, VOX, TOK.FM, Muzo.FM.",
            "LOKOWANIA PRODUKTU – w programie „Pytanie na śniadanie” oraz w programie Polskiego Radia „Cztery Pory Roku”.",
          ]),
          heading("Emisje"),
          list([
            "TV – spoty 30- i 15-sekundowe: 5–30 października 2022 r.; wejścia kuchenne w „Pytaniu na śniadanie”: 15 października 2022 r.",
            "RADIO – spoty 30- i 15-sekundowe: 3–23 października 2022 r.; lokowanie w programie „Cztery Pory Roku” zaplanowano na drugą połowę listopada 2022 r.",
          ]),
        ],
      };
      break;
    case 10384:
      correction = {
        excerpt: punctuation(p[0]),
        paragraphs: [
          punctuation(p[0]),
          p[1].replace("Artur Moroz przygotowując", "Artur Moroz, przygotowując").replace("nieodłączonym", "nieodłącznym"),
          "Jedna z młodszych uczestniczek pikniku, ośmioletnia Oliwia, słuchała prezentacji szefa kuchni i próbowała przygotowanych potraw. Swoje wrażenia opisała w rymowankach o polskim drobiu, spisanych przez jej dziadka.",
          "[Polski drób w oczach dziecka – rymowanka 1 (PDF)](/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-1.pdf)",
          "[Polski drób w oczach dziecka – rymowanka 2 (PDF)](/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-2.pdf)",
        ],
        links: [
          { href: "/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-1.pdf", label: "Polski drób w oczach dziecka – rymowanka 1 (PDF)", document: true },
          { href: "/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-2.pdf", label: "Polski drób w oczach dziecka – rymowanka 2 (PDF)", document: true },
        ],
      };
      break;
    case 10367: {
      const lead = p[0].replace("na dziedzińcu i ogrodach", "na dziedzińcu i w ogrodach").replace("wydarzania", "wydarzenia");
      correction = {
        title: "Piknik z okazji Dnia Dziecka w ogrodach i na dziedzińcu Kancelarii Prezesa Rady Ministrów",
        excerpt: lead,
        paragraphs: [
          lead,
          p[1].replace("Podczas Pikniku, stanowisko", "Podczas pikniku stanowisko").replace("mini miasteczka", "minimiasteczka"),
        ],
      };
      break;
    }
    case 10364:
      correction = {
        excerpt: p[0].replace("IFE które", "IFE, które"),
        paragraphs: [
          p[0].replace("IFE które", "IFE, które"), p[1],
          heading("Cele udziału w targach IFE 2022"),
          "Udział w targach miał na celu:",
          list([
            "stworzenie pozytywnych warunków rozwoju eksportu poprzez podtrzymanie i rozwój istniejących relacji biznesowych, pozyskanie nowych kontraktów oraz budowę świadomości marek „Polski drób” i „Polska Smakuje”;",
            "promowanie bogatej oferty polskich producentów i przetwórców drobiu oraz ich elastyczności w dopasowaniu asortymentu i cięć do oczekiwań odbiorców z Wielkiej Brytanii i całego świata;",
            "zapewnienie optymalnych warunków do rozmów biznesowych, tak aby każdy ze współwystawców miał szansę podtrzymać istniejące relacje handlowe i nawiązać nowe kontakty;",
            "dalszą integrację branży poprzez wspólne stoisko, świadczące o jej sile i wspierające wspólną strategię rozwoju na rynku lokalnym i rynkach eksportowych.",
          ]),
          p[3],
        ],
      };
      break;
    case 10361:
      correction = {
        excerpt: p[0],
        paragraphs: p.map((text) => punctuation(text.replace("247 m 2", "247 m²").replace("trade’rów", "traderów"))),
      };
      break;
    case 10358:
      correction = {
        paragraphs: [
          p[0], p[1].replace("tzw „", "tzw. „"),
          "Więcej na [dobrydrob.pl](https://dobrydrob.pl/).", p[3],
        ],
        links: post.links.map((link) => ({ ...link, href: "https://dobrydrob.pl/", label: "dobrydrob.pl" })),
      };
      break;
    case 10121:
      correction = {
        excerpt: "Obecność branży drobiarskiej pod wspólnym brandem „Polish Poultry” na największych na świecie targach ANUGA w Kolonii, na stoisku stanowiącym powierzchnię wystawienniczo-targową dla dwudziestu jeden wystawców branży, to działanie potrzebne i przynoszące wymierne korzyści biznesowe.",
        paragraphs: [
          p[0].replace("kampanii :", "kampanii:"),
          "Obecność branży drobiarskiej pod wspólnym brandem „Polish Poultry” na największych na świecie targach ANUGA w Kolonii, na stoisku stanowiącym powierzchnię wystawienniczo-targową dla dwudziestu jeden wystawców branży, to działanie potrzebne i przynoszące wymierne korzyści biznesowe. Wspólne stoisko umożliwiło firmom aktywną obecność na targach i nawiązanie cennych kontaktów biznesowych. Część z nich indywidualnie nie zdecydowałaby się na wykupienie własnej powierzchni.",
          ...p.slice(2),
        ],
      };
      break;
    case 10109:
      correction = {
        excerpt: "Przedmiotem programu promocyjnego jest mięso indycze produkowane w Europie. Działania promocyjne realizowane są na trzech rynkach docelowych: w Polsce, Niemczech i Czechach.",
        paragraphs: [
          "Czas trwania kampanii: maj 2019 – kwiecień 2021.",
          "Przedmiotem programu promocyjnego jest mięso indycze produkowane w Europie. Działania promocyjne realizowane są na trzech rynkach docelowych: w Polsce, Niemczech i Czechach.",
          ...p,
        ],
        // The export links to an obsolete test host, not an available attachment.
        links: [],
      };
      break;
    case 10115:
      correction = {
        excerpt: "W ramach współpracy między pięcioma członkami europejskiej organizacji reprezentującej sektor drobiarski AVEC rozpoczęły się prace nad projektem ochrony wizerunku europejskiego drobiu.",
        paragraphs: [
          "Czas trwania kampanii: styczeń 2020 – grudzień 2021.",
          "W ramach współpracy między pięcioma członkami europejskiej organizacji reprezentującej sektor drobiarski AVEC rozpoczęły się prace nad projektem ochrony wizerunku europejskiego drobiu.",
          p[0], p[1],
          list(["przetwarzanie i bezpieczeństwo żywności;", "środowisko i zrównoważony rozwój;", "dobrostan zwierząt."]),
        ],
      };
      break;
    case 10105:
      correction = {
        excerpt: "Przedmiotem działalności promocyjnej będzie mięso drobiowe z Unii Europejskiej. Głównym celem kampanii jest zwiększenie eksportu europejskiego drobiu na rynki docelowe: Chiny, Hongkong i Japonia.",
        paragraphs: [
          "Przedmiotem działalności promocyjnej będzie mięso drobiowe z Unii Europejskiej. Głównym celem kampanii jest zwiększenie eksportu europejskiego drobiu na rynki docelowe: Chiny, Hongkong i Japonia.",
          p[0],
          "Promocja drobiu na rynkach azjatyckich była jednym z priorytetów w 2019 r. Kampania miała zwiększać świadomość grup docelowych co do wysokiej jakości drobiu z Europy, jego właściwości zdrowotnych i bezpieczeństwa, wynikającego z podejścia „od pola do stołu”, możliwości śledzenia, kontroli ryzyka, zrównoważonej produkcji oraz wiarygodności dostawców.",
          "Działania kampanii zaplanowano na rynkach Chin (w tym Hongkongu) i Japonii.",
          p[3],
        ],
      };
      break;
  }
  return Object.keys(correction).length ? { ...post, ...correction } : post;
}
