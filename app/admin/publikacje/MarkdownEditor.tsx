"use client";

import { useLayoutEffect, useRef } from "react";
import { setMarkdownFontSize, toggleInlineMarkdown, toggleMarkdownHeading, type MarkdownEdit } from "./markdownEditorFormatting";

type MarkdownEditorProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
};

export default function MarkdownEditor({ name, value, onChange, rows = 10, required = false }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const selection = pendingSelectionRef.current;
    if (!selection || !editorRef.current) return;
    pendingSelectionRef.current = null;
    editorRef.current.focus();
    editorRef.current.setSelectionRange(selection.start, selection.end);
    selectionRef.current = selection;
  }, [value]);

  function applyEdit(result: MarkdownEdit) {
    pendingSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    onChange(result.value);
  }

  function currentSelection() {
    const editor = editorRef.current;
    if (editor && document.activeElement === editor) {
      return { start: editor.selectionStart, end: editor.selectionEnd };
    }
    return selectionRef.current;
  }

  function toggleInline(marker: "**" | "_") {
    const { start, end } = currentSelection();
    applyEdit(toggleInlineMarkdown(value, start, end, marker));
  }

  function setFontSize(size: "normal" | "small" | "large") {
    const { start, end } = currentSelection();
    applyEdit(setMarkdownFontSize(value, start, end, size));
  }

  function toggleHeading() {
    const { start, end } = currentSelection();
    applyEdit(toggleMarkdownHeading(value, start, end));
  }

  return (
    <>
      <div aria-label="Formatowanie treści" role="toolbar" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
        <button type="button" aria-label="Pogrubienie" title="Pogrubienie" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("**")} style={{ minWidth: 38 }}><strong>B</strong></button>
        <button type="button" aria-label="Kursywa" title="Kursywa" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleInline("_")} style={{ minWidth: 38 }}><em>I</em></button>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>Rozmiar
          <select aria-label="Rozmiar czcionki" defaultValue="normal" onPointerDown={() => { const editor = editorRef.current; if (editor) selectionRef.current = { start: editor.selectionStart, end: editor.selectionEnd }; }} onChange={(event) => { setFontSize(event.target.value as "normal" | "small" | "large"); event.currentTarget.value = "normal"; }}>
            <option value="normal">Normalny</option>
            <option value="small">Mały</option>
            <option value="large">Duży</option>
          </select>
        </label>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleHeading}>Nagłówek</button>
      </div>
      <textarea
        ref={editorRef}
        name={name}
        required={required}
        rows={rows}
        value={value}
        onSelect={(event) => { selectionRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
        onChange={(event) => {
          selectionRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
          onChange(event.target.value);
        }}
        style={{ width: "100%", padding: 10 }}
      />
    </>
  );
}