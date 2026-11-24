import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { load } from "cheerio";

const stubs = {
  "next/server": "export async function connection() {}",
  "../lib/local-proposals-server": 'export async function getLocalProposals() { return { "text-cleanup": true }; }',
  "../lib/content": "export const knowledgePages = []; export const newsPosts = [];",
  "../lib/managed-posts": "export async function applyManagedPostOverrides(posts) { return posts; }",
};
for (const name of [
  "Arrow", "MembershipSignupForm", "ExternalFavicon", "CommissionTicker",
  "TerritorialCoverageMap", "WstawieniaTable", "MethodologyDocuments",
]) {
  stubs[`./${name === "Arrow" ? "SiteChrome" : name}`] = `export const ${name} = () => null;`;
}

const bundled = await build({
  stdin: {
    contents: `
      import { renderToStaticMarkup } from "react-dom/server";
      import { ArticleBody } from "./app/components/ArticleBody";
      import { CampaignWebsiteTicker } from "./app/components/CampaignWebsiteTicker";
      import { correctCampaignPost } from "./app/lib/campaign-posts";
      import { newsPosts } from "./app/lib/content";
      import content from "./app/data/content.json";
      import { createElement } from "react";
      export async function article(props) {
        return renderToStaticMarkup(await ArticleBody(props));
      }
      export function ticker() {
        return renderToStaticMarkup(createElement(CampaignWebsiteTicker));
      }
      export async function campaign(id) {
        const post = correctCampaignPost(content.posts.find(post => post.id === id));
        return article(post);
      }
      export async function tender(id) {
        return article(newsPosts.find(post => post.id === id));
      }
    `,
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  write: false,
  outfile: "campaign-rendering.cjs",
  plugins: [{
    name: "campaign-rendering-fixtures",
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) =>
        Object.hasOwn(stubs, path) ? { path, namespace: "fixture" } : undefined,
      );
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        contents: stubs[path], loader: "js",
      }));
    },
  }],
});
const compiled = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles.find(file => file.path.endsWith(".cjs")).text)(
  createRequire(import.meta.url), compiled, compiled.exports,
);
const renderer = compiled.exports;

test("statute renders every legal label in nested lists without changing its text or numbering", async () => {
  const content = JSON.parse(readFileSync(new URL("../app/data/content.json", import.meta.url), "utf8"));
  const statute = content.pages.find(page => page.slug === "statut");
  const $ = load(await renderer.article(statute));
  const article = $("article.statut-prose.prose-justified");
  assert.equal(article.length, 1);
  assert.deepEqual(
    article.find("h2.statut-section-heading").map((_, heading) => $(heading).text()).get(),
    Array.from({ length: 42 }, (_, index) => `§ ${index + 1}`),
  );
  const normalize = text => text.replace(/\s+/g, " ").trim();
  assert.equal(normalize(article.children().map((_, element) => $(element).text()).get().join(" ")), normalize(statute.paragraphs.join(" ")));
  assert.doesNotMatch(article.text(), /##/);
  assert.equal(article.find(".statut-chapter-heading").length, 9);
  assert.equal(article.find(".statut-organ-heading").length, 5);
  assert.equal(article.find(".statut-list-subsection > li").length, 138);
  assert.equal(article.find(".statut-list-point > li").length, 115);
  assert.equal(article.find(".statut-list-letter > li").length, 25);
  assert.equal(article.find("p strong").length, 0);
  for (const [style, pattern] of [["subsection", /^(\d+\.)\s+/], ["point", /^(\d+\))\s+/]]) {
    assert.deepEqual(
      article.find(`.statut-list-${style} > li > .statut-item-marker`).map((_, marker) => $(marker).text().trim()).get(),
      statute.paragraphs.filter(text => pattern.test(text)).map(text => text.match(pattern)[1]),
    );
  }

  const sectionBlocks = number => article.find(".statut-section-heading").filter((_, h) => $(h).text() === `§ ${number}`).nextUntil(".statut-section-heading, .statut-chapter-heading, .statut-organ-heading");
  const letters = [[6, 2, 14], [8, 2, 4], [11, 4, 4], [22, 1, 3]];
  for (const [section, subsection, count] of letters) {
    const list = sectionBlocks(section).filter("ol").children(`li[value="${subsection}"]`).find(".statut-item-content > .statut-list-letter");
    assert.equal(list.length, 1, `§ ${section} ust. ${subsection}`);
    assert.deepEqual(list.children("li").children(".statut-item-marker").map((_, marker) => $(marker).text().trim()).get(), Array.from({ length: count }, (_, i) => `${String.fromCharCode(97 + i)})`));
  }
  for (const [section, subsection, count] of [[4, 1, 2], [6, 1, 11], [7, 1, 18], [17, 3, 4], [18, 2, 14], [23, 1, 16], [24, 6, 3], [27, 5, 2], [33, 1, 2]]) {
    const list = sectionBlocks(section).filter("ol").children(`li[value="${subsection}"]`).find(".statut-item-content > .statut-list-point");
    assert.equal(list.children("li").length, count, `§ ${section} ust. ${subsection}`);
  }
  for (const [section, count] of [[12, 5], [16, 6], [30, 6], [38, 2]]) {
    assert.equal(sectionBlocks(section).filter(".statut-list-point").children("li").length, count, `§ ${section}`);
    assert.equal(sectionBlocks(section).filter(".statut-list-subsection").length, 0, `§ ${section}: no invented subsection`);
  }
  for (const [section, subsection, continuation] of [[17, 2, statute.paragraphs[134]], [24, 5, statute.paragraphs[220]]]) {
    const paragraphs = sectionBlocks(section).filter("ol").children(`li[value="${subsection}"]`).children(".statut-item-content").children("p");
    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs.last().text().trim(), continuation);
  }
});

