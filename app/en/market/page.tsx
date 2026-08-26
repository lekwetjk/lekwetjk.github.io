import type { Metadata } from "next";
import { HubPage } from "../../components/HubPage";

export const metadata: Metadata = {
  title: "Market and trade",
  description:
    "Data, reports, exports, the EU market and development directions for the Polish poultry sector.",
  alternates: {
    canonical: "https://krd-ig.com.pl/en/market",
  },
};

export default function EnglishMarketPage() {
  return (
    <HubPage
      language="en"
      eyebrow="Market and trade"
      title="Data, exports and development directions"
      lead="Key information on the scale of Polish production, intra-EU trade, third-country markets, promotion and the economic conditions shaping the sector."
      image="/media/meat-seasoned.webp"
      imageAlt="Seasoned poultry meat"
      slugs={[
        "rynek-drobiu-w-polsce-w-liczbach",
        "raporty",
        "handel-zagraniczny",
        "unia-europejska",
        "kraje-trzecie",
        "eksport-import-z-unii-europejskiej",
        "przedstawicielstwo-w-chinach",
        "globalizacja-rynku",
        "bezpieczenstwo-bialkowe",
        "promocja-drobiu",
      ]}
      facts={[
        { value: "№ 1", label: "Poland among EU poultry meat producers" },
        { value: "21%", label: "Poland's share of poultry production in the EU" },
        { value: "63%+", label: "of export volume goes to the EU market" },
      ]}
      previewSentenceOnly
      previewMaxLength={170}
    />
  );
}
