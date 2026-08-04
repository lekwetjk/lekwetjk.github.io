import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://krd-ig.com.pl";

  return {
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
          url: `${origin}/og.png`,
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
      images: [`${origin}/og.png`],
    },
  };
}

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
