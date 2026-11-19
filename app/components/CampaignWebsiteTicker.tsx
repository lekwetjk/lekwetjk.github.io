import { Arrow } from "./SiteChrome";
import { withBasePath } from "../lib/basePath";

const campaignWebsites = [
  { label: "No Random Choice", href: "https://norandomchoice.pl/", icon: "no-random-choice", logo: withBasePath("/media/no-random-choice-logo.svg") },
  { label: "Dobry Drób", href: "https://dobrydrob.pl/", icon: "bird", logo: "https://dobrydrob.pl/wp-content/uploads/2020/07/logo.png" },
  { label: "Stop Dezinformacji Żywnościowej", unavailable: "Strona chwilowo niedostępna", icon: "shield" },
  { label: "EU Poultry", href: "https://eupoultry.eu/", icon: "globe", logo: "https://eupoultry.eu/wp-content/themes/eupoultry/img/eupoultry.png" },
  { label: "European Quality Poultry", href: "https://european-quality-poultry.eu/en/home-en/", icon: "badge", logo: "https://images.weserv.nl/?url=european-quality-poultry.eu%2Fwp-content%2Fuploads%2F2020%2F09%2Fhero.png&fit=contain&w=224&h=116&output=png" },
  { label: "Wings of Quality", unavailable: "Strona niedostępna — wygasły certyfikat", icon: "wing" },
  { label: "Podaj Indyka", unavailable: "Brak bezpiecznego połączenia ze stroną", icon: "turkey" },
];

export function CampaignWebsiteTicker() {
  const items = [...campaignWebsites, ...campaignWebsites];

  return (
    <section className="campaign-websites" aria-label="Strony internetowe kampanii">
      <div className="campaign-websites-track-wrap">
        <div className="campaign-websites-track">
          {items.map((website, index) => {
            const Card = website.unavailable ? "div" : "a";
            return (
              <Card
                className={`campaign-website-card campaign-website-card--${website.icon}`}
                href={website.href}
                key={`${website.icon}-${index}`}
                target={website.href ? "_blank" : undefined}
                rel={website.href ? "noopener noreferrer" : undefined}
              >
                <span className="campaign-website-copy">
                  {website.logo && (
                    <span className="campaign-website-logo">
                      <img src={website.logo} alt="" />
                    </span>
                  )}
                  <span className="campaign-website-label">{website.label}</span>
                  {website.unavailable && <span className="campaign-website-status">{website.unavailable}</span>}
                </span>
                {website.href && <Arrow />}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
