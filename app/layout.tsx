import type { Metadata } from "next";
import "./globals.css";

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
    index: true,
    follow: true,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
