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
    `,
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  write: false,
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
new Function("require", "module", "exports", bundled.outputFiles[0].text)(
  createRequire(import.meta.url), compiled, compiled.exports,
);
const renderer = compiled.exports;

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
