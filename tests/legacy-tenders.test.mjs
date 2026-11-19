import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";
import { unzipSync } from "fflate";
import { articleBody, categoryForTitle, extractArticle, textDigest } from "../scripts/import-legacy-tenders.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("docs/imports/legacy-tenders-pages-8-10.json", root), "utf8"));
const repairs = JSON.parse(await readFile(new URL("app/data/tender-attachment-repairs.json", root), "utf8"));
const { outputFiles } = await build({
  stdin: { contents: 'export { newsPosts, tenderPosts } from "./app/lib/content.ts"; export { renderInlineMarkdown } from "./app/lib/inlineMarkdown.tsx"; export { restoreTenderAttachments } from "./app/lib/tender-attachments.ts";', resolveDir: fileURLToPath(root), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
});
const { newsPosts, tenderPosts, renderInlineMarkdown, restoreTenderAttachments } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

test("the three requested archive pages contain exactly the expected 27 publications", () => {
  assert.deepEqual(manifest.records.map(({ id }) => id), [1817, 1819, 1842, 1846, 1857, 1860, 1864, 1681, 1871, 1677, 1633, 1631, 1629, 1627, 1623, 1620, 1604, 1601, 1597, 1573, 1569, 1550, 1564, 1408, 1396, 1382, 755]);
  assert.deepEqual([8, 9, 10].map((page) => manifest.records.filter((record) => record.page === page).length), [10, 10, 7]);
  assert.equal(manifest.records.filter((record) => record.replaces.length).length, 27);
  for (const record of manifest.records) {
    const matches = newsPosts.filter((post) => post.slug === record.slug);
    assert.equal(matches.length, 1, record.slug);
    assert.equal(matches[0].date, record.date);
    assert.deepEqual(matches[0].categories, [record.category]);
    assert.equal(matches[0].source, record.source);
    assert.ok(tenderPosts().some((post) => post.slug === record.slug));
  }
});

test("rendered paragraphs retain all source text, including long bilingual invitations", () => {
  for (const record of manifest.records) {
    const post = newsPosts.find((post) => post.slug === record.slug);
    const html = post.paragraphs.map((paragraph, index) => renderToStaticMarkup(renderInlineMarkdown(paragraph, String(index)))).join("");
    const text = load(html).text();
    assert.equal(textDigest(text), record.sourceTextSha256, `Source text changed: ${record.id}`);
    assert.doesNotMatch(html, /plik niedostępny w archiwum źródłowym/);
    assert.equal(post.justify, true);
    assert.ok(post.paragraphs.every((paragraph) => !paragraph.includes("****")));
    assert.doesNotMatch(html, /href="https?:\/\/[^" ]+\/(?:upload\/file|wp-content\/uploads)\//);
    const $ = load(html);
    const expected = new Set(record.attachments.filter(asset => asset.status === "available").map(asset => asset.local));
    for (const href of $('a[href^="/media/tenders/"]').map((_, a) => $(a).attr("href")).get()) {
      assert.ok(expected.has(href), `${record.id}: unexpected download ${href}`);
    }
    for (const href of expected) assert.ok($(`a[href="${href}"]`).length > 0, `${record.id}: missing download ${href}`);
  }
});

test("categories and same-day ordering follow the original publications", () => {
  const counts = {};
  for (const record of manifest.records) counts[record.category] = (counts[record.category] ?? 0) + 1;
  assert.deepEqual(counts, { "Wybór wykonawcy": 13, "Wyniki postępowania": 1, "Zapytania ofertowe": 8, "Informacja o unieważnieniu": 1, "Zaproszenie do składania ofert": 4 });
  const slugs = new Set(manifest.records.map((record) => record.slug));
  const sorted = tenderPosts().filter((post) => slugs.has(post.slug)).sort((left, right) => right.date.localeCompare(left.date));
  assert.deepEqual(sorted.map(({ slug }) => slug), manifest.records.map(({ slug }) => slug));
  const newer = newsPosts.find((post) => post.slug === "zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-2");
  assert.ok(newer.date.startsWith("2020-04-17"));
  const sial = manifest.records.find((record) => record.id === 1569);
  assert.equal(sial.replaces[0].id, 7975);
  assert.ok(newsPosts.find((post) => post.slug === sial.slug).date.startsWith("2018-03-09"));
  const trip = manifest.records.find((record) => record.id === 1601);
  assert.equal(trip.replaces[0].id, 7984);
  assert.ok(newsPosts.find((post) => post.slug === trip.slug).date.startsWith("2018-06-06"));
});

test("tender card images hosted on this site exist in deployable public assets", async () => {
  const images = new Set(tenderPosts().map(post => post.image).filter(Boolean));
  for (const source of images) {
    const url = new URL(source, "https://krd-ig.com.pl");
    if (!/^(?:www\.)?krd-ig\.com\.pl$/.test(url.hostname)) continue;
    const bytes = await readFile(new URL(`public${url.pathname}`, root));
    const signature = bytes.subarray(0, 8).toString("hex");
    assert.ok(
      signature.startsWith("ffd8ff") ||
      signature === "89504e470d0a1a0a" ||
      (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"),
      `Invalid card image: ${source}`,
    );
  }
});

test("available attachments are verified local PDFs; missing files have explicit status", async () => {
  const attachments = manifest.records.flatMap((record) => record.attachments);
  assert.equal(attachments.length, 45);
  assert.equal(attachments.filter((asset) => asset.status === "available").length, 21);
  assert.equal(attachments.filter((asset) => asset.status === "unavailable").length, 24);
  for (const asset of attachments) {
    if (asset.status === "unavailable") {
      assert.equal(asset.local, undefined);
      assert.ok(asset.failures.length > 0);
      continue;
    }
    const bytes = await readFile(new URL(`public${asset.local}`, root));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
});

test("restored tender downloads are original, deployable documents rather than HTML error pages", async () => {
  const verified = new Set();
  for (const [source, asset] of Object.entries(repairs.assets)) {
    assert.match(asset.href, /^\/media\/tenders\/restored\/[a-f0-9]{24}\.(?:pdf|docx?|xlsx?)$/);
    if (verified.has(asset.href)) continue;
    const bytes = await readFile(new URL(`public${asset.href}`, root));
    assert.equal(bytes.length, asset.size, source);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, source);
    if (asset.href.endsWith(".pdf")) {
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", source);
      assert.ok(bytes.subarray(-4096).includes(Buffer.from("%%EOF")), `Truncated PDF: ${source}`);
    } else if (/\.(?:docx|xlsx)$/.test(asset.href)) {
      const entries = unzipSync(bytes);
      assert.ok(entries["[Content_Types].xml"], source);
      assert.ok(entries[asset.href.endsWith(".docx") ? "word/document.xml" : "xl/workbook.xml"], source);
    } else {
      assert.equal(bytes.subarray(0, 8).toString("hex"), "d0cf11e0a1b11ae1", source);
    }
    verified.add(asset.href);
  }
});

test("repeated download labels link to the right files without changing the existing tender text or order", async () => {
  const raw = JSON.parse(await readFile(new URL("app/data/content.json", root), "utf8")).posts;
  for (const [slug, source] of Object.entries(repairs.posts)) {
    const post = newsPosts.find(post => post.slug === slug);
    const original = raw.find(post => post.id === source.id && post.slug === slug);
    assert.ok(original, slug);
    const render = paragraphs => load(paragraphs.map((text, index) => renderToStaticMarkup(renderInlineMarkdown(text, String(index)))).join(""));
    const $ = render(post.paragraphs);
    const existing = source.appendedParagraphCount ? post.paragraphs.slice(0, -source.appendedParagraphCount) : post.paragraphs;
    assert.equal(textDigest(render(existing).text()), textDigest(original.paragraphs.join(" ")), slug);
    for (const link of post.links.filter(link => link.document)) {
      assert.ok($(`a[href="${link.href}"]`).length > 0, `${slug}: ${link.href}`);
    }
  }
});

test("attachment repairs leave CMS copy untouched and keep mismatched record paragraphs", () => {
  const [slug, source] = Object.entries(repairs.posts)[0];
  const original = newsPosts.find(post => post.slug === slug);
  const managed = { ...original, managed: true };
  assert.equal(restoreTenderAttachments(managed), managed);
  const mismatched = { ...original, id: source.id + 1, paragraphs: ["Other publication."] };
  assert.deepEqual(restoreTenderAttachments(mismatched).paragraphs, mismatched.paragraphs);
});

test("HTML extraction preserves paragraphs, formatting, email links and table text", () => {
  const post = { title: { rendered: "WYBÓR &amp; oferta" }, link: "https://old.krd-ig.com.pl/example/", content: { rendered: '<p>Pełna <strong>treść</strong> <a href="mailto:test@example.org">kontakt</a>.</p><table><tr><td>Opcja</td><td>100 EUR</td></tr></table><p><a href="/file.pdf">pobierz.pdf</a></p>' } };
  const article = extractArticle(post);
  assert.equal(article.title, "WYBÓR & oferta");
  const body = articleBody(article.html, post.link, new Map([["https://old.krd-ig.com.pl/file.pdf", null]]));
  assert.match(body, /\*\*treść\*\*/);
  assert.match(body, /\[kontakt\]\(mailto:test@example.org\)/);
  assert.match(body, /Opcja \| 100 EUR/);
  assert.doesNotMatch(body, /plik niedostępny w archiwum źródłowym/);
  assert.match(body, /pobierz\.pdf/);
  assert.doesNotMatch(body, /\]\(https:\/\/old\.krd-ig\.com\.pl\/file\.pdf\)/);
  assert.equal(categoryForTitle("UNIEWAŻNIENIE ZAPYTANIA OFERTOWEGO"), "Informacja o unieważnieniu");
  assert.equal(categoryForTitle("WYBÓR Organizacji Wdrażającej"), "Wybór wykonawcy");
  assert.throws(() => categoryForTitle("Inny tytuł"), /Unknown tender category/);
});

test("import formatting flattens nested and adjacent bold without changing words", () => {
  const html = "<p><strong><b>Termin</b></strong><strong> składania ofert</strong></p><p><em><i>Warunki</i></em></p>";
  const body = articleBody(html, "https://old.krd-ig.com.pl/");
  assert.equal(body, "**Termin** **składania ofert**\n\n*Warunki*");
});