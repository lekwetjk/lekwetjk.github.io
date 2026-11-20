export type MediaUsage = {
  kind: "page" | "post" | "component" | "document" | "bulletin" | "history" | "trash";
  label: string;
  href: string | null;
};

export type MediaAsset = {
  id: string;
  name: string;
  href: string;
  key: string;
  source: "static" | "r2" | "document" | "bulletin";
  contentType: string;
  size: number | null;
  uploadedAt: string | null;
  private: boolean;
  trashedAt: string | null;
  usages: MediaUsage[];
};

const OWN_HOSTS = new Set(["krd-ig.com.pl", "www.krd-ig.com.pl", "krd-ig-website-concept.lek-wet-jk.workers.dev"]);

export function mediaHref(key: string) {
  return key.startsWith("/") ? key : `/api/media/${encodeURIComponent(key)}`;
}

export function mediaPostKey(asset: MediaAsset) {
  return asset.source === "document" ? asset.href : asset.key;
}

export function mediaReference(value: string): string | null {
  let pathname = value.trim();
  let scope: string | null = null;
  if (/^https?:\/\//i.test(pathname)) {
    let url: URL;
    try { url = new URL(pathname); } catch { return null; }
    if (!OWN_HOSTS.has(url.hostname.toLowerCase())) return null;
    pathname = url.pathname;
    scope = url.searchParams.get("scope");
  } else {
    if (pathname.startsWith("//")) return null;
    scope = new URLSearchParams(pathname.split("?", 2)[1]?.split("#", 1)[0]).get("scope");
    pathname = pathname.split(/[?#]/, 1)[0];
  }
  try { pathname = decodeURIComponent(pathname); } catch { return null; }
  if (/[\0\\]/.test(pathname) || pathname.split("/").some(part => part === "." || part === "..")) return null;
  if (pathname.startsWith("/member/dokumenty/")) {
    const fileName = pathname.slice("/member/dokumenty/".length);
    if (/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      const prefix = scope === "methodology" ? "methodology-documents" : scope === "epi-geo" ? "epi-geo-documents" : scope === null || scope === "documents" ? "member-documents" : null;
      if (prefix) return `r2:${prefix}/${fileName}`;
    }
  }
  if (pathname.startsWith("/api/media/")) return `r2:${pathname.slice("/api/media/".length)}`;
  if (/^(?:managed-posts|media-library|bulletin-reports|bulletin-report-uploads)\//.test(pathname)) return `r2:${pathname}`;
  return pathname.startsWith("/") ? `static:${pathname}` : null;
}

export function collectMediaReferences(value: unknown): Set<string> {
  const result = new Set<string>();
  function visit(item: unknown) {
    if (typeof item === "string") {
      const direct = mediaReference(item);
      if (direct) result.add(direct);
      const matches = item.match(/https?:\/\/[^\s<>"'[\]]+|\/[^\s<>"'[\]]+|(?:managed-posts|media-library|bulletin-reports|bulletin-report-uploads)\/[^\s<>"'[\]]+/g) ?? [];
      for (const match of matches) {
        const reference = mediaReference(match.replace(/[),.;]+$/, ""));
        if (reference) result.add(reference);
      }
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (item && typeof item === "object") {
      for (const [key, nested] of Object.entries(item)) {
        if (key !== "base64") visit(nested);
      }
    }
  }
  visit(value);
  return result;
}

export function addMediaUsage(index: Map<string, MediaUsage[]>, references: Iterable<string>, usage: MediaUsage) {
  for (const reference of references) {
    const usages = index.get(reference) ?? [];
    if (!usages.some(item => item.kind === usage.kind && item.label === usage.label && item.href === usage.href)) {
      usages.push(usage);
      index.set(reference, usages);
    }
  }
}

export function reusableMedia(asset: MediaAsset) {
  return !asset.private && !asset.trashedAt && asset.source !== "bulletin";
}
