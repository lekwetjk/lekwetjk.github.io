import type { Metadata } from "next";
import { HubPage } from "../../components/HubPage";

export const metadata: Metadata = {
  title: "Quality and sustainable development",
  description:
    "Quality systems, food safety, animal welfare, QAFP and sustainable development practices in the poultry sector.",
  alternates: {
    canonical: "https://krd-ig.com.pl/en/quality",
  },
};

export default function EnglishQualityPage() {
  return (
    <HubPage
      language="en"
      eyebrow="Quality and sustainable development"
      title="Safe poultry. Responsible production."
      lead="This section brings together information on the QAFP system, production safety, poultry health, product segmentation, animal welfare and respect for the environment."
      image="/media/production-worker.webp"
      imageAlt="Quality control in a production facility"
      slugs={[
        "jakosc-i-bezpieczenstwo",
        "system-qafp",
        "bezpieczna-produkcja",
        "zdrowy-drob",
        "segmentacja",
        "dobrostan-zwierzat",
        "poszanowanie-srodowiska",
      ]}
      facts={[
        { value: "Field to table", label: "safety at every stage" },
        { value: "EU", label: "high welfare and environmental standards" },
        { value: "QAFP", label: "official national food quality system" },
      ]}
    />
  );
}
