import { pagesFor } from "../lib/content";
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
}: HubPageProps) {
  const pages = pagesFor(slugs);
  const hiddenPreviewSlugs = new Set(hidePreviewForSlugs);

  return (
    <PageShell>
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="subpage-lead">{lead}</p>
          </div>
          <div className="subpage-image">
            <img src={image} alt={imageAlt} />
          </div>
        </div>
      </section>

      {facts.length > 0 && (
        <section className="fact-band" aria-label="Najważniejsze dane">
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
            <p className="eyebrow">Pełna informacja</p>
            <h2>Wszystko w jednym, uporządkowanym miejscu</h2>
            <p>
              Każdy temat występuje w katalogu tylko raz. Szczegóły, dokumenty
              i materiały źródłowe są dostępne po wejściu w wybraną sekcję.
            </p>
          </div>
          <div className="directory-grid">
            {pages.map((page, index) => (
              <article className="directory-card" key={page.slug}>
                <span className="card-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{page.title}</h3>
                {!hiddenPreviewSlugs.has(page.slug) && (
                  <p>
                    {directoryPreview(
                      page.paragraphs,
                      page.excerpt,
                      previewSentenceOnly,
                      previewMaxLength,
                    )}
                  </p>
                )}
                <a href={`/tresc/${page.slug}`}>
                  Przejdź do informacji <Arrow />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
