import { Arrow } from "./SiteChrome";

const campaignWebsites = [
  { label: "Dobry Drób", href: "http://www.dobrydrob.pl", icon: "bird", logo: "https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png" },
  { label: "Stop Dezinformacji Żywnościowej", href: "https://stopdezinformacjizywnosciowej.pl/", icon: "shield", logo: "https://stopdezinformacjizywnosciowej.pl/wp-content/uploads/2024/07/StopDezinformacjiLogo.svg" },
  { label: "EU Poultry", href: "https://eupoultry.eu/", icon: "globe", logo: "https://eupoultry.eu/wp-content/themes/eupoultry/img/eupoultry.png" },
  { label: "European Quality Poultry", href: "https://european-quality-poultry.eu/en/home-en/", icon: "badge", logo: "https://images.weserv.nl/?url=european-quality-poultry.eu%2Fwp-content%2Fuploads%2F2020%2F09%2Fhero.png&fit=cover&position=top%2Cleft&w=112&h=58&output=png" },
  { label: "Wings of Quality", href: "http://www.wingsofquality.eu", icon: "wing", logo: "https://images.weserv.nl/?url=www.wingsofquality.eu%2Fwp-content%2Fuploads%2F2019%2F08%2Flogo-8.png" },
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
