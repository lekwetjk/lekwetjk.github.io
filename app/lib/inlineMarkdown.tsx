import type { ReactNode } from "react";

const inlineTokenPattern = /\[(small|large)\]([\s\S]+?)\[\/\1\]|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_|\[([^\]]+)\]\(([^)]+)\)/g;

/** Renders a plain-text paragraph with basic inline Markdown formatting. */
export function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode {
  if (!text.includes("*") && !text.includes("_") && !text.includes("](") && !text.includes("[small]") && !text.includes("[large]")) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  inlineTokenPattern.lastIndex = 0;
  while ((match = inlineTokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [, fontSize, sizedText, boldItalicText, boldText, asteriskItalicText, underscoreItalicText, linkLabel, linkHref] = match;
    if (fontSize !== undefined) {
      nodes.push(<span className={`inline-text-${fontSize}`} key={`${keyPrefix}-size-${matchIndex}`}>{renderInlineMarkdown(sizedText, `${keyPrefix}-size-${matchIndex}`)}</span>);
    } else if (boldItalicText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-bi-${matchIndex}`}><em>{renderInlineMarkdown(boldItalicText, `${keyPrefix}-bi-${matchIndex}`)}</em></strong>);
    } else if (boldText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${matchIndex}`}>{renderInlineMarkdown(boldText, `${keyPrefix}-b-${matchIndex}`)}</strong>);
    } else if (asteriskItalicText !== undefined || underscoreItalicText !== undefined) {
      const italicText = asteriskItalicText ?? underscoreItalicText;
      nodes.push(<em key={`${keyPrefix}-i-${matchIndex}`}>{renderInlineMarkdown(italicText, `${keyPrefix}-i-${matchIndex}`)}</em>);
    } else {
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
    }

    lastIndex = match.index + match[0].length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
