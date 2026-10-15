export type MarkdownEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function edit(value: string, start: number, end: number, replacement: string, selectionStart: number, selectionEnd: number): MarkdownEdit {
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart,
    selectionEnd,
  };
}

function mapSelectedLines(selected: string, transform: (line: string) => string) {
  return selected.split(/(\r?\n)/).map((part) => part === "\n" || part === "\r\n" || !part.trim() ? part : transform(part)).join("");
}

export function toggleInlineMarkdown(value: string, start: number, end: number, marker: "**" | "_"): MarkdownEdit {
  const selected = value.slice(start, end);
  const markerLength = marker.length;
  const wrappedOutside = value.slice(Math.max(0, start - markerLength), start) === marker
    && value.slice(end, end + markerLength) === marker;
  const wrappedInside = selected.startsWith(marker)
    && selected.endsWith(marker)
    && selected.length >= markerLength * 2
    && !selected.includes("\n");

  if (wrappedOutside) {
    return edit(value, start - markerLength, end + markerLength, selected, start - markerLength, end - markerLength);
  }
  if (wrappedInside) {
    const unwrapped = selected.slice(markerLength, -markerLength);
    return edit(value, start, end, unwrapped, start, start + unwrapped.length);
  }
  if (!selected.includes("\n")) {
    const replacement = `${marker}${selected}${marker}`;
    return edit(value, start, end, replacement, start + markerLength, end + markerLength);
  }

  const selectedLines = selected.split(/\r?\n/).filter((line) => line.trim());
  const removeMarkers = selectedLines.length > 0
    && selectedLines.every((line) => line.startsWith(marker) && line.endsWith(marker) && line.length >= markerLength * 2);
  const replacement = mapSelectedLines(selected, (line) => removeMarkers
    ? line.slice(markerLength, -markerLength)
    : `${marker}${line}${marker}`);
  return edit(value, start, end, replacement, start, start + replacement.length);
}

export function setMarkdownFontSize(value: string, start: number, end: number, size: "normal" | "small" | "large"): MarkdownEdit {
  const selected = value.slice(start, end);
  const existingSize = selected.match(/^\[(small|large)\]([^\n]*)\[\/\1\]$/);
  const surroundingSize = value.slice(0, start).match(/\[(small|large)\]$/)?.[1];
  const wrappedOutside = surroundingSize !== undefined && value.slice(end).startsWith(`[/${surroundingSize}]`);

  if (!selected.includes("\n")) {
    const content = existingSize?.[2] ?? selected;
    const replacement = size === "normal" ? content : `[${size}]${content}[/${size}]`;
    const replaceStart = wrappedOutside ? start - surroundingSize.length - 2 : start;
    const replaceEnd = wrappedOutside ? end + surroundingSize.length + 3 : end;
    const offset = size === "normal" ? 0 : size.length + 2;
    return edit(value, replaceStart, replaceEnd, replacement, replaceStart + offset, replaceStart + offset + content.length);
  }

  const selectedLines = selected.split(/\r?\n/).filter((line) => line.trim());
  const removeSizes = size === "normal";
  const replacement = mapSelectedLines(selected, (line) => {
    const match = line.match(/^\[(small|large)\](.*)\[\/\1\]$/);
    const content = match?.[2] ?? line;
    return removeSizes ? content : `[${size}]${content}[/${size}]`;
  });
  return edit(value, start, end, replacement, start, start + replacement.length);
}

export function toggleMarkdownHeading(value: string, selectionStart: number, selectionEnd: number): MarkdownEdit {
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const effectiveEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
  const nextLineBreak = value.indexOf("\n", effectiveEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const selectedLines = value.slice(lineStart, lineEnd);
  const nonEmptyLines = selectedLines.split(/\r?\n/).filter((line) => line.trim());
  const removeHeading = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => line.startsWith("## "));
  const replacement = mapSelectedLines(selectedLines, (line) => removeHeading ? line.slice(3) : `## ${line}`);
  return edit(value, lineStart, lineEnd, replacement, lineStart, lineStart + replacement.length);
}
