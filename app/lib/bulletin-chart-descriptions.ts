import { getDisplayedBulletinSeries, type PreparedBulletinChart } from "./prepared-bulletin-model.ts";

type ChartDescription = { title: string; description: string };

const descriptions = {
  monthlyProduction: {
    title: "Miesięczna produkcja mięsa drobiowego w Polsce (tys. ton)",
    description: "Porównanie produkcji w kolejnych miesiącach w zakładach zatrudniających powyżej 50 osób.",
  },
  annualProduction: {
    title: "Produkcja mięsa drobiowego w Polsce według lat (tys. ton)",
    description: "Wielkość produkcji w zakładach zatrudniających co najmniej 50 osób; ostatni okres zgodnie z osią wykresu.",
  },
  totalProduction: {
    title: "Globalna produkcja mięsa drobiowego w Polsce (tys. ton)",
    description: "Produkcja w zakładach zatrudniających co najmniej 10 osób, w porównaniu wieloletnim.",
  },
  inflation: {
    title: "Inflacja w Polsce — roczne wskaźniki cen (%)",
    description: "Zmiana cen towarów i usług konsumpcyjnych według GUS; zakres lat zgodnie z osią wykresu.",
  },
  carcassPrice: {
    title: "Średnie ceny sprzedaży tuszki kurczaka 65% (zł/kg)",
    description: "Porównanie średnich cen sprzedaży tuszki kurczaka według MRiRW w kolejnych latach i dostępnym okresie bieżącym.",
  },
  annualExportShare: {
    title: "Udział eksportu w produkcji mięsa drobiowego według lat",
    description: "Część produkcji przeznaczona na eksport mięsa i przetworów z drobiu oraz część pozostała.",
  },
  productionAndExport: {
    title: "Produkcja i eksport mięsa drobiowego według lat (tys. ton)",
    description: "Porównanie produkcji zakładów zatrudniających powyżej 50 osób z eksportem mięsa i przetworów z drobiu.",
  },
  exportAndImport: {
    title: "Eksport i import mięsa i przetworów z drobiu (tys. ton)",
    description: "Porównanie wielkości wywozu i przywozu w kolejnych latach, na podstawie danych GUS i IAS.",
  },
  monthlyExportShare: {
    title: "Miesięczny udział eksportu w produkcji mięsa drobiowego",
    description: "Relacja eksportu mięsa i przetworów z drobiu do produkcji zakładów zatrudniających co najmniej 50 osób.",
  },
  meatImport: {
    title: "Miesięczny import mięsa i przetworów z drobiu (kg)",
    description: "Masa netto mięsa i podrobów jadalnych (CN 0207) oraz przetworów z drobiu (CN 1602), wraz z sumą.",
  },
  meatExport: {
    title: "Miesięczny eksport mięsa i przetworów z drobiu (kg)",
    description: "Masa netto mięsa i podrobów jadalnych (CN 0207) oraz przetworów z drobiu (CN 1602), wraz z sumą.",
  },
  previousMeatExport: {
    title: "Miesięczny eksport mięsa i przetworów z drobiu — porównanie historyczne (kg)",
    description: "Dodatkowe porównanie miesięcznej masy netto eksportu; lata i dostępne okresy wskazują serie wykresu.",
  },
  liveImport: {
    title: "Miesięczny import żywego drobiu (kg)",
    description: "Masa netto przywożonego żywego drobiu w kolejnych miesiącach, z porównaniem lat i sumą.",
  },
  liveExport: {
    title: "Miesięczny eksport żywego drobiu (kg)",
    description: "Masa netto wywożonego żywego drobiu w kolejnych miesiącach, z porównaniem lat i sumą.",
  },
  countryMass: {
    title: "Kierunki eksportu mięsa drobiowego — udział krajów w masie",
    description: "Udział poszczególnych krajów odbiorców w masie netto eksportu mięsa i podrobów z drobiu (CN 0207).",
  },
  countryValue: {
    title: "Kierunki eksportu mięsa drobiowego — udział krajów w wartości",
    description: "Udział poszczególnych krajów odbiorców w wartości eksportu mięsa i podrobów z drobiu (CN 0207), liczonej w EUR.",
  },
  euMeat: {
    title: "Eksport mięsa i podrobów z drobiu do krajów UE (kg)",
    description: "Porównanie masy netto eksportu produktów CN 0207 do wskazanych krajów Unii Europejskiej.",
  },
  euPreparations: {
    title: "Eksport przetworów z drobiu do krajów UE (kg)",
    description: "Porównanie masy netto eksportu przetworów z drobiu (CN 1602) do wskazanych krajów Unii Europejskiej.",
  },
  nonEuMeat: {
    title: "Eksport mięsa i podrobów z drobiu poza UE (kg)",
    description: "Porównanie masy netto eksportu produktów CN 0207 do wskazanych krajów spoza Unii Europejskiej.",
  },
  nonEuPreparations: {
    title: "Eksport przetworów z drobiu poza UE (kg)",
    description: "Porównanie masy netto eksportu przetworów z drobiu (CN 1602) do wskazanych krajów spoza Unii Europejskiej.",
  },
  meatMarkets: {
    title: "Eksport mięsa i podrobów z drobiu — UE a pozostałe kraje (kg)",
    description: "Zestawienie masy netto eksportu produktów CN 0207 na rynek unijny i pozaunijny w okresach wskazanych na wykresie.",
  },
  preparationMarkets: {
    title: "Eksport przetworów z drobiu — UE a pozostałe kraje (kg)",
    description: "Zestawienie masy netto eksportu przetworów z drobiu (CN 1602) na rynek unijny i pozaunijny.",
  },
  species: {
    title: "Eksport mięsa i podrobów według gatunków drobiu (kg)",
    description: "Porównanie masy netto eksportu produktów CN 0207 według gatunków, m.in. kurcząt, indyków, kaczek i gęsi.",
  },
  weeklyPrice: {
    title: "Tygodniowe ceny skupu kurcząt w Polsce (zł/kg)",
    description: "Średnie ceny skupu kurcząt w zakładach drobiarskich, porównane według tygodni i lat.",
  },
} satisfies Record<string, ChartDescription>;

