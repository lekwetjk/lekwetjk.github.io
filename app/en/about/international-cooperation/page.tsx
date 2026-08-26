import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";
import { pageBySlug } from "../../../lib/content";

export default function EnglishInternationalCooperationPage() {
  const sourcePage = pageBySlug("krd-ig-w-organizacjach-miedzynarodowych");

  if (!sourcePage) {
    return null;
  }

  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">About the chamber</p>
            <h1>National Poultry Council in International Organisations</h1>
            <p className="article-lead article-lead-full">
              The National Poultry Council - Chamber of Commerce represents the
              Polish poultry sector through its membership in international
              organisations and industry associations.
            </p>
          </div>
        </div>
      </section>

      <ArticleBody
        paragraphs={[
          "European Association of Poultry Meat Producers, Importers and Exporters",
          "Since 2005, KRD-IG has represented the Polish poultry sector in AVEC (Association of Poultry Processors and Poultry Trade in the EU), the European Association of Poultry Meat Producers, Importers and Exporters.",
          "AVEC is a voluntary non-profit association operating since 1966. It has been based in Brussels since January 2005. Its role is to represent the interests and needs of the European poultry sector. AVEC currently includes national organisations from 17 European Union countries: Austria, Belgium, the Czech Republic, Denmark, Finland, France, Spain, the Netherlands, Germany, Poland, Portugal, Romania, Slovenia, Sweden, Hungary, the United Kingdom and Italy. Its main objective is to develop common solutions to issues affecting the entire European poultry market and strengthen its competitiveness.",
          "European Association of Live Poultry and Poultry Hatching Eggs",
          "Since 2015, KRD-IG has been a member of ELPHA (European Live Poultry and Poultry Hatching Egg Association).",
          "ELPHA was established in 2015 during a congress attended by pan-European and national organisations involved in poultry farming. It was created to provide a stronger form of representation for the sector's shared interests and to facilitate cooperation with institutions such as the European Commission and the European Parliament. ELPHA focuses on poultry trade within the European Union, poultry exports, animal health and welfare, and genetic issues relating to poultry breeds and varieties. It also promotes production safety and food quality.",
          "World's Poultry Science Association",
          "Since 2008, KRD-IG has been the Polish representative of WPSA (World's Poultry Science Association).",
          "WPSA dates back to 1912. In 1928, the association began publishing the first major scientific journal devoted to poultry science, the World's Poultry Science Journal. Today, WPSA has members and representatives in 80 countries worldwide. Its main objective is to develop and enrich knowledge about poultry in every aspect. WPSA organises numerous national and international scientific congresses and conferences. It is a non-profit organisation whose activities are financed by sponsors from the poultry sector.",
          "European Association of Meat and Poultry Processors",
          "Since 2012, KRD-IG has been a member of CLITRAVI (Liaison Centre for the Meat Processing Industry in the European Union), the European organisation of meat and poultry processors.",
          "CLITRAVI is an industry organisation operating since 1958. Its main objective is to represent and defend the interests of European meat producers in legislative matters. CLITRAVI maintains continuous dialogue with the European Commission, the European Parliament, the Council of the European Union, the European Economic and Social Committee and the European Food Safety Authority. It also engages with other international organisations that may influence the European market.",
          "International Poultry Council",
          "Since 2018, KRD-IG has been a member of IPC (International Poultry Council).",
          "IPC was established in 2005 and is headquartered in the state of Georgia, USA.",
          "It represents more than 95% of global poultry trade and more than 90% of poultry production. IPC's mission is to strengthen communication across the global poultry industry. It develops and recommends policies that influence the industry, promote best practices and build trust in poultry products as a preferred source of animal protein.",
        ]}
        links={sourcePage.links}
        source="https://krd-ig.com.pl/krd-ig-w-organizacjach-miedzynarodowych/"
        language="en"
      />
    </PageShell>
  );
}
