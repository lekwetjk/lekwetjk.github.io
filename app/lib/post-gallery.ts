export const MAX_GALLERY_IMAGES = 10;

export type GalleryImage = { name: string; href: string };
export type GalleryItem = GalleryImage & { id: string; file?: File };
export type GalleryInput = { id: string } | { file: File };

export function appendGalleryFormData(form: FormData, items: GalleryItem[]) {
  const entries = items.map(item => {
    if (!item.file) return { id: item.id };
    const index = form.getAll("galleryFiles").length;
    form.append("galleryFiles", item.file);
    return { file: index };
  });
  form.set("gallery", JSON.stringify(entries));
}

export function readGalleryFormData(form: FormData): GalleryInput[] | undefined {
  const value = form.get("gallery");
  const files = form.getAll("galleryFiles");
  if (value === null && !files.length) return undefined;
  if (typeof value !== "string") throw new Error("Nieprawidłowy zapis galerii.");
  let entries: unknown;
  try { entries = JSON.parse(value); } catch { throw new Error("Nieprawidłowy zapis galerii."); }
  if (!Array.isArray(entries) || entries.length > MAX_GALLERY_IMAGES) throw new Error(`Galeria może zawierać maksymalnie ${MAX_GALLERY_IMAGES} zdjęć.`);
  const usedFiles = new Set<number>();
  const result = entries.map((entry: unknown): GalleryInput => {
    if (!entry || typeof entry !== "object" || Object.keys(entry).length !== 1) throw new Error("Nieprawidłowe zdjęcie w galerii.");
    if ("id" in entry && typeof entry.id === "string" && entry.id) return { id: entry.id };
    if ("file" in entry && typeof entry.file === "number" && Number.isInteger(entry.file) && entry.file >= 0 && entry.file < files.length && !usedFiles.has(entry.file)) {
      const file = files[entry.file];
      if (file instanceof File && file.size > 0) { usedFiles.add(entry.file); return { file }; }
    }
    throw new Error("Nieprawidłowe zdjęcie w galerii.");
  });
  if (usedFiles.size !== files.length) throw new Error("Przesłano pliki spoza galerii.");
  return result;
}
