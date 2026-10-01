export type BulletinChapterId =
  | "key-facts"
  | "continents"
  | "production"
  | "price-indices"
  | "poultry-prices"
  | "export-share"
  | "meat-import"
  | "meat-export"
  | "live-import"
  | "live-export"
  | "export-geography"
  | "main-directions"
  | "species-export"
  | "hatcheries-trade"
  | "goose-chicks"
  | "breeding-chicks"
  | "turkey-placements"
  | "poultry-market"
  | "egg-market"
  | "eu-market";

export type BulletinChapterDefinition = {
  id: BulletinChapterId;
  title: string;
  aliases: string[];
  sourceRules: Array<{ workbook?: string[]; sheet?: string[] }>;
};

export const BULLETIN_CHAPTERS: BulletinChapterDefinition[] = [
  { id: "key-facts", title: "Kluczowe fakty", aliases: ["kluczowe fakty"], sourceRules: [] },
  { id: "continents", title: "Kierunki geograficzne z podziałem na kontynenty", aliases: ["kierunki geograficzne z podziałem na kontynenty"], sourceRules: [{ workbook: ["kierunki", "geograficzne"], sheet: ["arkusz2"] }] },
  { id: "production", title: "Globalna produkcja mięsa drobiowego w Polsce", aliases: ["globalna produkcja mięsa drobiowego w polsce", "produkcja mięsa drobiowego w polsce na przestrzeni lat"], sourceRules: [{ workbook: ["produkcja", "inflacja"], sheet: ["arkusz1"] }] },
  { id: "price-indices", title: "Roczne wskaźniki cen", aliases: ["roczne wskaźniki cen"], sourceRules: [{ workbook: ["produkcja", "inflacja"], sheet: ["arkusz1"] }] },
  { id: "poultry-prices", title: "Średnie ceny drobiu i wybranych elementów drobiowych w Polsce", aliases: ["średnie ceny drobiu i wybranych elementów drobiowych w polsce", "średnie ceny skupu drobiu i sprzedaży mięsa drobiowego"], sourceRules: [{ workbook: ["drob"], sheet: ["sprzedaż", "skup", "tabela"] }, { workbook: ["ceny", "skupu", "sprzedaży"] }] },
  { id: "export-share", title: "Udział eksportu w produkcji mięsa drobiowego", aliases: ["udział eksportu w produkcji mięsa drobiowego"], sourceRules: [{ workbook: ["produkcja", "inflacja"] }, { sheet: ["eksport 0207"] }] },
  { id: "meat-import", title: "Handel zagraniczny mięsem – import", aliases: ["handel zagraniczny mięsem import"], sourceRules: [{ sheet: ["import 0207"] }, { sheet: ["import 1602"] }] },
  { id: "meat-export", title: "Handel zagraniczny mięsem – eksport", aliases: ["handel zagraniczny mięsem eksport"], sourceRules: [{ sheet: ["eksport 0207"] }, { sheet: ["eksport 1602"] }] },
  { id: "live-import", title: "Handel zagraniczny żywym drobiem – import", aliases: ["handel zagraniczny żywym drobiem import"], sourceRules: [{ sheet: ["import 0105"] }] },
  { id: "live-export", title: "Handel zagraniczny żywym drobiem – eksport", aliases: ["handel zagraniczny żywym drobiem eksport"], sourceRules: [{ sheet: ["eksport 0105"] }] },
  { id: "export-geography", title: "Kierunki geograficzne – eksport mięsa i podrobów drobiowych", aliases: ["kierunki geograficzne eksport mięsa i podrobów drobiowych", "główne kierunki geograficzne export ue"], sourceRules: [{ workbook: ["kierunki", "geograficzne"], sheet: ["arkusz1"] }] },
  { id: "main-directions", title: "Przegląd głównych kierunków geograficznych", aliases: ["przegląd głównych kierunków geograficznych", "główne kierunki geograficzne export"], sourceRules: [{ workbook: ["kierunki", "exportowe"], sheet: ["arkusz1"] }] },
  { id: "species-export", title: "Eksport poszczególnych gatunków drobiu", aliases: ["eksport poszczególnych gatunków drobiu"], sourceRules: [{ workbook: ["gatunki", "drobiu"], sheet: ["tabela"] }] },
  { id: "hatcheries-trade", title: "Wylęgi i handel zagraniczny – dane GUS przekazywane do Eurostatu", aliases: ["wylęgi i handel zagraniczny dane gus przekazywane do eurostatu"], sourceRules: [{ workbook: ["eurostat", "wylegi"], sheet: ["wylęgi"] }, { workbook: ["eurostat", "wylegi"], sheet: ["handel"] }] },
  { id: "goose-chicks", title: "Eksport piskląt gęsich z Polski – kierunki wewnątrz UE", aliases: ["eksport piskląt gęsich z polski kierunki wewnątrz ue", "eksport piskląt gęsich wewnątrz ue"], sourceRules: [{ workbook: ["eurostat", "wylegi"], sheet: ["eksport", "gęsi", "intra", "ue"] }] },
  { id: "breeding-chicks", title: "Pisklęta hodowlane przyjęte do wychowu", aliases: ["pisklęta hodowlane przyjęte do wychowu", "liczba wylężonych piskląt według kierunków ich wykorzystania"], sourceRules: [{ workbook: ["eurostat", "wylegi"], sheet: ["wykorzystanie", "piskląt"] }] },
  { id: "turkey-placements", title: "Wstawienia piskląt indyczych w Polsce", aliases: ["wstawienia piskląt indyczych w polsce"], sourceRules: [{ workbook: ["eurostat", "wylegi"], sheet: ["wykorzystanie", "piskląt"] }] },
  { id: "poultry-market", title: "Rynek mięsa drobiowego", aliases: ["rynek mięsa drobiowego", "zintegrowany system rolniczej informacji rynkowej"], sourceRules: [{ workbook: ["drob"], sheet: ["sprzedaż", "skup", "tabela"] }, { workbook: ["drob"], sheet: ["skup", "drobiu", "polska"] }] },
  { id: "egg-market", title: "Rynek jaj spożywczych", aliases: ["rynek jaj spożywczych", "średnie ceny sprzedaży jaj spożywczych"], sourceRules: [{ workbook: ["jaja"], sheet: ["sprzedaż"] }, { workbook: ["jaja"], sheet: ["pakowania"] }] },
  { id: "eu-market", title: "Dane rynkowe w UE", aliases: ["dane rynkowe w ue", "komitet zarządzający ds wspólnej organizacji rynków rolnych", "monthly market prices"], sourceRules: [{ workbook: ["drob"], sheet: ["ue", "kraje", "miesięcznie"] }, { workbook: ["jaja"], sheet: ["ue", "kraje", "mc"] }] },
];

