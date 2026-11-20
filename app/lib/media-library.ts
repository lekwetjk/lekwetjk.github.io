import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { bulletinReports, managedPosts, mediaAssets, memberDocuments } from "../../db/schema.ts";
import staticCatalog from "../data/media-catalog.json" with { type: "json" };
import { cmsFlag, type CmsSafetyEnvironment } from "./cms-safety-flags.ts";
import { listContentHistory } from "./content-history.ts";
import { listContentTrash } from "./content-trash.ts";
import { documentContentType, validFileName, type MemberDocumentScope } from "./member-documents.ts";
import { addMediaUsage, collectMediaReferences, mediaHref, reusableMedia, type MediaAsset, type MediaUsage } from "./media-references.ts";

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const FILE_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const DOCUMENT_PREFIXES: Array<[string, MemberDocumentScope]> = [
  ["member-documents/", "documents"], ["epi-geo-documents/", "epi-geo"], ["methodology-documents/", "methodology"],
];
const DOCUMENT_SECTIONS = {
  documents: { label: "Dokumenty dla członków", href: "/member/dokumenty" },
  "epi-geo": { label: "Dane Epi-Geo", href: "/member/epi-geo" },
  methodology: { label: "Metodyka i biuletyny", href: "/admin/metodyka-i-biuletyny" },
};

export class MediaLibraryError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function mediaLibraryEnabled() {
  return cmsFlag((globalThis as typeof globalThis & { env?: CmsSafetyEnvironment }).env?.CMS_MEDIA_ENABLED);
}

function requireEnabled() {
  if (!mediaLibraryEnabled()) throw new MediaLibraryError("Biblioteka mediów jest wyłączona.", 404);
}

