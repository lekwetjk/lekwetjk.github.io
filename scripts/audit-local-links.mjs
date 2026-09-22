import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(resolve(root, "app/data/content.json"), "utf8"));
const withdrawn = new Set(["akty-prawne", "nadzwyczajne-srodki-zwalczania-chorob"]);
const entries = [...data.pages.filter((entry) => !withdrawn.has(entry.slug)), ...data.posts];
const hosts = new Set(["krd-ig.com.pl", "www.krd-ig.com.pl"]);
const normalize = (href) => {
  const url = new URL(href, "https://krd-ig.com.pl");
  url.hash = "";
  url.protocol = "https:";
  url.hostname = "krd-ig.com.pl";
  return url.href;
};
const known = new Map(entries.map((entry) => [new URL(entry.source).pathname.replace(/\/$/, ""), entry]));
const links = new Map();
for (const entry of entries) {
  for (const link of entry.links) {
    let url;
    try { url = new URL(link.href, "https://krd-ig.com.pl"); } catch { continue; }
    if (!hosts.has(url.hostname) || !["https:", "http:"].includes(url.protocol)) continue;
    const key = normalize(url.href);
    if (!links.has(key)) links.set(key, { source: key, labels: [], usedBy: [] });
    const record = links.get(key);
    if (!record.labels.includes(link.label)) record.labels.push(link.label);
    if (!record.usedBy.includes(entry.slug)) record.usedBy.push(entry.slug);
  }
}

async function fetchJson(path) {
  const response = await fetch(`https://krd-ig.com.pl/wp-json/wp/v2/${path}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function inspect(record) {
  const url = new URL(record.source);
  const path = url.pathname.replace(/\/$/, "");
  const entry = known.get(path);
  if (entry) return { ...record, kind: "known", slug: entry.slug };
  if (/\.[a-z0-9]{2,5}$/i.test(path) || path.startsWith("/wp-content/")) return { ...record, kind: "file", file: record.source };
  if (["/akty-prawne", "/srodki-zwalczania", "/nadzwyczajne-srodki-zwalczania-chorob"].includes(path)) return { ...record, kind: "withdrawn" };
  if (path.startsWith("/wp-json/")) return { ...record, kind: "import-artifact" };
  const slug = path.split("/").filter(Boolean).pop();
  const sameSlug = entries.filter((candidate) => candidate.slug === slug);
  if (sameSlug.length === 1) return { ...record, kind: "alias", slug };
  if (["", "/en", "/wydarzenia"].includes(path)) return { ...record, kind: "route", target: path === "/wydarzenia" ? "/aktualnosci" : path || "/" };
  try {
    const media = await fetchJson(`media?slug=${encodeURIComponent(slug)}&_fields=id,slug,link,source_url,mime_type`);
    if (media.length === 1 && media[0].source_url) return { ...record, kind: "attachment", file: media[0].source_url, mime: media[0].mime_type };
    for (const type of ["posts", "pages"]) {
      const matches = await fetchJson(`${type}?slug=${encodeURIComponent(slug)}&_fields=id,slug,link,title,date,content`);
      if (matches.length === 1) return { ...record, kind: "missing-content", sourceType: type, remote: matches[0] };
    }
    return { ...record, kind: "unresolved" };
  } catch (error) { return { ...record, kind: "unresolved", error: error.message }; }
}

const pending = [...links.values()];
const results = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (pending.length) {
    const record = pending.shift();
    results.push(await inspect(record));
  }
}));
results.sort((left, right) => left.source.localeCompare(right.source));
const counts = results.reduce((counts, record) => ({ ...counts, [record.kind]: (counts[record.kind] ?? 0) + 1 }), {});
const report = { generatedAt: new Date().toISOString(), scope: "Source-export links; runtime-rendered links require separate verification before acceptance.", counts, results };
await mkdir(resolve(root, "docs/link-audit"), { recursive: true });
await writeFile(resolve(root, "docs/link-audit/source-links.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));
for (const record of results.filter((record) => ["unresolved", "missing-content"].includes(record.kind))) console.log(JSON.stringify({ source: record.source, kind: record.kind, title: record.remote?.title, usedBy: record.usedBy, error: record.error }));