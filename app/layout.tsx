import type { Metadata } from "next";
import "./globals.css";
import "./proposals.css";
import { getLocalProposals } from "./lib/local-proposals-server";
import { acceptedProposalIds, pendingProposalIds } from "./lib/local-proposals";

export const dynamic = process.env.GITHUB_PAGES_BUILD === "true" ? "force-static" : "auto";

const defaultSiteUrl = "https://lekwetjk.github.io";
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

function normalizeSiteUrl(value?: string) {
  if (!value || value.length === 0) {
    return defaultSiteUrl;
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

const siteUrl = normalizeSiteUrl(envSiteUrl);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: process.env.NODE_ENV !== "development",
    follow: process.env.NODE_ENV !== "development",
  },
  title: {
    default: "KRD-IG | Partner i głos polskiego sektora drobiarskiego",
    template: "%s | KRD-IG",
  },
  description:
    "Rynek, hodowla, jakość, prawo i aktualności polskiego sektora drobiarskiego — w jednym uporządkowanym serwisie KRD-IG.",
  openGraph: {
    siteName: "KRD-IG",
    title: "KRD-IG | Partner i głos polskiego sektora drobiarskiego",
    description:
      "Rynek, hodowla, jakość i wiedza — komplet informacji KRD-IG w jednej strukturze.",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: "/og.png",
        width: 1730,
        height: 909,
        alt: "KRD-IG — partner i głos polskiego sektora drobiarskiego",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KRD-IG | Partner i głos polskiego sektora drobiarskiego",
    description: "Rynek, hodowla, jakość i wiedza w serwisie KRD-IG.",
    images: ["/og.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const proposals = await getLocalProposals();
  return (
    <html lang="pl">
      <body data-proposals={Object.entries(proposals).filter(([, enabled]) => enabled).map(([id]) => id).join(" ")}>
        {process.env.NODE_ENV === "development" ? <div className="proposal-banner"><span>Wdrożone lokalnie: {acceptedProposalIds.length} · Podgląd pozostałych: {pendingProposalIds.filter((id) => proposals[id]).length}/{pendingProposalIds.length}</span><a href="/podglad-zmian">Pozostałe decyzje</a></div> : null}
        {children}
      </body>
    </html>
  );
}
