import { Arrow } from "./SiteChrome";

const campaignWebsites = [
  { label: "Dobry Drób", href: "http://www.dobrydrob.pl", icon: "bird" },
  { label: "Stop Dezinformacji Żywnościowej", href: "https://stopdezinformacjizywnosciowej.pl/", icon: "shield" },
  { label: "EU Poultry", href: "https://eupoultry.eu/", icon: "globe" },
  { label: "European Quality Poultry", href: "https://european-quality-poultry.eu/en/home-en/", icon: "badge" },
  { label: "Wings of Quality", href: "http://www.wingsofquality.eu", icon: "wing" },
  { label: "Podaj Indyka", href: "http://www.podajindyka.pl/", icon: "turkey" },
];

function WebsiteIcon({ name }: { name: string }) {
  if (name === "bird" || name === "turkey") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 20c5-1 7-5 8-10 5 1 9 4 10 9 1 5-3 8-8 8H9c-3 0-5-2-5-4 0-2 1-3 2-3Z" /><path d="m22 15 6-2-4 5M12 12l-2-4 5 3M8 24l-3 3" /></svg>;
  }
  if (name === "shield") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 10 4v7c0 7-4.4 12-10 15C10.4 26 6 21 6 14V7l10-4Z" /><path d="m10 21 12-12M11 10l11 11" /></svg>;
  }
  if (name === "globe") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" /><path d="M4 16h24M16 4c3 3.5 4.5 7.5 4.5 12S19 24.5 16 28c-3-3.5-4.5-7.5-4.5-12S13 7.5 16 4Z" /></svg>;
  }
  if (name === "badge") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 3 3 4-.2 1.3 3.8 3.5 2-1.3 3.8 1.3 3.8-3.5 2-1.3 3.8-4-.2-3 3-3-3-4 .2-1.3-3.8-3.5-2 1.3-3.8-1.3-3.8 3.5-2L6 5.8l4 .2 3-3Z" /><path d="m10 16 4 4 8-9" /></svg>;
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24c7-8 12-12 22-16-3 8-8 13-16 16H5Z" /><path d="M8 21c5-1 10-5 14-10M13 25c1-5 5-10 10-14" /></svg>;
}

export function CampaignWebsiteTicker() {
  const items = [...campaignWebsites, ...campaignWebsites];

  return (
    <section className="campaign-websites" aria-label="Strony internetowe kampanii">
      <div className="campaign-websites-track-wrap">
        <div className="campaign-websites-track">
          {items.map((website, index) => (
            <a
              className={`campaign-website-card campaign-website-card--${website.icon}`}
              href={website.href}
              key={`${website.href}-${index}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="campaign-website-icon">
                <WebsiteIcon name={website.icon} />
              </span>
              <span className="campaign-website-copy">
                <span className="campaign-website-label">{website.label}</span>
                <span className="campaign-website-url">{website.href.replace(/^https?:\/\//, "")}</span>
              </span>
              <Arrow />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
