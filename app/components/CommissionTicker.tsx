import bannerManifest from "../data/commission-banner.json";
import { withBasePath } from "../lib/basePath";

type BannerItem = {
  folder: string;
  fileName: string;
  href: string;
};

function loadBannerItems(): BannerItem[] {
  return bannerManifest.filter(
    (item): item is BannerItem =>
      !!item &&
      typeof item === "object" &&
      typeof item.folder === "string" &&
      typeof item.fileName === "string" &&
      typeof item.href === "string",
  );
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
