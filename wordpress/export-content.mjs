import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const sourcePath = resolve(projectRoot, "app/data/content.json");
const outputPath = resolve(scriptDirectory, "export/content-export.json");

const source = JSON.parse(await readFile(sourcePath, "utf8"));

function normalizeLink(link) {
  const href = String(link?.href ?? "").trim();
  return {
    href,
    label: String(link?.label ?? "").trim(),
    document: Boolean(link?.document),
  };
}

function paragraphsToHtml(paragraphs) {
  return paragraphs
    .map((paragraph) => String(paragraph ?? "").trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("\n");
}

const pages = (source.pages ?? []).map((page) => ({
  postType: "baza_wiedzy",
  sourceId: page.id,
  slug: page.slug,
  title: page.title,
  excerpt: page.excerpt ?? "",
  contentHtml: paragraphsToHtml(page.paragraphs),
  links: (page.links ?? []).map(normalizeLink),
  section: page.section ?? "",
  sourceUrl: page.source ?? "",
  images: page.images ?? [],
}));

const posts = (source.posts ?? []).map((post) => ({
  postType: (post.categories ?? []).includes("Zapytania ofertowe")
    ? "zapytanie_ofertowe"
    : "aktualnosc",
  sourceId: post.id,
  slug: post.slug,
  title: post.title,
  date: post.date,
  year: post.year,
  excerpt: post.excerpt ?? "",
  contentHtml: paragraphsToHtml(post.paragraphs),
  links: (post.links ?? []).map(normalizeLink),
  categories: post.categories ?? [],
  sourceUrl: post.source ?? "",
  image: post.image ?? null,
}));

const slugs = [...pages, ...posts].map((item) => item.slug);
const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

if (duplicateSlugs.length > 0) {
  throw new Error(`Duplicate slugs found: ${[...new Set(duplicateSlugs)].join(", ")}`);
}

const exportData = {
  format: "krd-ig-wordpress-v1",
  generatedAt: new Date().toISOString(),
  source: source.source ?? "",
  logo: source.logo ?? "",
  categories: source.categories ?? [],
  pages,
  posts,
  stats: {
    pages: pages.length,
    knowledgeBase: pages.length,
    posts: posts.length,
    news: posts.filter((post) => post.postType === "aktualnosc").length,
    tenders: posts.filter((post) => post.postType === "zapytanie_ofertowe").length,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, "utf8");
console.log(`Created ${outputPath}`);
console.log(JSON.stringify(exportData.stats));