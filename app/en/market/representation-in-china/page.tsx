import type { Metadata } from "next";
import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";

export const metadata: Metadata = {
  title: "Representation in China",
  description:
    "The Polish poultry sector representation in Shanghai and the development of poultry exports to China.",
  alternates: {
    canonical: "https://krd-ig.com.pl/en/market/representation-in-china",
  },
};

export default function EnglishRepresentationInChinaPage() {
  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">Market and trade</p>
            <h1>Representation in China</h1>
            <p className="article-lead article-lead-full">
              Representation of the Polish poultry sector in Shanghai. Opened on 23
              September 2016, it was the first facility of this kind in China.
            </p>
          </div>
          <img
            src="https://krd-ig.com.pl/wp-content/uploads/2024/09/waving-chinese-flag.webp"
            alt="Chinese flag"
          />
        </div>
      </section>
      <ArticleBody
        paragraphs={[
          "Representation of the Polish poultry sector in Shanghai",
          "Opened on 23 September 2016, the representation of the Polish poultry sector in Shanghai was the first facility of this kind in China. The project is coordinated by KRD-IG, which has been involved in promoting Polish poultry in Asia for many years.",
          "In 2016, Poland was the only European poultry exporter authorised to sell on the Chinese market. In 2015, the value of Polish poultry product exports to China exceeded PLN 105 million. Strengthening cooperation through a permanent representation could increase this value to as much as PLN 2 billion.",
          "Mission of the representation",
          "Close cooperation with Chinese poultry buyers, including importers, retail chains and the HoReCa sector, as well as with public opinion leaders and government administration, in order to increase Polish poultry meat exports to China.",
          "Main tasks of the representation",
          "Building relationships between Polish poultry producers and Chinese companies and government institutions.",
          "Strengthening existing relationships in this area.",
          "Collecting and analysing market data.",
          "Organising participation in trade fairs and business missions, both in China and internationally.",
          "Supporting specific businesses in activities related to poultry exports to China.",
          "Further promotion of Polish and European poultry in China.",
          "History of Polish poultry in China",
          "The representation of the Polish poultry sector in Shanghai is the culmination of many different initiatives developing cooperation between Poland and China in poultry exports. Successive governments had been trying to open the Chinese market to Polish poultry meat since 2005. KRD-IG took part in all discussions between the parties and joint initiatives undertaken in 2016.",
          "Below we present an exporter guide for poultry meat to the Chinese market.",
        ]}
        links={[]}
        source="https://krd-ig.com.pl/przedstawicielstwo-w-chinach/"
        slug="przedstawicielstwo-w-chinach"
        language="en"
      />
    </PageShell>
  );
}
