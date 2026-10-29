import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const origin = "https://old.krd-ig.com.pl";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(os.tmpdir(), "krd-ig-legacy-tenders");
const reportFile = path.join(root, "docs/imports/legacy-tenders-pages-8-10.json");
const expectedIds = [1817, 1819, 1842, 1846, 1857, 1860, 1864, 1681, 1871, 1677, 1633, 1631, 1629, 1627, 1623, 1620, 1604, 1601, 1597, 1573, 1569, 1550, 1564, 1408, 1396, 1382, 755];

function clean(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

export function textDigest(value) {
  return createHash("sha256").update(value.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "")).digest("hex");
}

export function categoryForTitle(title) {
  if (/uniewa/i.test(title)) return "Informacja o unieważnieniu";
  if (/^wyniki/i.test(title)) return "Wyniki postępowania";
  if (/^wyb[oó]r/i.test(title)) return "Wybór wykonawcy";
  if (/^zaproszenie/i.test(title)) return "Zaproszenie do składania ofert";
  if (/^zapytanie/i.test(title)) return "Zapytania ofertowe";
  throw new Error(`Unknown tender category: ${title}`);
}

export function extractArticle(post) {
  const $ = load(post.content.rendered);
  $("script, style, iframe").remove();
  const title = clean(load(post.title.rendered).text());
  const links = [];
  $("a[href]").each((_index, element) => {
    const href = new URL($(element).attr("href"), post.link).href;
    if (!/^https?:/.test(href)) return;
    const text = clean($(element).text());
    const context = clean($(element).closest("p, li").text());
    const fileLabel = decodeURIComponent(new URL(href).pathname.split("/").pop()).replaceAll("_", " ");
    const label = context && /^(?:[—–>\s-]*pobierz|kliknij|download|pdf\b)/i.test(text)
      ? context.replace(/\s*[—–>-]*\s*(?:kliknij, aby pobrać|pobierz(?:\.[a-z]+)?|download(?:\.[a-z]+)?)\s*$/i, "").trim() || fileLabel
      : text || fileLabel;
    if (!links.some((item) => item.href === href)) links.push({ href, label });
  });
  const images = $("img[src]").toArray().map((element) => new URL($(element).attr("src"), post.link).href);
  return { title, html: $.html(), links, images, text: clean($.text()) };
}

export function articleBody(html, source, replacements = new Map()) {
  const $ = load(html);
  const render = (node) => {
    if (node.type === "text") return node.data;
    if (node.type !== "tag") return "";
    const content = (node.children ?? []).map(render).join("");
    if (node.name === "img") return "";
    if (node.name === "a") {
      const href = $(node).attr("href");
      if (!href) return content;
      const absolute = new URL(href, source).href;
      if (replacements.get(absolute) === null) return clean(content);
      return content.trim() ? `[${clean(content)}](${replacements.get(absolute) ?? absolute})` : "";
    }
    if (["strong", "b"].includes(node.name)) return $(node).parents("strong, b").length ? content : content.replace(/\S(?:[\s\S]*\S)?/, (text) => `**${clean(text)}**`);
    if (["em", "i"].includes(node.name)) return $(node).parents("em, i").length ? content : content.replace(/\S(?:[\s\S]*\S)?/, (text) => `*${clean(text)}*`);
    if (node.name === "br") return "\n\n";
    if (["td", "th"].includes(node.name)) return `${clean(content)} | `;
    if (["p", "div", "section", "li", "tr", "h1", "h2", "h3", "h4", "blockquote"].includes(node.name)) return `\n\n${content}\n\n`;
    return content;
  };
  return $("body").contents().toArray().map(render).join("")
    .replace(/\*{4}/g, "").split(/\n\s*\n/).map(clean).filter(Boolean).join("\n\n");
}

