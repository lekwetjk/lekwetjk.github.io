import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withBasePath } from "../lib/basePath";

type BannerItem = {
  folder: string;
  fileName: string;
  href: string;
};

function loadBannerItems(): BannerItem[] {
  const manifestPath = join(process.cwd(), "app", "data", "commission-banner.json");

  try {
    const raw = readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is BannerItem =>
          !!item &&
          typeof item === "object" &&
          typeof (item as { folder?: unknown }).folder === "string" &&
          typeof (item as { fileName?: unknown }).fileName === "string" &&
          typeof (item as { href?: unknown }).href === "string",
      );
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { folder?: unknown }).folder === "string" &&
      typeof (parsed as { fileName?: unknown }).fileName === "string" &&
      typeof (parsed as { href?: unknown }).href === "string"
    ) {
      return [parsed as BannerItem];
    }

    return [];
  } catch {
    return [];
  }
}

export function CommissionTicker() {
  const typedItems = loadBannerItems();

  if (!typedItems.length) {
    return null;
  }

  const doubled = [...typedItems, ...typedItems];

  return (
    <section className="commission-ticker" aria-label="Materiały komisji KRD">
      <div className="commission-ticker-track-wrap">
        <div className="commission-ticker-track" style={{ animationDuration: "190s" }}>
          {doubled.map((item, index) => (
            <a
              key={`${item.folder}-${item.fileName}-${index}`}
              className="commission-ticker-item"
              href={withBasePath(item.href)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${item.folder}: ${item.fileName}`}
            >
              <span className="commission-ticker-logo-wrap" aria-hidden="true">
                <img
                  className="commission-ticker-logo"
                  src={withBasePath(item.href)}
                  alt=""
                  loading="lazy"
                />
              </span>
              <span className="commission-ticker-folder">{item.folder}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
