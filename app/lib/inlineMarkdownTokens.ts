const inlineTokenPattern = /\[(small|large)\]([\s\S]+?)\[\/\1\]|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_|\[([^\]]+)\]\(([^)]+)\)/g;
const inlineTokenWithUrlPattern = new RegExp(`${inlineTokenPattern.source}|\\b((?:https?:\\/\\/|www\\.)[^\\s<>"'\\[\\]„”]+)`, "gi");

export function getInlineMarkdownMatches(text: string, autoLinkUrls = false) {
  return Array.from(text.matchAll(autoLinkUrls ? inlineTokenWithUrlPattern : inlineTokenPattern));
}
