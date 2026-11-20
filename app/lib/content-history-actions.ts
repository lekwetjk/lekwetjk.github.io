import { getContentRevision, contentStateHash, type ContentRevision } from "./content-history.ts";
import { getManagedPostSnapshot, restoreManagedPostRevision } from "./managed-posts.ts";
import { getDocumentRevisionState, restoreDocumentRevision, type MemberDocumentScope } from "./member-documents.ts";
import { listBulletinReports, restoreBulletinRevision } from "./bulletin-reports.ts";
import { getWstawieniaRows, saveWstawieniaRows, type WstawieniaRow } from "./wstawienia.ts";

export class ContentRevisionConflict extends Error {}

function documentResource(resourceId: string): { scope: MemberDocumentScope; fileName: string } {
  const parts = resourceId.split("/");
  const [scope, fileName] = parts;
  if (parts.length !== 2 || !fileName || (scope !== "documents" && scope !== "epi-geo" && scope !== "methodology")) throw new Error("Nieprawidłowa sekcja dokumentu.");
  return { scope, fileName };
}

export async function currentRevisionState(entry: ContentRevision) {
  switch (entry.kind) {
    case "post": {
      const post = await getManagedPostSnapshot(entry.resourceId);
      return post && !post.deletedAt ? post : null;
    }
    case "document": {
      const { scope, fileName } = documentResource(entry.resourceId);
      return getDocumentRevisionState(fileName, scope);
    }
    case "bulletin": return (await listBulletinReports()).find(report => report.id === entry.resourceId) ?? null;
    case "wstawienia": return getWstawieniaRows();
    default: throw new Error("Nieobsługiwany rodzaj wersji.");
  }
}

export function revisionPreview(kind: string, value: unknown): Record<string, unknown> | unknown[] | null {
  if (value === null) return null;
  if (kind === "wstawienia") return Array.isArray(value) ? value : null;
  if (!value || typeof value !== "object") throw new Error("Uszkodzona wersja treści.");
  const row = value as Record<string, unknown>;
  if (kind === "post") return { "Tytuł": row.title, "Opis": row.excerpt, "Treść": row.content, "Kategoria": row.category, "Adres": row.slug, "Data publikacji": row.createdAt, "Grafika": row.imageKey, "Załączniki": row.attachmentsJson, "Tytuł SEO": row.seoTitle, "Opis SEO": row.seoDescription };
  if (kind === "document") return { "Tytuł": row.title, "Plik": row.fileName, "Sekcja": row.scope, "Data pliku": row.uploadedAt, "Format": row.contentType, ...(row.sha256 ? { "SHA-256": row.sha256 } : {}) };
  if (kind === "bulletin") return { "Tytuł": row.title, "Adres": row.slug, "Data publikacji": row.createdAt, "Miesiąc": row.month, "Rok": row.year, "Wersja danych": row.dataKey, "Źródła": row.sources };
  throw new Error("Nieobsługiwany rodzaj wersji.");
}

export async function restoreContentRevision(id: string, expectedStateHash: string, actor: string) {
  const entry = await getContentRevision(id);
  if (!entry) throw new Error("Nie znaleziono wersji.");
  const current = await currentRevisionState(entry);
  if (current === null) throw new ContentRevisionConflict("Treść jest w koszu lub nie istnieje. Najpierw przywróć ją z kosza.");
  if (contentStateHash(current) !== expectedStateHash) throw new ContentRevisionConflict("Treść zmieniła się od otwarcia podglądu. Odśwież go przed przywróceniem.");
  const snapshot: unknown = JSON.parse(entry.snapshotJson);
  switch (entry.kind) {
    case "post": await restoreManagedPostRevision(entry.resourceId, snapshot, actor); break;
    case "document": await restoreDocumentRevision(entry.resourceId, snapshot, actor); break;
    case "bulletin": await restoreBulletinRevision(entry.resourceId, snapshot, actor); break;
    case "wstawienia": {
      if (!Array.isArray(snapshot)) throw new Error("Uszkodzona wersja tabeli.");
      await saveWstawieniaRows(snapshot as WstawieniaRow[], actor);
      break;
    }
    default: throw new Error("Nieobsługiwany rodzaj wersji.");
  }
  return entry;
}
