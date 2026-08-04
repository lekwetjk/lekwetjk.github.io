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
  return value
    .replace(/\s+/g, " ")
    .replace(/([a-ząćęłńóśźż0-9])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([.!?])([A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1 $2")
    .replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{2,})([a-ząćęłńóśźż]{2,})/g, "$1 $2")
    .trim();
}

export const knowledgePages = content.pages.map((page) => ({
  ...page,
  excerpt: normalizePreviewText(page.excerpt),
}));

export const newsPosts = content.posts.map((post) => ({
  ...post,
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
