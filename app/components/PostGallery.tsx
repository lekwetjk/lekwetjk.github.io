"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryImage } from "../lib/post-gallery";
import styles from "./PostGallery.module.css";

export default function PostGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selected = active === null ? undefined : images[active];
  const open = selected !== undefined;
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    dialogRef.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  function close() { dialogRef.current?.close(); setActive(null); }
  function change(offset: number) { setFailed(""); setActive(index => index === null ? null : (index + offset + images.length) % images.length); }
  if (!images.length) return null;
  return <section aria-label="Galeria zdjęć" className={styles.gallery}>
    <h2>Galeria zdjęć</h2>
    <p>Kliknij miniaturę, aby powiększyć zdjęcie.</p>
    <div className={styles.grid}>{images.map((image, index) => <button key={`${image.href}-${index}`} type="button" className={styles.thumbnail} aria-label={`Powiększ zdjęcie ${index + 1} z ${images.length}`} onClick={() => { setFailed(""); setActive(index); }}>
      <img src={image.href} alt={image.name} loading="lazy" />
      <span>{index + 1}/{images.length}</span>
    </button>)}</div>
    {selected ? createPortal(<dialog ref={dialogRef} aria-label="Powiększone zdjęcie z galerii" className={styles.viewer} onClose={() => setActive(null)} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); change(event.key === "ArrowRight" ? 1 : -1); }
    }}>
      <header><span>Zdjęcie {(active ?? 0) + 1} z {images.length}</span><button type="button" onClick={close}>Zamknij ×</button></header>
      <div className={styles.frame} data-gallery-frame>
        <img src={selected.href} alt={selected.name} onError={() => setFailed(selected.href)} />
        {failed === selected.href ? <p role="alert" className={styles.imageError}>Nie udało się wczytać zdjęcia.</p> : null}
      </div>
      <footer><button type="button" onClick={() => change(-1)} disabled={images.length < 2}>← Poprzednie</button><span>1024 × 768 · zachowane proporcje</span><button type="button" onClick={() => change(1)} disabled={images.length < 2}>Następne →</button></footer>
    </dialog>, document.body) : null}
  </section>;
}
