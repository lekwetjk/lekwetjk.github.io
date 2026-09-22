import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(resolve(tmpdir(), "krd-link-audit-tools/package.json"));
const { parseHTML } = require("linkedom");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.LINK_AUDIT_URL ?? "http://127.0.0.1:3000";
const sitemapResponse = await fetch(`${base}/sitemap.xml`);
if (!sitemapResponse.ok) throw new Error(`Sitemap: ${sitemapResponse.status}`);
const { document: sitemap } = parseHTML(await sitemapResponse.text());
const data = JSON.parse(await readFile(resolve(root, "app/data/content.json"), "utf8"));
const generated = JSON.parse(await readFile(resolve(root, "app/data/generated-posts.json"), "utf8"));
const generatedPosts = Array.isArray(generated) ? generated : generated.posts ?? [];
const queue = [...new Set([
  ...[...sitemap.querySelectorAll("loc")].map((entry) => new URL(entry.textContent).pathname.replace(/\/$/, "") || "/"),
  ...data.pages.filter((entry) => !["akty-prawne", "nadzwyczajne-srodki-zwalczania-chorob"].includes(entry.slug)).map((entry) => `/tresc/${entry.slug}`),
  ...[...data.posts, ...generatedPosts].map((entry) => `/aktualnosci/${entry.slug}`),
])];
const results = new Map();
const pages = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const path = queue.shift();
    try {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(60000) });
      const { document } = parseHTML(await response.text());
      pages.push({ path, status: response.status });
      for (const anchor of document.querySelectorAll("a[href]")) {
        const href = anchor.getAttribute("href");
        let url;
        try { url = new URL(href, response.url); } catch { continue; }
        const sourceHost = ["krd-ig.com.pl", "www.krd-ig.com.pl"].includes(url.hostname);
        const brokenUpload = url.origin === base && url.pathname.startsWith("/wp-content/");
        if (!sourceHost && !brokenUpload) continue;
        if (!["https:", "http:"].includes(url.protocol)) continue;
        url.protocol = "https:";
        url.hostname = "krd-ig.com.pl";
        url.port = "";
        url.hash = "";
        if (!results.has(url.href)) results.set(url.href, { source: url.href, usedBy: [], labels: [] });
        const record = results.get(url.href);
        if (!record.usedBy.includes(path)) record.usedBy.push(path);
        const label = anchor.textContent.trim();
        if (!record.labels.includes(label)) record.labels.push(label);
      }
    } catch (error) { pages.push({ path, error: error.message }); }
  }
}));
const sourceReport = JSON.parse(await readFile(resolve(root, "docs/link-audit/source-links.json"), "utf8"));
const records = [...results.values()].map((record) => {
  const source = sourceReport.results.find((entry) => entry.source === record.source);
  return { ...source, ...record, kind: source?.kind ?? "not-in-source-audit" };
}).sort((left, right) => left.source.localeCompare(right.source));
const report = { generatedAt: new Date().toISOString(), base, pageCount: pages.length, pages, counts: records.reduce((counts, record) => ({ ...counts, [record.kind]: (counts[record.kind] ?? 0) + 1 }), {}), results: records };
await writeFile(resolve(root, "docs/link-audit/rendered-links.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ pageCount: report.pageCount, failedPages: pages.filter((page) => page.status !== 200), counts: report.counts }, null, 2));
for (const record of records.filter((entry) => ["not-in-source-audit", "unresolved", "withdrawn"].includes(entry.kind))) console.log(JSON.stringify(record));