export function normalizeBulletinText(value: string) {
  return value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();
}

function includesWords(value: string, words: string[]) {
  const normalized = normalizeBulletinText(value);
  return words.every((word) => normalized.includes(normalizeBulletinText(word)));
}

export function matchingBulletinChapterIds(workbook: string, sheet: string) {
  return BULLETIN_CHAPTERS.filter((chapter) => chapter.sourceRules.some((rule) =>
    (!rule.workbook || includesWords(workbook, rule.workbook)) && (!rule.sheet || includesWords(sheet, rule.sheet))
  )).map((chapter) => chapter.id);
}

export function documentContainsBulletinChapter(documentText: string, chapter: BulletinChapterDefinition) {
  const normalizedDocument = normalizeBulletinText(documentText);
  return chapter.aliases.some((alias) => normalizedDocument.includes(normalizeBulletinText(alias)));
}

export function getMissingDocumentChapters(documentText: string) {
  return BULLETIN_CHAPTERS.filter((chapter) => !documentContainsBulletinChapter(documentText, chapter));
}

export function documentContainsBulletinValue(documentText: string, value: number) {
  const candidates = [value, value / 1_000, value / 1_000_000]
    .filter((candidate, index) => index === 0 || Math.abs(candidate) >= 10)
    .flatMap((candidate) => Number.isInteger(candidate)
      ? [String(candidate)]
      : [String(candidate), candidate.toFixed(1), candidate.toFixed(2), candidate.toFixed(3)])
    .map((candidate) => candidate.replace(/\.0+$/, ""))
    .filter((candidate) => candidate !== "0");
  return candidates.some((candidate) => {
    const characters = [...candidate];
    const pattern = characters.map((character, index) => `${character === "." ? "[.,]" : character}${index + 1 < characters.length ? "[\\s\\u00a0]*" : ""}`).join("");
    return new RegExp(`(^|[^0-9])${pattern}(?=$|[^0-9])`).test(documentText);
  });
}
