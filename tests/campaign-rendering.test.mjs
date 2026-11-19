import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { load } from "cheerio";

const stubs = {
  "next/server": "export async function connection() {}",
  "../lib/local-proposals-server": "export async function getLocalProposals() { return {}; }",
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
      import { createElement } from "react";
      export async function article(props) {
        return renderToStaticMarkup(await ArticleBody(props));
      }
      export function ticker() {
        return renderToStaticMarkup(createElement(CampaignWebsiteTicker));
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
