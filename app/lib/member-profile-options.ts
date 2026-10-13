export const memberProfileDictionaryCategories = [
  "voivodeships",
  "businessScopes",
  "poultrySpecies",
  "assortments",
  "certifications",
  "exportPermits",
] as const;

export type MemberProfileDictionaryCategory = typeof memberProfileDictionaryCategories[number];

export type MemberProfileDictionaryOption = {
  id: string;
  category: MemberProfileDictionaryCategory;
  valuePl: string;
  valueEn: string;
  sortOrder: number;
  isActive: boolean;
};

type DefaultOption = Pick<MemberProfileDictionaryOption, "valuePl" | "valueEn">;

const option = (valuePl: string, valueEn: string): DefaultOption => ({ valuePl, valueEn });

export const memberProfileDictionaryLabels: Record<MemberProfileDictionaryCategory, string> = {
  voivodeships: "Województwa",
  businessScopes: "Zakres działalności",
  poultrySpecies: "Gatunki drobiu",
  assortments: "Asortyment",
  certifications: "Certyfikaty",
  exportPermits: "Uprawnienia eksportowe",
};

export const defaultMemberProfileDictionaries: Record<MemberProfileDictionaryCategory, DefaultOption[]> = {
  voivodeships: [
    option("kujawsko-pomorskie", "Kuyavian-Pomeranian"),
    option("lubelskie", "Lublin"),
    option("lubuskie", "Lubusz"),
    option("łódzkie", "Łódź"),
    option("małopolskie", "Lesser Poland"),
    option("mazowieckie", "Masovian"),
    option("opolskie", "Opole"),
    option("podkarpackie", "Subcarpathian"),
    option("podlaskie", "Podlaskie"),
    option("pomorskie", "Pomeranian"),
    option("śląskie", "Silesian"),
    option("świętokrzyskie", "Świętokrzyskie"),
    option("warmińsko-mazurskie", "Warmian-Masurian"),
    option("wielkopolskie", "Greater Poland"),
    option("zachodniopomorskie", "West Pomeranian"),
  ],
  businessScopes: [
    option("Ferma hodowlana", "Commercial poultry farm"),
    option("Ferma reprodukcyjna", "Breeding farm"),
    option("Ferma zarodowa", "Pedigree breeding farm"),
    option("Jednostka naukowo-badawcza", "Research institution"),
    option("Produkcja jaj spożywczych", "Table egg production"),
    option("Produkcja puchu i pierza", "Down and feather production"),
    option("Produkcja towarzysząca", "Ancillary production"),
    option("Produkcja/mieszalnia pasz", "Feed production and milling"),
    option("Przetwórstwo", "Processing"),
    option("Ubojnia", "Slaughterhouse"),
    option("Zakład wylęgowy", "Hatchery"),
    option("Inne", "Other"),
  ],
  poultrySpecies: [
    option("Kurczak", "Chicken"),
    option("Kaczka", "Duck"),
    option("Gęś", "Goose"),
    option("Indyk", "Turkey"),
    option("Perliczka", "Guinea fowl"),
    option("Inne", "Other"),
  ],
  assortments: [
    option("Świeże", "Fresh"),
    option("Mrożone", "Frozen"),
    option("Przetwory", "Processed products"),
    option("Inne", "Other"),
  ],
  certifications: [
    option("BRC", "BRC"),
    option("Halal", "Halal"),
    option("IFS", "IFS"),
    option("Kosher", "Kosher"),
    option("QAFP", "QAFP"),
    option("Red Tractor", "Red Tractor"),
    option("Inne", "Other"),
  ],
  exportPermits: [
    option("Arabia Saudyjska", "Saudi Arabia"),
    option("Białoruś", "Belarus"),
    option("Chiny", "China"),
    option("Egipt", "Egypt"),
    option("Japonia", "Japan"),
    option("Kanada", "Canada"),
    option("Korea Pd.", "South Korea"),
    option("Kuba", "Cuba"),
    option("RPA", "South Africa"),
    option("Singapur", "Singapore"),
    option("Tajwan", "Taiwan"),
    option("Ukraina", "Ukraine"),
    option("USA", "United States"),
    option("Wietnam", "Vietnam"),
    option("Inne", "Other"),
  ],
};

export const memberProfileOptions = Object.fromEntries(
  memberProfileDictionaryCategories.map((category) => [
    category,
    defaultMemberProfileDictionaries[category].map((item, sortOrder) => ({
      id: `default-${category}-${sortOrder}`,
      category,
      ...item,
      sortOrder,
      isActive: true,
    })),
  ]),
) as Record<MemberProfileDictionaryCategory, MemberProfileDictionaryOption[]>;

export const defaultExportPermits = memberProfileOptions.exportPermits.map((item) => item.valuePl);