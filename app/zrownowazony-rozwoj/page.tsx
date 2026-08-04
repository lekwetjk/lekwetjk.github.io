import type { Metadata } from "next";
import { HubPage } from "../components/HubPage";

export const metadata: Metadata = {
  title: "Jakość i zrównoważony rozwój",
  description:
    "System jakości, bezpieczeństwo żywności, dobrostan zwierząt, QAFP i praktyki zrównoważonego rozwoju w branży drobiarskiej.",
  alternates: {
    canonical: "https://krd-ig.com.pl/zrownowazony-rozwoj",
  },
  keywords: [
    "jakość żywności",
    "QAFP",
    "zrównoważony rozwój",
    "dobrostan zwierząt",
    "KRD-IG",
  ],
  openGraph: {
    title: "Jakość i zrównoważony rozwój | KRD-IG",
    description:
      "Dowiedz się, jak KRD-IG wspiera bezpieczeństwo, jakość i odpowiedzialną produkcję w sektorze drobiarskim.",
    url: "https://krd-ig.com.pl/zrownowazony-rozwoj",
    type: "website",
  },
};

export default function SustainabilityPage() {
  return (
    <HubPage
      eyebrow="Jakość i zrównoważony rozwój"
      title="Bezpieczny drób. Odpowiedzialna produkcja."
      lead="W jednym dziale łączymy informacje o systemie QAFP, bezpieczeństwie produkcji, zdrowiu drobiu, segmentacji produktów, dobrostanie zwierząt oraz poszanowaniu środowiska."
      image="/media/production-worker.webp"
      imageAlt="Kontrola jakości w zakładzie produkcyjnym"
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
        { value: "od pola - do stołu", label: "bezpieczeństwo na każdym etapie" },
        { value: "UE", label: "wysokie standardy dobrostanu i ochrony środowiska" },
        { value: "QAFP", label: "oficjalny krajowy system jakości żywności" },
      ]}
    />
  );
}
