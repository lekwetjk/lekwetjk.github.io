import type { Metadata } from "next";
import { HubPage } from "../components/HubPage";

export const metadata: Metadata = {
  title: "Dezinformacja",
  description:
    "Materiały KRD-IG pomagają rozpoznawać dezinformację i rozumieć mechanizmy przekazu dotyczącego żywności, drobiarstwa i bezpieczeństwa.",
  alternates: {
    canonical: "https://krd-ig.com.pl/dezinformacja",
  },
  keywords: [
    "dezinformacja żywnościowa",
    "fakty i mity",
    "żywność",
    "KRD-IG",
    "drobiarstwo",
  ],
  openGraph: {
    title: "Dezinformacja | KRD-IG",
    description:
      "Sprawdzone materiały, analizy i wskazówki KRD-IG o tym, jak rozpoznać dezinformację w branży żywnościowej.",
    url: "https://krd-ig.com.pl/dezinformacja",
    type: "website",
  },
};

export default function DisinformationPage() {
  return (
    <HubPage
      eyebrow="Rzetelnie o żywności"
      title="Dezinformacja to nie opinia"
      lead="Materiały KRD-IG wyjaśniają mechanizmy dezinformacji żywnościowej, pokazują studia przypadków i dostarczają praktycznych narzędzi do sprawdzania faktów."
      image="/media/poultry-promotion.jpg"
      imageAlt="Biały kurczak w gospodarstwie"
      slugs={[
        "dezinformacja-zywnosciowa",
        "akcja-stopdezinformacjizywnosciowej",
        "e-book-o-dezinformacji-zywnosciowej",
        "studium-przypadku-biale-wlokna",
      ]}
    />
  );
}
