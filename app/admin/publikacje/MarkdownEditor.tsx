"use client";

import { useRef } from "react";

type MarkdownEditorProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
};

export default function MarkdownEditor({ name, value, onChange, rows = 10, required = false }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  function restoreSelection(start: number, end: number) {
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(start, end);
    });
  }

  function toggleInline(marker: "**" | "*") {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = value.slice(start, end);
    const markerLength = marker.length;
    const starsBefore = value.slice(0, start).match(/\*+$/)?.[0].length ?? 0;
    const starsAfter = value.slice(end).match(/^\*+/)?.[0].length ?? 0;
    const starsInsideStart = selected.match(/^\*+/)?.[0].length ?? 0;
    const starsInsideEnd = selected.match(/\*+$/)?.[0].length ?? 0;
    const markerIsActive = (before: number, after: number) => marker === "**"
      ? before >= 2 && after >= 2
      : (before === 1 || before >= 3) && (after === 1 || after >= 3);
    const wrappedOutside = markerIsActive(starsBefore, starsAfter);
    const wrappedInside = markerIsActive(starsInsideStart, starsInsideEnd) && selected.length >= markerLength * 2;

    if (wrappedOutside) {
      onChange(`${value.slice(0, start - markerLength)}${selected}${value.slice(end + markerLength)}`);
      restoreSelection(start - markerLength, end - markerLength);
      return;
    }
    if (wrappedInside) {
      const unwrapped = selected.slice(markerLength, -markerLength);
      onChange(`${value.slice(0, start)}${unwrapped}${value.slice(end)}`);
      restoreSelection(start, start + unwrapped.length);
      return;
    }

    onChange(`${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`);
    restoreSelection(start + markerLength, end + markerLength);
  }

  function toggleHeading() {
    const editor = editorRef.current;
    if (!editor) return;
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
    const nextLineBreak = value.indexOf("\n", selectionEnd);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selectedLines = value.slice(lineStart, lineEnd);
    const lines = selectedLines.split("\n");
    const removeHeading = lines.every((line) => line.startsWith("## "));
    const replacement = lines.map((line) => removeHeading ? line.slice(3) : `## ${line}`).join("\n");
    const offset = removeHeading ? -3 : 3;
    onChange(`${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`);
    restoreSelection(Math.max(lineStart, selectionStart + offset), selectionEnd + offset * lines.length);
  }

  return (
    <>
      <div aria-label="Formatowanie treści" role="toolbar" style={{ display: "flex", gap: 6, margin: "6px 0" }}>
        <button type="button" aria-label="Pogrubienie" title="Pogrubienie" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("**")}><strong>B</strong></button>
        <button type="button" aria-label="Kursywa" title="Kursywa" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("*")}><em>I</em></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleHeading}>Nagłówek</button>
      </div>
      <textarea ref={editorRef} name={name} required={required} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", padding: 10 }} />
    </>
  );
}