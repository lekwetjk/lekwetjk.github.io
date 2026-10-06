import type { CSSProperties } from "react";
import { connection } from "next/server";

import { getPublicMemberBannerItems } from "../lib/auth";
import { withBasePath } from "../lib/basePath";

export async function CommissionTicker() {
  await connection();
  const items = await getPublicMemberBannerItems();

  if (!items.length) {
    return null;
  }

  const repetitions = Math.max(1, Math.ceil(6 / items.length));
  const loopItems = Array.from({ length: repetitions }, () => items).flat();
  const doubled = [...loopItems, ...loopItems];

  return (
    <section className="commission-ticker" aria-label="Logotypy członków KRD-IG">
      <div className="commission-ticker-track-wrap">
        <div className="commission-ticker-track" style={{ animationDuration: "112s" }}>
          {doubled.map((item, index) => (
            <article
              key={`${item.id}-${index}`}
              className="commission-ticker-item"
              title={item.name}
              style={{ "--member-logo-scale": `${item.scale * 100}%` } as CSSProperties}
            >
              <span className="commission-ticker-logo-wrap" aria-hidden="true">
                <img
                  className="commission-ticker-logo"
                  src={withBasePath(`/api/member-logos/${encodeURIComponent(item.id)}`)}
                  alt=""
                  loading="lazy"
                />
              </span>
              <span className="commission-ticker-folder">{item.name}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
