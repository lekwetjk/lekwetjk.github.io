import { Arrow } from "./SiteChrome";

const campaignWebsites = [
  { label: "Dobry Drób", href: "http://www.dobrydrob.pl", icon: "bird", logo: "https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png" },
  { label: "Stop Dezinformacji Żywnościowej", href: "https://stopdezinformacjizywnosciowej.pl/", icon: "shield", logo: "https://stopdezinformacjizywnosciowej.pl/wp-content/uploads/2024/07/StopDezinformacjiLogo.svg" },
  { label: "EU Poultry", href: "https://eupoultry.eu/", icon: "globe", logo: "https://eupoultry.eu/wp-content/themes/eupoultry/img/eupoultry.png" },
  { label: "European Quality Poultry", href: "https://european-quality-poultry.eu/en/home-en/", icon: "badge", logo: "https://european-quality-poultry.eu/wp-content/uploads/2020/09/hero.png" },
  { label: "Wings of Quality", href: "http://www.wingsofquality.eu", icon: "wing", logo: "https://wingsofquality.eu/wp-content/uploads/2019/08/logo-8.png" },
  { label: "Podaj Indyka", href: "http://www.podajindyka.pl/", icon: "turkey", logo: "https://images.weserv.nl/?url=www.podajindyka.pl%2Fpublic%2Fsite%2Fimages%2Flogo.png" },
];

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
              <span className="campaign-website-copy">
                <span className="campaign-website-logo">
                  <img src={website.logo} alt={`${website.label} logo`} />
                </span>
                <span className="campaign-website-label">{website.label}</span>
              </span>
              <Arrow />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