test("statute splits sentence-final section labels but preserves inline and sentence-final references on all pages", async () => {
  const props = {
    slug: "statut",
    source: "",
    links: [],
    paragraphs: [
      "§ 1",
      "1. Zdanie kończy się tutaj. § 2",
      "2. Obowiązuje odesłanie do § 24",
      "3. Zastosowanie mają § 11 ust. 4 oraz § 24 ust. 6-13 Statutu.",
      "1) Odesłanie do § 8 Statutu,",
    ],
  };
  const $ = load(await renderer.article(props));
  assert.deepEqual($("h2.statut-section-heading").map((_, element) => $(element).text()).get(), ["§ 1", "§ 2"]);
  assert.equal($("h2.statut-section-heading").last().prev("ol").find("p").text().trim(), "Zdanie kończy się tutaj.");
  assert.deepEqual($("article p").map((_, element) => $(element).text().trim()).get(), props.paragraphs.slice(1).map(text => text.replace(/^\d+[.)]\s+/, "").replace(/\s+§ 2$/, "")));

  const unrelated = load(await renderer.article({ ...props, slug: "statute-formatting-fixture" }));
  assert.equal(unrelated(".statut-section-heading, .statut-prose, .prose-justified").length, 0);
  assert.equal(unrelated('article ol[start="1"] > li').first().text(), props.paragraphs[1].replace(/^1\.\s+/, ""));
});

test("statute preserves explicit labels, three list levels and continuation paragraphs without treating references as lists", async () => {
  const paragraphs = [
    "§ 1",
    "3. Ustęp z numeracją źródłową:",
    "2) Punkt z numeracją źródłową:",
    "a) Pierwszy podpunkt",
    "b) Drugi podpunkt",
    "Dalsza treść podpunktu.",
    "5. Odesłania do ust. 3 pkt 2) i lit. a) pozostają w zdaniu.",
    "§ 2",
    "Wprowadzenie bez numerowanego ustępu:",
    "1) Pierwszy punkt.",
    "2) Drugi punkt.",
  ];
  const $ = load(await renderer.article({ slug: "statut", source: "", links: [], paragraphs }));
  assert.equal($(".statut-list-subsection > li[value='3'] .statut-list-point > li[value='2'] .statut-list-letter > li").length, 2);
  assert.equal($(".statut-list-letter > li[value='2'] > .statut-item-content > p").last().text().trim(), paragraphs[5]);
  assert.equal($(".statut-list-subsection > li[value='5'] .statut-item-content > p").text().trim(), paragraphs[6].replace(/^5\.\s+/, ""));
  assert.equal($(".statut-list-subsection > li[value='5'] ol").length, 0);
  assert.deepEqual($("article > ol").last().children("li").children(".statut-item-marker").map((_, marker) => $(marker).text().trim()).get(), ["1)", "2)"]);
});

