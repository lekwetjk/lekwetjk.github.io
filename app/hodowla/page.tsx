import type { Metadata } from "next";
import { HubPage } from "../components/HubPage";

export const metadata: Metadata = {
  title: "Hodowla i ocena",
  description:
    "Księgi, rejestry, ocena wartości użytkowej i hodowlanej, metodyki oraz dokumentacja dla branży drobiarskiej w Polsce.",
  alternates: {
    canonical: "https://krd-ig.com.pl/hodowla",
  },
  keywords: [
    "hodowla drobiu",
    "ocena drobiu",
    "księgi hodowlane",
    "KRD-IG",
    "drobiarstwo",
  ],
  openGraph: {
    title: "Hodowla i ocena | KRD-IG",
    description:
      "KRD-IG wspiera hodowców i producentów w zakresie ksiąg, oceny, metodologii i standardów produkcji drobiarskiej.",
    url: "https://krd-ig.com.pl/hodowla",
    type: "website",
  },
};

export default function BreedingPage() {
  return (
    <HubPage
      eyebrow="Hodowla i ocena drobiu"
      title="Księgi, ocena i rozwój krajowej hodowli"
      lead="Dział Hodowli i Oceny Drobiu prowadzi księgi i rejestry, ocenę wartości użytkowej i hodowlanej, system danych, znakowanie oraz specjalistyczne materiały dla branży."
      image="/media/breeding-department.webp"
      imageAlt="Działalność hodowlana KRD-IG"
      slugs={[
        "dzial-hodowli-i-oceny-drobiu",
        "rejestry-i-ksiegi",
        "metodyka-i-biuletyny",
        "wstawienia",
        "cennik",
        "pierze-i-puch-certyfikacja",
        "dane-kontaktowe",
      ]}
      facts={[
        { value: "37", label: "rodów drobiu objętych księgami prowadzonymi przez Izbę" },
        { value: "od 2004", label: "Dział Hodowli i Oceny Drobiu w strukturach KRD-IG" },
        { value: "Poznań", label: "siedziba wyspecjalizowanego działu" },
      ]}
    />
  );
}
