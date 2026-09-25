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

  function toggleInline(marker: "**" | "_") {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = value.slice(start, end);
    const markerLength = marker.length;
    const wrappedOutside = value.slice(start - markerLength, start) === marker
      && value.slice(end, end + markerLength) === marker;
    const wrappedInside = selected.startsWith(marker)
      && selected.endsWith(marker)
      && selected.length >= markerLength * 2;

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

  function setFontSize(size: "normal" | "small" | "large") {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = value.slice(start, end);
    const existingSize = selected.match(/^\[(small|large)\]([\s\S]*)\[\/\1\]$/);
    const surroundingSize = value.slice(0, start).match(/\[(small|large)\]$/)?.[1];
    const wrappedOutside = surroundingSize !== undefined
      && value.slice(end).startsWith(`[/${surroundingSize}]`);
    const content = existingSize?.[2] ?? selected;
    const replacement = size === "normal" ? content : `[${size}]${content}[/${size}]`;
    const selectionOffset = size === "normal" ? 0 : size.length + 2;
    const replaceStart = wrappedOutside ? start - surroundingSize.length - 2 : start;
    const replaceEnd = wrappedOutside ? end + surroundingSize.length + 3 : end;
    onChange(`${value.slice(0, replaceStart)}${replacement}${value.slice(replaceEnd)}`);
    restoreSelection(replaceStart + selectionOffset, replaceStart + selectionOffset + content.length);
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
      <div aria-label="Formatowanie treści" role="toolbar" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
        <button type="button" aria-label="Pogrubienie" title="Pogrubienie" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("**")} style={{ minWidth: 38 }}><strong>B</strong></button>
        <button type="button" aria-label="Kursywa" title="Kursywa" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("_")} style={{ minWidth: 38 }}><em>I</em></button>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>Rozmiar
          <select aria-label="Rozmiar czcionki" defaultValue="normal" onChange={(event) => { setFontSize(event.target.value as "normal" | "small" | "large"); event.currentTarget.value = "normal"; }}>
            <option value="normal">Normalny</option>
            <option value="small">Mały</option>
            <option value="large">Duży</option>
          </select>
        </label>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleHeading}>Nagłówek</button>
      </div>
      <textarea ref={editorRef} name={name} required={required} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", padding: 10 }} />
    </>
  );
}