test("post galleries render below text and before downloads, while older posts have no gallery markup", async () => {
  const props = { slug: "gallery-rendering-fixture", paragraphs: ["Treść przed galerią."], links: [{ label: "Dokument PDF", href: "/manual.pdf", document: true, managedAttachment: true }], source: "", inferHeadings: false };
  const images = Array.from({ length: 5 }, (_, index) => ({ name: `Zdjęcie ${index + 1}`, href: `/media/photo-${index + 1}.jpg` }));
  const $ = load(await renderer.article({ ...props, gallery: images }));
  const gallery = $('section[aria-label="Galeria zdjęć"]');
  assert.equal(gallery.find("button img").length, 5);
  assert.deepEqual(gallery.find("img").map((_, image) => $(image).attr("src")).get(), images.map(image => image.href));
  assert.ok(gallery.prevAll("p").text().includes("Treść przed galerią."));
  assert.equal(gallery.next('section[aria-label="Pliki do pobrania"]').length, 1);
  const previous = load(await renderer.article(props));
  assert.equal(previous('section[aria-label="Galeria zdjęć"]').length, 0);
});

test("red card campaign renders the confirmed website as a clickable link", async () => {
  const $ = load(await renderer.campaign(14223));
  const link = $('article a[href="https://www.stopdezinformacjizywnosciowej.pl/"]');
  assert.equal(link.length, 1);
  assert.equal(link.text(), "www.stopdezinformacjizywnosciowej.pl");
});

