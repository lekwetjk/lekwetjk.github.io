import assert from "node:assert/strict";
import test from "node:test";

import { setMarkdownFontSize, toggleInlineMarkdown, toggleMarkdownHeading } from "../app/admin/publikacje/markdownEditorFormatting.ts";

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
