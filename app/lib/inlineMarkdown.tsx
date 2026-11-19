import type { ReactNode } from "react";
import { getInlineMarkdownMatches } from "./inlineMarkdownTokens";
import { isSafeMarkdownLinkHref } from "./markdownLinks";

/** Renders a plain-text paragraph with basic inline Markdown formatting. */
export function renderInlineMarkdown(text: string, keyPrefix: string, autoLinkUrls = false): ReactNode {
  if (!autoLinkUrls && !text.includes("*") && !text.includes("_") && !text.includes("](") && !text.includes("[small]") && !text.includes("[large]")) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of getInlineMarkdownMatches(text, autoLinkUrls)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const [, fontSize, sizedText, boldItalicText, boldText, asteriskItalicText, underscoreItalicText, linkLabel, linkHref, rawUrl] = match;
    if (fontSize !== undefined) {
      nodes.push(<span className={`inline-text-${fontSize}`} key={`${keyPrefix}-size-${matchIndex}`}>{renderInlineMarkdown(sizedText, `${keyPrefix}-size-${matchIndex}`, autoLinkUrls)}</span>);
    } else if (boldItalicText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-bi-${matchIndex}`}><em>{renderInlineMarkdown(boldItalicText, `${keyPrefix}-bi-${matchIndex}`, autoLinkUrls)}</em></strong>);
    } else if (boldText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${matchIndex}`}>{renderInlineMarkdown(boldText, `${keyPrefix}-b-${matchIndex}`, autoLinkUrls)}</strong>);
    } else if (asteriskItalicText !== undefined || underscoreItalicText !== undefined) {
      const italicText = asteriskItalicText ?? underscoreItalicText;
      nodes.push(<em key={`${keyPrefix}-i-${matchIndex}`}>{renderInlineMarkdown(italicText, `${keyPrefix}-i-${matchIndex}`, autoLinkUrls)}</em>);
    } else if (rawUrl !== undefined) {
      let url = rawUrl.replace(/[.,;:!?]+$/, "");
      while (url.endsWith(")") && url.split(")").length > url.split("(").length) {
        url = url.slice(0, -1).replace(/[.,;:!?]+$/, "");
      }
      nodes.push(
        <a className="inline-download-link" href={/^www\./i.test(url) ? `https://${url}` : url}
          key={`${keyPrefix}-url-${matchIndex}`} target="_blank" rel="noopener noreferrer">
          {url}
        </a>,
        rawUrl.slice(url.length),
      );
    } else if (isSafeMarkdownLinkHref(linkHref)) {
      nodes.push(
        <a
          className="inline-download-link"
          href={linkHref}
          key={`${keyPrefix}-a-${matchIndex}`}
          target={/^https?:\/\//i.test(linkHref) ? "_blank" : undefined}
          rel={/^https?:\/\//i.test(linkHref) ? "noopener noreferrer" : undefined}
        >
          {linkLabel}
        </a>,
      );
    } else {
      nodes.push(linkLabel);
    }

    lastIndex = index + match[0].length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
