import assert from "node:assert/strict";
import test from "node:test";

import { insertMarkdownLink, setMarkdownFontSize, toggleInlineMarkdown, toggleMarkdownHeading } from "../app/admin/publikacje/markdownEditorFormatting.ts";
import { isSafeMarkdownLinkHref, normalizeWebLinkHref } from "../app/lib/markdownLinks.ts";

test("inline formatting keeps markers balanced in every selected paragraph", () => {
  const source = "Pierwszy akapit\n\nDrugi akapit";
  const result = toggleInlineMarkdown(source, 0, source.length, "**");

  assert.equal(result.value, "**Pierwszy akapit**\n\n**Drugi akapit**");
  assert.deepEqual(result.value.split(/\n\s*\n/), ["**Pierwszy akapit**", "**Drugi akapit**"]);
});

test("font size formatting keeps tags balanced in every selected paragraph", () => {
  const source = "Pierwszy akapit\n\nDrugi akapit";
  const result = setMarkdownFontSize(source, 0, source.length, "large");

  assert.equal(result.value, "[large]Pierwszy akapit[/large]\n\n[large]Drugi akapit[/large]");
});

test("heading formatting does not turn blank lines or the next unselected line into headings", () => {
  const source = "Pierwszy\n\nDrugi";
  const result = toggleMarkdownHeading(source, 0, "Pierwszy\n\n".length);

  assert.equal(result.value, "## Pierwszy\n\nDrugi");
});

test("link formatting wraps selected text and keeps the label selected", () => {
  const source = "Więcej informacji";
  const result = insertMarkdownLink(source, 0, source.length, "https://example.com/");

  assert.equal(result.value, "[Więcej informacji](https://example.com/)");
  assert.deepEqual([result.selectionStart, result.selectionEnd], [1, source.length + 1]);
});

test("web link validation normalizes addresses and rejects unsafe protocols", () => {
  assert.equal(normalizeWebLinkHref("example.com/artykul"), "https://example.com/artykul");
  assert.equal(normalizeWebLinkHref("javascript:alert(1)"), null);
  assert.equal(isSafeMarkdownLinkHref("https://example.com/"), true);
  assert.equal(isSafeMarkdownLinkHref("/aktualnosci"), true);
  assert.equal(isSafeMarkdownLinkHref("javascript:alert(1)"), false);
});
