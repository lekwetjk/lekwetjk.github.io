import type { Metadata } from "next";
import "../globals.css";

const siteUrl = "https://lekwetjk.github.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "National Poultry Council - Chamber of Commerce",
    template: "%s | National Poultry Council - Chamber of Commerce",
  },
  description:
    "Market, breeding, quality, regulation and news from the Polish poultry sector on the National Poultry Council - Chamber of Commerce website.",
  alternates: {
    canonical: "/en",
  },
  openGraph: {
    siteName: "National Poultry Council - Chamber of Commerce",
    title: "National Poultry Council - Chamber of Commerce",
    description:
      "A clear source of information on the poultry sector, market, quality standards and public affairs.",
    type: "website",
    url: "/en",
    images: [
      {
        url: "/og.png",
        width: 1730,
        height: 909,
        alt: "National Poultry Council - Chamber of Commerce",
      },
    ],
  },
};

export default function EnglishLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
