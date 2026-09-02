import type { ReactNode } from "react";

const inlineTokenPattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

/** Renders a plain-text paragraph, supporting **bold** and [label](url) markdown syntax. */
export function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode {
  if (!text.includes("**") && !text.includes("](")) {
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

    const [, boldText, linkLabel, linkHref] = match;
    if (boldText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${matchIndex}`}>{boldText}</strong>);
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