async function database() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER, sha256 TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL, trashed_at TEXT)`);
  return db;
}

function readJson(value: string): unknown {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch (cause) {
    throw new Error("Nieprawidłowy zapis użycia plików. Operacja została zatrzymana.", { cause });
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Niepełny zapis użycia plików. Operacja została zatrzymana.");
  return parsed;
}

function readFileReferences(value: string) {
  const parsed = readJson(value);
  if (!Array.isArray(parsed)) throw new Error("Nieprawidłowy spis załączników.");
  return parsed.map(item => {
    if (!item || typeof item !== "object" || typeof item.key !== "string" || typeof item.name !== "string") throw new Error("Nieprawidłowy załącznik.");
    return { key: item.key, name: item.name };
  });
}

function documentDetails(key: string) {
  for (const [prefix, scope] of DOCUMENT_PREFIXES) {
    if (key.startsWith(prefix) && validFileName(key.slice(prefix.length))) return { scope, fileName: key.slice(prefix.length) };
  }
  return null;
}

function documentAsset(key: string, name: string, contentType: string, uploadedAt: string, size: number | null): MediaAsset {
  const document = documentDetails(key);
  if (!document) throw new Error("Nieprawidłowy klucz dokumentu biblioteki.");
  return {
    id: `r2:${key}`, key, name, contentType, uploadedAt, size, source: "document", private: document.scope !== "methodology", trashedAt: null, usages: [],
    href: `/member/dokumenty/${encodeURIComponent(document.fileName)}?scope=${document.scope}`,
  };
}

export async function listMediaAssets(): Promise<MediaAsset[]> {
  requireEnabled();
  const db = await database();
  const [states, posts, reports, documents, history, trash] = await Promise.all([
    db.select().from(mediaAssets),
    db.select().from(managedPosts),
    db.select().from(bulletinReports),
    db.select({ fileName: memberDocuments.fileName, title: memberDocuments.title, contentType: memberDocuments.contentType, createdAt: memberDocuments.createdAt }).from(memberDocuments),
    listContentHistory(),
    listContentTrash(),
  ]);
  const usages = new Map<string, MediaUsage[]>();
  const assets = new Map<string, MediaAsset>();
  for (const asset of staticCatalog) {
    const staticUsages: MediaUsage[] = asset.usages.map(usage => {
      if (usage.kind !== "page" && usage.kind !== "post" && usage.kind !== "component") throw new Error("Nieprawidłowy indeks użycia plików archiwum.");
      return { ...usage, kind: usage.kind };
    });
    assets.set(asset.id, { ...asset, source: "static", usages: staticUsages });
  }
  for (const post of posts) {
    addMediaUsage(usages, collectMediaReferences({ image: post.imageKey, attachments: readFileReferences(post.attachmentsJson), content: post.content, source: post.source }), {
      kind: post.deletedAt ? "trash" : "post", label: post.title,
      href: post.deletedAt ? "/admin/historia-i-kosz" : `/aktualnosci/${post.slug}`,
    });
  }
  const reportSources = new Map<string, { label: string; download: string }>();
  for (const report of reports) {
    const sources = readFileReferences(report.sourcesJson);
    addMediaUsage(usages, collectMediaReferences(sources), { kind: "bulletin", label: report.title, href: `/tresc/raporty?raport=${encodeURIComponent(report.slug)}` });
    for (const source of sources) {
      reportSources.set(source.key, {
        label: source.name, download: `/api/admin/media?download=${encodeURIComponent(`r2:${source.key}`)}`,
      });
    }
  }
  for (const revision of history) {
    addMediaUsage(usages, collectMediaReferences(readJson(revision.snapshotJson)), {
      kind: "history", label: `${revision.label} · ${revision.capturedAt}`, href: "/admin/historia-i-kosz",
    });
  }
  for (const entry of trash) {
    addMediaUsage(usages, collectMediaReferences(readJson(entry.snapshotJson)), {
      kind: "trash", label: `Kosz: ${entry.kind} · ${entry.resourceId}`, href: "/admin/historia-i-kosz",
    });
  }
  for (const document of documents) {
    const parts = document.fileName.split("/");
    const scope = parts.length === 1 ? "documents" : parts[0];
    if (scope !== "documents" && scope !== "epi-geo" && scope !== "methodology") throw new Error("Nieprawidłowa sekcja dokumentu w bibliotece.");
    const prefix = DOCUMENT_PREFIXES.find(item => item[1] === scope)![0];
    const key = `${prefix}${parts.at(-1)}`;
    assets.set(`r2:${key}`, documentAsset(key, document.title, document.contentType, document.createdAt, null));
  }
  const bucket = getMemberDocumentsBucket();
  const cursors = new Set<string>();
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ cursor, include: ["customMetadata", "httpMetadata"] });
    for (const object of page.objects) {
      if (seen.has(object.key)) throw new Error("R2 zwróciło zduplikowany plik biblioteki.");
      seen.add(object.key);
      const { key } = object;
      const document = documentDetails(key);
      const report = reportSources.get(key);
      if (document) {
        const previous = assets.get(`r2:${key}`);
        assets.set(`r2:${key}`, documentAsset(key, object.customMetadata?.title || previous?.name || document.fileName, object.httpMetadata?.contentType || previous?.contentType || documentContentType(document.fileName), object.customMetadata?.historyUploadedAt || object.uploaded.toISOString(), object.size ?? null));
      } else if (report || /^(?:managed-posts|media-library)\//.test(key)) {
        const contentType = object.httpMetadata?.contentType || FILE_TYPES[key.split(".").at(-1)?.toLowerCase() ?? ""] || "application/octet-stream";
        assets.set(`r2:${key}`, {
          id: `r2:${key}`, key, name: report?.label || object.customMetadata?.originalName || key.split("/").at(-1)!, contentType,
          href: report?.download || mediaHref(key), source: report ? "bulletin" : "r2", private: Boolean(report), size: object.size ?? null,
          uploadedAt: object.uploaded.toISOString(), trashedAt: null, usages: [],
        });
      }
    }
    if (page.truncated && (!page.cursor || cursors.has(page.cursor))) throw new Error("Niepełna lista R2: kursor biblioteki nie został przesunięty.");
    if (page.truncated && page.cursor) cursors.add(page.cursor);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const stateIndex = new Map(states.map(state => [state.id, state]));
  for (const asset of assets.values()) {
    const state = stateIndex.get(asset.id);
    if (state) {
      asset.name = state.name;
      asset.uploadedAt = state.createdAt;
      asset.trashedAt = state.trashedAt;
    }
    asset.usages.push(...(usages.get(asset.id) ?? []));
    if (asset.source === "document") {
      const document = documentDetails(asset.key)!;
      const deleted = trash.some(entry => entry.kind === "document" && entry.resourceId === `${document.scope}/${document.fileName}`);
      asset.usages.push(deleted
        ? { kind: "trash", label: DOCUMENT_SECTIONS[document.scope].label, href: "/admin/historia-i-kosz" }
        : { kind: "document", label: DOCUMENT_SECTIONS[document.scope].label, href: DOCUMENT_SECTIONS[document.scope].href });
    }
  }
  for (const state of states) {
    if (!assets.has(state.id)) throw new Error(`Brakuje pliku zarejestrowanego w bibliotece: ${state.name}`);
  }
  return [...assets.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export async function getBulletinSourceDownload(id: string) {
  const asset = (await listMediaAssets()).find(asset => asset.id === id && asset.source === "bulletin");
  if (!asset) throw new MediaLibraryError("Nie znaleziono źródła biuletynu w bibliotece.", 404);
  const object = await getMemberDocumentsBucket().get(asset.key);
  if (!object) throw new MediaLibraryError("Brakuje pliku źródłowego biuletynu.", 404);
  return { body: object.body, name: asset.name };
}

export async function resolveMediaSelection(imageId?: string, attachmentIds: string[] = [], galleryIds: string[] = []) {
  if (galleryIds.length > 5 || new Set(galleryIds).size !== galleryIds.length) throw new MediaLibraryError("Wybierz najwyżej 5 różnych zdjęć do galerii.");
  if (!imageId && !attachmentIds.length && !galleryIds.length) return { image: undefined, attachments: [], gallery: [] };
  requireEnabled();
  if (attachmentIds.length > 30) throw new MediaLibraryError("Jednorazowo można wybrać najwyżej 30 załączników.");
  const assets = await listMediaAssets();
  function choose(id: string) {
    const asset = assets.find(item => item.id === id);
    if (!asset || !reusableMedia(asset)) throw new MediaLibraryError("Wybrany plik jest prywatny, w koszu albo nie jest dostępny do ponownego użycia.");
    return asset;
  }
  const image = imageId ? choose(imageId) : undefined;
  if (image && !image.contentType.startsWith("image/")) throw new MediaLibraryError("Jako grafikę wybierz plik graficzny.");
  const attachments = [...new Set(attachmentIds)].map(choose);
  if (attachments.some(asset => !/\.(pdf|docx|xlsx)$/i.test(asset.key))) throw new MediaLibraryError("Załączniki mogą być tylko w formacie PDF, DOCX lub XLSX.");
  const gallery = galleryIds.map(choose);
  if (gallery.some(asset => !asset.contentType.startsWith("image/"))) throw new MediaLibraryError("Galeria może zawierać tylko zdjęcia.");
  return { image, attachments, gallery };
}

export async function validateMediaUpload(file: File) {
  if (!file.size) throw new MediaLibraryError("Wybrany plik jest pusty.");
  if (file.size > MAX_MEDIA_BYTES) throw new MediaLibraryError("Maksymalny rozmiar pliku w bibliotece to 25 MB.", 413);
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const contentType = FILE_TYPES[extension];
  if (!contentType) throw new MediaLibraryError("Dozwolone formaty: JPEG, PNG, WebP, PDF, DOCX i XLSX.", 415);
  const bytes = Buffer.from(await file.arrayBuffer());
  const signatureValid = extension === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : extension === "jpg" || extension === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : extension === "webp" ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
    : extension === "pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
    : bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
  if (!signatureValid) throw new MediaLibraryError("Zawartość pliku nie odpowiada jego rozszerzeniu.", 415);
  const safeName = file.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180);
  return { bytes, contentType, safeName };
}

export async function uploadMediaAsset(file: File, createdBy: string) {
  requireEnabled();
  const { bytes, contentType, safeName } = await validateMediaUpload(file);
  const key = `media-library/${crypto.randomUUID()}/${safeName}`;
  const db = await database();
  await getMemberDocumentsBucket().put(key, bytes, { httpMetadata: { contentType }, customMetadata: { originalName: file.name } });
  await db.insert(mediaAssets).values({
    id: `r2:${key}`, name: file.name, contentType, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    createdAt: new Date().toISOString(), createdBy,
  });
  return `r2:${key}`;
}

export async function changeMediaTrash(id: string, action: "trash" | "restore", changedBy: string) {
  requireEnabled();
  const asset = (await listMediaAssets()).find(item => item.id === id);
  if (!asset) throw new MediaLibraryError("Nie znaleziono pliku.", 404);
  if (asset.source !== "r2") throw new MediaLibraryError("Pliki archiwum, dokumenty prywatne i źródła biuletynów są chronione. Zarządzaj nimi w ich dotychczasowej sekcji.", 409);
  if (action === "trash" && asset.trashedAt) throw new MediaLibraryError("Plik jest już w koszu.", 409);
  if (action === "restore" && !asset.trashedAt) throw new MediaLibraryError("Plik nie jest w koszu.", 409);
  if (action === "trash" && asset.usages.length) throw new MediaLibraryError("Plik jest używany w treści, historii lub koszu. Najpierw sprawdź miejsca użycia.", 409);
  const db = await database();
  await db.insert(mediaAssets).values({
    id, name: asset.name, contentType: asset.contentType, size: asset.size, sha256: null,
    createdAt: asset.uploadedAt ?? new Date().toISOString(), createdBy: changedBy,
    trashedAt: action === "trash" ? new Date().toISOString() : null,
  }).onConflictDoUpdate({ target: mediaAssets.id, set: { trashedAt: action === "trash" ? new Date().toISOString() : null } });
  return { ok: true };
}