async function getJson(url) {
  const key = createHash("sha256").update(url).digest("hex");
  const cached = path.join(cache, `${key}.json`);
  try { return JSON.parse(await readFile(cached, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const json = await response.json();
  await mkdir(cache, { recursive: true });
  await writeFile(cached, JSON.stringify(json), "utf8");
  return json;
}

function isAsset(href) {
  return /\/wp-content\/uploads\/|\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|jpe?g|png)(?:[?#]|$)/i.test(href);
}

async function downloadAsset(href, alternatives, localAssets) {
  const url = new URL(href);
  const candidates = [...new Set([`${origin}${url.pathname}${url.search}`, `https://krd-ig.com.pl${url.pathname}${url.search}`, ...alternatives])];
  const digest = createHash("sha256").update(href).digest("hex").slice(0, 12);
  const basename = decodeURIComponent(url.pathname.split("/").pop()).normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-130) || "attachment";
  const local = `/media/tenders/legacy/${digest}-${basename}`;
  const target = path.join(root, "public", local);
  const failures = [];
  for (const candidate of candidates) {
    try {
      const saved = localAssets[candidate];
      const savedPath = saved?.target ?? local;
      let bytes;
      try { bytes = await readFile(path.join(root, "public", savedPath)); } catch (error) {
        if (error.code !== "ENOENT") throw error;
        const response = await fetch(candidate, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (response.headers.get("content-type")?.includes("text/html")) throw new Error("HTML instead of attachment");
        bytes = Buffer.from(await response.arrayBuffer());
      }
      assert.ok(bytes.length > 0 && bytes.length <= 25 * 1024 * 1024, `Invalid attachment size: ${candidate}`);
      if (/\.pdf$/i.test(url.pathname)) assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", `Invalid PDF: ${candidate}`);
      if (!saved) {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
      }
      return { source: href, downloadedFrom: candidate, local: savedPath, status: "available", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    } catch (error) { failures.push({ url: candidate, error: error.message }); }
  }
  return { source: href, status: "unavailable", failures };
}

async function main() {
  const write = process.argv.includes("--write");
  const categories = await getJson(`${origin}/wp-json/wp/v2/categories?slug=zapytania-ofertowe`);
  assert.equal(categories.length, 1);
  const pages = await Promise.all([8, 9, 10].map(async (page) => ({
    page, posts: await getJson(`${origin}/wp-json/wp/v2/posts?categories=${categories[0].id}&per_page=10&page=${page}&orderby=date&order=desc`),
  })));
  assert.deepEqual(pages.map(({ posts }) => posts.length), [10, 10, 7]);
  assert.deepEqual(pages.flatMap(({ posts }) => posts.map(({ id }) => id)), expectedIds, "Archive pagination changed; review the requested scope before importing.");
  if (write) {
    for (const { page, posts } of pages) {
      const archive = `${origin}/category/zapytania-ofertowe/page/${page}/`;
      const response = await fetch(archive, { signal: AbortSignal.timeout(60000) });
      assert.ok(response.ok, `Unavailable archive page: ${archive}`);
      const $ = load(await response.text());
      const paths = new Set($("a[href]").toArray().map((node) => new URL($(node).attr("href"), archive).pathname));
      for (const post of posts) assert.ok(paths.has(new URL(post.link).pathname), `Post ${post.id} is missing from archive page ${page}`);
    }
  }
  const existing = JSON.parse(await readFile(path.join(root, "app/data/content.json"), "utf8")).posts;
  const localAssets = JSON.parse(await readFile(path.join(root, "app/data/local-link-assets.json"), "utf8"));
  const normalizedTitle = (title) => clean(load(title).text()).toLocaleLowerCase("pl").replace(/[^\p{L}\p{N}]/gu, "");
  const filename = (href) => decodeURIComponent(new URL(href, "https://krd-ig.com.pl").pathname.split("/").pop()).replace(/-\d+(?=\.[^.]+$)/, "");
  const records = [];
  for (const { page, posts } of pages) {
    for (const post of posts) {
      const article = extractArticle(post);
      const exactMatches = existing.filter((item) => item.slug === post.slug);
      const datedMatches = existing.filter((item) => {
        if (item.date.slice(0, 10) !== post.date.slice(0, 10)) return false;
        return normalizedTitle(item.title) === normalizedTitle(article.title);
      });
      const titleMatches = existing.filter((item) => normalizedTitle(item.title) === normalizedTitle(article.title));
      const duplicates = datedMatches.length ? datedMatches : exactMatches.length ? exactMatches : titleMatches.length === 1 ? titleMatches : [];
      assert.ok(duplicates.length <= 1, `Ambiguous existing publication: ${post.id}`);
      const category = categoryForTitle(article.title);
      const assets = article.links.filter(({ href }) => isAsset(href));
      for (const href of article.images) if (!assets.some((item) => item.href === href)) assets.push({ href, label: decodeURIComponent(new URL(href).pathname.split("/").pop()) });
      const attachments = [];
      const replacements = new Map();
      for (const asset of assets) {
        const alternatives = (duplicates[0]?.links ?? []).filter(({ href }) => isAsset(href)).filter(({ href }) => filename(href) === filename(asset.href)).map(({ href }) => new URL(href, "https://krd-ig.com.pl").href);
        const downloaded = write ? await downloadAsset(asset.href, alternatives, localAssets) : { source: asset.href };
        attachments.push({ ...downloaded, label: asset.label });
        if (downloaded.local) replacements.set(asset.href, downloaded.local);
        else if (write) replacements.set(asset.href, null);
      }
      const slug = duplicates[0]?.slug ?? post.slug;
      const body = articleBody(article.html, post.link, replacements);
      assert.ok(body.length > 30, `Empty article: ${post.id}`);
      const record = { page, id: post.id, slug, title: article.title, date: post.date, category, source: post.link, sourceTextSha256: textDigest(article.text), replaces: duplicates.map(({ id, slug, date }) => ({ id, slug, date })), attachments, characters: article.text.length };
      records.push(record);
      if (write) {
        const image = article.images.length ? replacements.get(article.images[0]) : undefined;
        const excerpt = article.text.length > 260 ? `${article.text.slice(0, 261).replace(/\s+\S*$/, "")}…` : article.text;
        const fields = ["---", `title: ${article.title}`, `slug: ${slug}`, `date: ${post.date.slice(0, 10)}`, `time: ${post.date.slice(11)}`, `categories: ${category}`, `excerpt: ${excerpt}`, `source: ${post.link}`, "justify: true"];
        if (image) fields.push(`image: ${image}`);
        const available = attachments.filter((asset) => asset.status === "available");
        if (available.length) {
          fields.push("links:");
          for (const asset of available) fields.push(`  - label: ${asset.label}`, `    href: ${asset.local}`);
        }
        fields.push("---", "", body, "");
        await writeFile(path.join(root, "content/zapytania-ofertowe", `${post.date.slice(0, 10)}-${post.id}.md`), fields.join("\n"), "utf8");
      }
    }
  }
  if (write) {
    await mkdir(path.dirname(reportFile), { recursive: true });
    await writeFile(reportFile, `${JSON.stringify({ archivePages: pages.map(({ page }) => `${origin}/category/zapytania-ofertowe/page/${page}/`), records }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ mode: write ? "write" : "inspect", total: records.length, attachmentReferences: records.reduce((sum, record) => sum + record.attachments.length, 0), unavailableAttachments: records.flatMap((record) => record.attachments).filter((asset) => asset.status === "unavailable").length, ...(write ? { report: reportFile } : { records }) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();