test("recovered downloads render real links to verified original PDF files", async () => {
  for (const [id, href, hash, label] of [
    [10323, "/media/reports/KRD_Indyk_wrzesien.pdf", "8d06ec78a63f098f8a979dbe6665c860a0512f2a30b5f9e84452934c8cf15273", "Raport za wrzesień 2024 (PDF)"],
    [10384, "/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-1.pdf", "212b3d3c7a2feac8bf1213e21e5c2e008c7dfacc07f6ab73bedbb13b8dec223d", "Polski drób w oczach dziecka – rymowanka 1 (PDF)"],
    [10384, "/media/reports/POLSKI-DROB-W-OCZACH-DZIECKA-2.pdf", "0c743e6a4247e668a40c746ee50251f2a36defc35eb3b11b23736ea5b99be7d3", "Polski drób w oczach dziecka – rymowanka 2 (PDF)"],
  ]) {
    const $ = load(await renderer.campaign(id));
    const link = $(`article a[href="${href}"]`);
    assert.equal(link.length, 1, `${id}: ${href}`);
    assert.equal(link.text(), label);
    assert.doesNotMatch($("article").text(), /(?:Raport za wrzesień 2024.*nie jest dostępny|Dwa archiwalne pliki PDF.*nie są dostępne)/);
    const bytes = readFileSync(new URL(`../public${href}`, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  }
});

test("the 2026 tender renders the published invitation and annexes as separate working downloads", async () => {
  const repairs = JSON.parse(readFileSync(new URL("../app/data/tender-attachment-repairs.json", import.meta.url), "utf8"));
  const $ = load(await renderer.tender(900001));
  for (const [filename, context] of [
    ["1.-Zaproszenie-do-skladania-ofert-OCHRONA-WIZERUNKU-KRAJ-2026-1.pdf", /Treść Zaproszenia/],
    ["2-Zalaczniki-1-7-do-Zapytania-ofertowego.pdf", /Załączniki \(1-7\)/],
    ["2-Zalaczniki-1-7-do-Zapytania-ofertowego.docx", /w formie edytowalnej/],
    ["3.-Zalacznik-nr-5-do-Zapytania-ofertowego-KOSZTORYS.xlsx", /Załącznik nr 5/],
  ]) {
    const source = `https://krd-ig.com.pl/wp-content/uploads/2026/08/${filename}`;
    const asset = repairs.assets[source];
    assert.ok(asset, source);
    const link = $(`article a[href="${asset.href}"]`);
    assert.equal(link.length, 1, source);
    assert.match(link.closest("p,h2").text(), context);
    const bytes = readFileSync(new URL(`../public${asset.href}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
});

test("September and October campaign lists render every video URL as a clickable link", async () => {
  for (const [id, videos] of [
    [10327, ["Z2WEizeYu3Y", "26JVlEYkA5E", "MsHERFblSA4", "GugWDWgAG9g", "OZYS01PwB4k"]],
    [10323, ["dM2ocu-mjkc", "7xuw_iO4wYg", "naO7mpsL5r0", "-rBEOlBXz_E"]],
  ]) {
    const $ = load(await renderer.campaign(id));
    assert.deepEqual(
      $("article ul").map((_, list) => $(list).children("li").length).get(),
      id === 10327 ? [3, 7, 2] : [2, 2],
    );
    for (const video of videos) {
      const url = `https://www.youtube.com/watch?v=${video}`;
      const link = $(`article li a[href="${url}"]`);
      assert.equal(link.length, 1, `${id}: ${url}`);
      assert.equal(link.text(), url);
    }
    if (id === 10327) {
      assert.equal($('a[href="/media/reports/KRD-indyk_pazdziernik.pdf"]').length, 1);
      assert.equal($('a[href*="localhost"]').length, 0);
    }
  }
});

test("campaign articles keep ordinary text out of headings and preserve explicit sections and lists", async () => {
  const props = {
    slug: "campaign-fixture",
    categories: ["Kampanie"],
    source: "",
    links: [],
    paragraphs: [
      "Wprowadzenie.",
      "Krótki zwykły akapit",
      "## Cele kampanii",
      "- Pierwszy cel\n- Drugi cel",
    ],
  };
  const campaign = load(await renderer.article(props));
  assert.equal(campaign("article.prose-campaign.prose-justified").length, 1);
  assert.deepEqual(campaign("article h2").map((_, e) => campaign(e).text()).get(), ["Cele kampanii"]);
  assert.equal(campaign("article p").last().text(), "Krótki zwykły akapit");
  assert.deepEqual(campaign("article ul li").map((_, e) => campaign(e).text()).get(), ["Pierwszy cel", "Drugi cel"]);

  const unrelated = load(await renderer.article({ ...props, categories: ["Rynek"] }));
  assert.equal(unrelated("article.prose-campaign").length, 0);
  assert.equal(unrelated("article.prose-justified").length, 0);
  assert.equal(unrelated("article h2").first().text(), "Krótki zwykły akapit");
});

test("campaign directory distinguishes available websites from unavailable or insecure destinations", () => {
  const $ = load(renderer.ticker());
  const cards = $(".campaign-website-card");
  assert.ok(cards.length > 0);
  const firstCopy = cards.slice(0, cards.length / 2);
  assert.equal(firstCopy.filter("a").length, 4);
  assert.equal(firstCopy.filter("div").length, 3);
  for (const card of firstCopy.filter("div")) {
    assert.ok($(card).find(".campaign-website-status").text());
    assert.equal($(card).find("a,img").length, 0);
  }
  assert.equal($('a[href="https://dobrydrob.pl/"]').length, 2);
  assert.equal($('a[href^="http:"]').length, 0);
  assert.equal($('a[href*="wingsofquality"],a[href*="podajindyka"],a[href*="stopdezinformacjizywnosciowej"]').length, 0);
});
