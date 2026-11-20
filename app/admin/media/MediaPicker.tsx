"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MediaBrowser from "./MediaBrowser";
import type { MediaAsset } from "../../lib/media-references";
import styles from "./MediaPicker.module.css";

export default function MediaPicker({ kind, selected, onChange }: { kind: "image" | "attachment"; selected: MediaAsset[]; onChange: (assets: MediaAsset[]) => void }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const name = kind === "image" ? "libraryImage" : "libraryAttachments";
  function closeLibrary() {
    dialogRef.current?.close();
    setOpen(false);
  }
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <section aria-label={kind === "image" ? "Grafika z biblioteki" : "Załączniki z biblioteki"} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 12, minWidth: 0 }}>
    {selected.map(asset => <div key={asset.id} style={{ marginBottom: 8, overflowWrap: "anywhere" }}>
      <input type="hidden" name={name} value={asset.id} />
      <span>{asset.name} </span><button type="button" onClick={() => onChange(selected.filter(item => item.id !== asset.id))}>Odłącz wybór</button>
    </div>)}
    <button type="button" className="button button-outline" aria-haspopup="dialog" aria-controls={open ? dialogId : undefined} onClick={() => setOpen(true)}>{kind === "image" ? "Wybierz grafikę z biblioteki" : "Wybierz załączniki z biblioteki"}</button>
    {open ? createPortal(<dialog ref={dialogRef} id={dialogId} aria-labelledby={`${dialogId}-title`} className={styles.dialog} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); closeLibrary(); }}>
      <header className={styles.header}>
        <h2 id={`${dialogId}-title`}>Biblioteka mediów — {kind === "image" ? "wybierz grafikę" : "wybierz załączniki"}</h2>
        <button type="button" className="button button-outline" onClick={closeLibrary}>Zamknij bibliotekę</button>
      </header>
      <div className={styles.content}><MediaBrowser kind={kind} onSelect={asset => {
        onChange(kind === "image" ? [asset] : selected.some(item => item.id === asset.id) ? selected : [...selected, asset]);
        if (kind === "image") closeLibrary();
      }} /></div>
    </dialog>, document.body) : null}
  </section>;
}
