import { pagesFor } from "../lib/content";
import { withBasePath } from "../lib/basePath";
import { Arrow, PageShell } from "./SiteChrome";

type HubPageProps = {
  eyebrow: string;
  title: string;
  lead: string;
  image: string;
  imageAlt: string;
  slugs: string[];
  facts?: Array<{ value: string; label: string }>;
  hidePreviewForSlugs?: string[];
  previewSentenceOnly?: boolean;
  previewMaxLength?: number;
  language?: "pl" | "en";
};

const englishDirectoryContent: Record<string, { title: string; preview: string; href?: string }> = {
  "rynek-drobiu-w-polsce-w-liczbach": {
    title: "Poultry market in Poland in figures",
    preview: "Key figures describing the scale and importance of Poland's poultry market.",
  },
  raporty: {
    title: "Reports",
    preview: "Reports on poultry meat imports, exports and production in 2010-2025.",
  },
  "handel-zagraniczny": {
    title: "Foreign trade",
    preview: "KRD-IG supports the development of Polish poultry exports and the opening of new markets.",
  },
  "unia-europejska": {
    title: "European Union",
    preview: "The European Union remains the most important destination for Polish poultry exports.",
  },
  "kraje-trzecie": {
    title: "Third countries",
    preview: "Global poultry production and the main export directions for Polish poultry outside the EU.",
  },
  "eksport-import-z-unii-europejskiej": {
    title: "Exports / imports from the European Union",
    preview: "Lists of establishments authorised to place products of animal origin on the EU and domestic markets.",
  },
  "przedstawicielstwo-w-chinach": {
    title: "Representation in China",
    preview: "The Polish poultry sector representation in Shanghai, opened on 23 September 2016.",
    href: "/en/market/representation-in-china",
  },
  "globalizacja-rynku": {
    title: "Market globalisation",
    preview: "Poland is the largest poultry producer in the EU and one of its leading exporters.",
  },
  "bezpieczenstwo-bialkowe": {
    title: "Protein security",
    preview: "Protein security is a key issue for Polish poultry farming and feed independence.",
  },
  "promocja-drobiu": {
    title: "Poultry promotion",
    preview: "The strategy for promoting the poultry meat industry in Poland.",
  },
  "jakosc-i-bezpieczenstwo": {
    title: "Quality and safety",
    preview: "Information on quality, food safety and responsible production in the poultry sector.",
  },
  "system-qafp": {
    title: "QAFP system",
    preview: "The national quality assurance system for food, from production to the consumer.",
  },
  "bezpieczna-produkcja": {
    title: "Safe production",
    preview: "Principles and practices supporting safe, transparent poultry production at every stage.",
  },
  "zdrowy-drob": {
    title: "Healthy poultry",
    preview: "Animal health and prevention as the foundation of safe and efficient poultry production.",
  },
  segmentacja: {
    title: "Product segmentation",
    preview: "A quality-based approach to distinguishing poultry products and production standards.",
  },
  "dobrostan-zwierzat": {
    title: "Animal welfare",
    preview: "Standards and practices supporting the health and welfare of poultry throughout production.",
  },
  "poszanowanie-srodowiska": {
    title: "Environmental responsibility",
    preview: "Actions supporting resource efficiency and environmental protection in poultry production.",
  },
};

function sentenceFromText(value: string) {
  const sentenceMatch = value.match(/[^.!?]+[.!?]/);
  return sentenceMatch?.[0]?.trim() ?? value;
}

function normalizeReadableText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/([a-ząćęłńóśźż0-9])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([.!?])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{2,})([a-ząćęłńóśźż]{2,})/g, "$1 $2")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const safeSlice = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;

  return `${safeSlice.trim()}…`;
}

function directoryPreview(
  paragraphs: string[],
  excerpt: string,
  sentenceOnly: boolean,
  maxLength: number,
) {
  const firstParagraph = paragraphs.find((paragraph) => paragraph.trim().length >= 40);
  const fallbackParagraph = paragraphs.find((paragraph) => paragraph.trim().length > 0);
  const source = firstParagraph ?? fallbackParagraph ?? excerpt;
  const normalized = normalizeReadableText(source);
  const maybeSentence = sentenceOnly ? sentenceFromText(normalized) : normalized;

  return truncateText(maybeSentence, maxLength);
}

export function HubPage({
  eyebrow,
  title,
  lead,
  image,
  imageAlt,
  slugs,
  facts = [],
  hidePreviewForSlugs = [],
  previewSentenceOnly = false,
  previewMaxLength = 260,
  language = "pl",
}: HubPageProps) {
  const pages = pagesFor(slugs);
  const hiddenPreviewSlugs = new Set(hidePreviewForSlugs);

  return (
    <PageShell language={language}>
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="subpage-lead">{lead}</p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath(image)} alt={imageAlt} />
          </div>
        </div>
      </section>

      {facts.length > 0 && (
        <section className="fact-band" aria-label={language === "en" ? "Key facts" : "Najważniejsze dane"}>
          <div className="shell fact-band-grid">
            {facts.map((fact) => (
              <div key={fact.label}>
                <strong>{fact.value}</strong>
                <p>{fact.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">{language === "en" ? "Full information" : "Pełna informacja"}</p>
            <h2>{language === "en" ? "Everything in one organised place" : "Wszystko w jednym, uporządkowanym miejscu"}</h2>
            <p>
              {language === "en"
                ? "Each topic appears in the catalogue only once. Details, documents and source materials are available inside the selected section."
                : "Każdy temat występuje w katalogu tylko raz. Szczegóły, dokumenty i materiały źródłowe są dostępne po wejściu w wybraną sekcję."}
            </p>
          </div>
          <div className="directory-grid">
            {pages.map((page, index) => (
              <a
                className="directory-card"
                href={withBasePath(
                  language === "en"
                    ? englishDirectoryContent[page.slug]?.href ?? `/tresc/${page.slug}`
                    : `/tresc/${page.slug}`,
                )}
                key={page.slug}
              >
                <span className="card-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{language === "en" ? englishDirectoryContent[page.slug]?.title ?? page.title : page.title}</h3>
                {!hiddenPreviewSlugs.has(page.slug) && (
                  <p>
                    {language === "en"
                      ? englishDirectoryContent[page.slug]?.preview ?? page.excerpt
                      : directoryPreview(
                          page.paragraphs,
                          page.excerpt,
                          previewSentenceOnly,
                          previewMaxLength,
                        )}
                  </p>
                )}
                <span className="directory-card-arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
