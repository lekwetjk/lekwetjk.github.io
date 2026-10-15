import assert from "node:assert/strict";
import test from "node:test";

import { getInlineMarkdownMatches } from "../app/lib/inlineMarkdownTokens.ts";

function countNestedTokens(text: string): number {
  return getInlineMarkdownMatches(text).reduce((count, match) => {
    const [, fontSize, sizedText, boldItalicText, boldText, asteriskItalicText, underscoreItalicText] = match;
    const nestedText = fontSize !== undefined
      ? sizedText
      : boldItalicText ?? boldText ?? asteriskItalicText ?? underscoreItalicText;
    return count + 1 + (nestedText === undefined ? 0 : countNestedTokens(nestedText));
  }, 0);
}

test("nested formatting is parsed without sharing regular expression state", () => {
  assert.equal(countNestedTokens("_Tekst z **pogrubieniem** wewnątrz kursywy_"), 2);
  assert.equal(countNestedTokens("[small]fragment [small]zagnieżdżony[/small][/small]"), 1);
});
