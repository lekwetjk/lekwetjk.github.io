"use client";

import { useState } from "react";
import MediaBrowser from "./MediaBrowser";
import type { MediaAsset } from "../../lib/media-references";

export default function MediaPicker({ kind, selected, onChange }: { kind: "image" | "attachment"; selected: MediaAsset[]; onChange: (assets: MediaAsset[]) => void }) {
  const [open, setOpen] = useState(false);
  const name = kind === "image" ? "libraryImage" : "libraryAttachments";
  return <section aria-label={kind === "image" ? "Grafika z biblioteki" : "Załączniki z biblioteki"} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 12, minWidth: 0 }}>
    {selected.map(asset => <div key={asset.id} style={{ marginBottom: 8, overflowWrap: "anywhere" }}>
      <input type="hidden" name={name} value={asset.id} />
      <span>{asset.name} </span><button type="button" onClick={() => onChange(selected.filter(item => item.id !== asset.id))}>Odłącz wybór</button>
    </div>)}
    <button type="button" className="button button-outline" onClick={() => setOpen(!open)}>{open ? "Zamknij bibliotekę" : kind === "image" ? "Wybierz grafikę z biblioteki" : "Wybierz załączniki z biblioteki"}</button>
    {open ? <div style={{ marginTop: 14 }}><MediaBrowser kind={kind} onSelect={asset => {
      onChange(kind === "image" ? [asset] : selected.some(item => item.id === asset.id) ? selected : [...selected, asset]);
      if (kind === "image") setOpen(false);
    }} /></div> : null}
  </section>;
}
