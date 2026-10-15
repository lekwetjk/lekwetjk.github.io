const inlineTokenPattern = /\[(small|large)\]([\s\S]+?)\[\/\1\]|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_|\[([^\]]+)\]\(([^)]+)\)/g;

export function getInlineMarkdownMatches(text: string) {
  return Array.from(text.matchAll(inlineTokenPattern));
}