type ChartTopic = keyof typeof descriptions;

export function describePreparedCharts(editionId: string, charts: PreparedBulletinChart[]) {
  const earlyEdition = editionId === "2026-01" || editionId === "2026-02";
  const topics: ChartTopic[] = [
    "monthlyProduction", "annualProduction", "totalProduction", "inflation",
    ...(!earlyEdition ? ["inflation" as const] : []),
    "carcassPrice", "annualExportShare", "productionAndExport", "exportAndImport", "monthlyExportShare",
    "meatImport", "meatExport", "previousMeatExport", "liveImport", "liveExport", "countryMass", "countryValue",
    ...(!earlyEdition && editionId !== "2026-03" ? ["countryMass" as const, "countryValue" as const] : []),
    "euMeat", "euPreparations", "nonEuMeat", "nonEuPreparations", "meatMarkets", "preparationMarkets", "species",
    ...(earlyEdition ? ["weeklyPrice" as const] : []),
  ];
  if (topics.length !== charts.length) throw new Error(`Niekompletne opisy wykresów wydania ${editionId}.`);
  return charts.map((chart, index) => {
    if (chart.id !== `chart-${index + 1}`) throw new Error(`Nieznany identyfikator wykresu ${chart.id} w wydaniu ${editionId}.`);
    const topic = topics[index];
    const presentation = descriptions[topic];
    const period = /W OKRESIE\s+([IVX]+(?:-[IVX]+)?\.\d{4})/i.exec(chart.title)?.[1];
    const years = [...new Set([...chart.categories, ...getDisplayedBulletinSeries(chart).map((series) => series.name)]
      .flatMap((label) => {
        const match = /^(?:[IVX]+(?:[-–][IVX]+)?\.\s*)?((?:19|20)\d{2})\*?$/.exec(label.trim());
        return match ? [match[1]] : [];
      }))].sort();
    const range = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0];
    const periodLabel = period ?? range;
    return {
      ...chart,
      ...presentation,
      title: periodLabel ? `${presentation.title} — ${periodLabel}` : presentation.title,
    };
  });
}
