import type { Metadata } from "next";
import { HubPage } from "../components/HubPage";

export const metadata: Metadata = {
  title: "Rynek i handel",
  description:
    "Dane, raporty, eksport, rynek unijny i kierunki rozwoju polskiego sektora drobiarskiego. Aktualne informacje ekonomiczne dla branży.",
  alternates: {
    canonical: "https://krd-ig.com.pl/rynek",
  },
  keywords: [
    "rynek drobiu",
    "eksport drobiu",
    "handel drobiarski",
    "Unia Europejska",
    "raporty sektor drobiarski",
  ],
  openGraph: {
    title: "Rynek i handel | KRD-IG",
    description:
      "Analizy rynku, eksport i handel w sektorze drobiarskim — kluczowe dane i raporty dla producentów, hodowców i partnerów biznesowych.",
    url: "https://krd-ig.com.pl/rynek",
    type: "website",
  },
};

export default function MarketPage() {
  return (
    <HubPage
      eyebrow="Rynek i handel"
      title="Dane, eksport i kierunki rozwoju"
      lead="Najważniejsze informacje o skali polskiej produkcji, handlu wewnątrzunijnym, rynkach trzecich, promocji oraz ekonomicznych uwarunkowaniach sektora."
      image="/media/meat-seasoned.webp"
      imageAlt="Przyprawione mięso drobiowe"
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
        { value: "№ 1", label: "Polska wśród producentów mięsa drobiowego w UE" },
        { value: "21%", label: "udział Polski w produkcji drobiu w Unii Europejskiej" },
        { value: "63%+", label: "wolumenu eksportu trafia na rynek unijny" },
      ]}
      previewSentenceOnly
      previewMaxLength={170}
    />
  );
}
