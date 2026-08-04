import type { Metadata } from "next";
import { HubPage } from "../components/HubPage";

export const metadata: Metadata = {
  title: "O Izbie",
  description:
    "Poznaj KRD-IG — krajową radę drobiarską reprezentującą sektor drobiarski wobec administracji, partnerów biznesowych i instytucji europejskich.",
  alternates: {
    canonical: "https://krd-ig.com.pl/o-izbie",
  },
  keywords: [
    "KRD-IG",
    "Izba Gospodarcza",
    "drobiarstwo",
    "sektor drobiarski",
    "organizacja branżowa",
  ],
  openGraph: {
    title: "O Izbie | KRD-IG",
    description:
      "KRD-IG reprezentuje polski sektor drobiarski, wspiera przedsiębiorców i rozwija relacje z administracją oraz partnerami europejskimi.",
    url: "https://krd-ig.com.pl/o-izbie",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <HubPage
      eyebrow="Krajowa Rada Drobiarstwa"
      title="Jedna organizacja. Wspólny interes branży."
      lead="KRD-IG reprezentuje sektor drobiarski wobec administracji krajowej i europejskiej, tworzy przestrzeń współpracy przedsiębiorców oraz działa na rzecz rozwoju produkcji, handlu i jakości."
      image="/media/meat-seasoned.webp"
      imageAlt="Mięso drobiowe z przyprawami i ziołami"
      slugs={[
        "o-nas",
        "zarzad-i-rada-izby",
        "komisje",
        "krd-ig-w-organizacjach-międzynarodowych",
        "czlonkowie",
        "statut",
      ]}
      facts={[
        { value: "1991", label: "początek działalności Krajowej Rady Drobiarstwa" },
        { value: "9", label: "komisji branżowych działających w ramach Izby" },
        { value: "4", label: "kluczowe organizacje międzynarodowe" },
      ]}
      hidePreviewForSlugs={["statut"]}
    />
  );
}