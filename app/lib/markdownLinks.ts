export function normalizeWebLinkHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function isSafeMarkdownLinkHref(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:" || protocol === "tel:";
  } catch {
    return false;
  }
}
