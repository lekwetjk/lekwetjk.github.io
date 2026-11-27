"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MediaBrowser from "./MediaBrowser";
import { MAX_GALLERY_IMAGES, type GalleryItem } from "../../lib/post-gallery";
import type { MediaAsset } from "../../lib/media-references";
import styles from "./MediaPicker.module.css";
import galleryStyles from "./GalleryEditor.module.css";

export default function GalleryEditor({ value, onChange }: { value: GalleryItem[]; onChange: (items: GalleryItem[]) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    dialogRef.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  useEffect(() => {
    const kept = new Set(value.map(item => item.href));
    for (const url of urls.current) if (!kept.has(url)) { URL.revokeObjectURL(url); urls.current.delete(url); }
  }, [value]);
  useEffect(() => {
    const created = urls.current;
    return () => { for (const url of created) URL.revokeObjectURL(url); };
  }, []);
  function close() { dialogRef.current?.close(); setOpen(false); }
  function select(asset: MediaAsset) {
    if (value.some(item => item.id === asset.id)) { setError("To zdjęcie jest już w galerii."); return; }
    if (value.length >= MAX_GALLERY_IMAGES) { setError(`Galeria może zawierać maksymalnie ${MAX_GALLERY_IMAGES} zdjęć.`); return; }
    onChange([...value, { id: asset.id, href: asset.href, name: asset.name }]); setError("");
    if (value.length + 1 === MAX_GALLERY_IMAGES) close();
  }
  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > MAX_GALLERY_IMAGES - value.length) { setError(`Pozostałe miejsca: ${MAX_GALLERY_IMAGES - value.length}. Nie dodano plików przekraczających limit ${MAX_GALLERY_IMAGES} zdjęć.`); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 25 * 1024 * 1024)) { setError("Wybierz niepuste zdjęcia JPEG, PNG lub WebP, do 25 MB każde."); return; }
    const added = files.map(file => {
      const href = URL.createObjectURL(file); urls.current.add(href);
      return { id: href, name: file.name, href, file };
    });
    onChange([...value, ...added]); setError("");
  }
  function move(index: number, offset: number) {
    const next = [...value]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next);
  }
  return <fieldset className={galleryStyles.editor}>
    <legend>Galeria zdjęć pod tekstem (opcjonalnie)</legend>
    <small>Osobna od grafiki kafelka. Maksymalnie {MAX_GALLERY_IMAGES} zdjęć; miniatury pod tekstem, powiększenie 1024 × 768 px.</small>
    <strong role="status">Wybrano {value.length} z {MAX_GALLERY_IMAGES} zdjęć</strong>
    <div className={galleryStyles.actions}>
      <button type="button" className="button button-outline" disabled={value.length === MAX_GALLERY_IMAGES} onClick={() => { setError(""); setOpen(true); }}>Wybierz zdjęcia z biblioteki</button>
      <label>Dodaj zdjęcia z dysku<input aria-label="Dodaj zdjęcia do galerii z dysku" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={value.length === MAX_GALLERY_IMAGES} onChange={addFiles} /></label>
    </div>
    <div className={galleryStyles.grid}>{value.map((item, index) => <div key={item.id} className={galleryStyles.item}>
      <img src={item.href} alt={item.name} />
      <small>{index + 1}. {item.name}</small>
      <div className={galleryStyles.actions}>
        <button type="button" aria-label={`Przesuń zdjęcie ${index + 1} w lewo`} disabled={index === 0} onClick={() => move(index, -1)}>←</button>
        <button type="button" aria-label={`Przesuń zdjęcie ${index + 1} w prawo`} disabled={index === value.length - 1} onClick={() => move(index, 1)}>→</button>
        <button type="button" aria-label={`Usuń zdjęcie ${index + 1} z galerii`} onClick={() => { onChange(value.filter(photo => photo.id !== item.id)); setError(""); }}>Usuń</button>
      </div>
    </div>)}</div>
    <small>Odłączenie zdjęcia nie usuwa oryginalnego pliku.</small>
    {error ? <p role="alert" className={galleryStyles.error}>{error}</p> : null}
    {open ? createPortal(<dialog ref={dialogRef} aria-label="Wybór zdjęć do galerii" className={styles.dialog} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); close(); }}>
      <header className={styles.header}><h2>Galeria: {value.length}/{MAX_GALLERY_IMAGES} zdjęć</h2><button type="button" className="button button-outline" onClick={close}>Gotowe — zamknij bibliotekę</button></header>
      <div className={styles.content}>{error ? <p role="alert" className={galleryStyles.error}>{error}</p> : null}<MediaBrowser kind="image" onSelect={select} /></div>
    </dialog>, document.body) : null}
  </fieldset>;
}
