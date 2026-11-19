import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";

const { outputFiles } = await build({
  stdin: {
    contents: 'export { newsPosts } from "./app/lib/content.ts"; export { renderInlineMarkdown } from "./app/lib/inlineMarkdown.tsx";',
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
    loader: "ts",
  },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
});
const { newsPosts, renderInlineMarkdown } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
const render = (text, enabled = true) => load(renderToStaticMarkup(renderInlineMarkdown(text, "test", enabled)));

test("campaign URLs preserve paths, queries, underscores and surrounding punctuation", () => {
  const text = "Zobacz (https://example.pl/film_(2024)), www.indykajemy.pl. https://www.youtube.com/watch?v=7xuw_iO4wYg&list=abc!";
  const $ = render(text);
  assert.equal($("body").text(), text);
  assert.deepEqual($("a").map((_, a) => $(a).attr("href")).get(), [
    "https://example.pl/film_(2024)", "https://www.indykajemy.pl",
    "https://www.youtube.com/watch?v=7xuw_iO4wYg&list=abc",
  ]);
  $("a").each((_, a) => {
    assert.equal($(a).attr("target"), "_blank");
    assert.equal($(a).attr("rel"), "noopener noreferrer");
  });
});

test("campaign autolinks coexist with formatting and existing Markdown links", () => {
  const $ = render("**www.indykajemy.pl** [Film](https://example.pl/video) [www.example.pl](https://example.pl) [bad](javascript:alert)");
  assert.equal($("strong a").attr("href"), "https://www.indykajemy.pl");
  assert.equal($("a").length, 3);
  assert.equal($("a a").length, 0);
  assert.equal($('a[href^="javascript:"]').length, 0);
  assert.equal(render("www.indykajemy.pl", false)("a").length, 0);
});

test("all plain website addresses in imported campaign descriptions become links without changing text", () => {
  let count = 0;
  for (const post of newsPosts.filter((post) => post.categories.includes("Kampanie"))) {
    for (const paragraph of [post.excerpt, ...post.paragraphs]) {
      if (paragraph.includes("](") || !/\b(?:https?:\/\/|www\.)/i.test(paragraph)) continue;
      const $ = render(paragraph);
      assert.equal($("body").text(), paragraph, post.slug);
      assert.doesNotMatch($("body").clone().find("a").remove().end().text(), /\b(?:https?:\/\/|www\.)/i, post.slug);
      count += $("a").length;
    }
  }
  assert.ok(count > 0);
});
