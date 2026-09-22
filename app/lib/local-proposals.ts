export const PROPOSAL_COOKIE = "krd_pending_proposals_v2";
export const PROPOSAL_SEO_COOKIE = "krd_local_seo";

export type LocalSeoDraft = { path: string; title: string; description: string };

export function parseLocalSeoDraft(value?: string): LocalSeoDraft | null {
  try {
    const draft = JSON.parse(decodeURIComponent(value ?? ""));
    if (!draft || typeof draft.path !== "string" || !/^\/(aktualnosci|tresc)\/[a-z0-9-]+$/.test(draft.path)) return null;
    if (typeof draft.title !== "string" || typeof draft.description !== "string") return null;
    return { path: draft.path, title: draft.title.trim().slice(0, 100), description: draft.description.trim().slice(0, 240) };
  } catch { return null; }
}

export const reviewedProposals = [
  { id: "compact-header", group: "Nawigacja", title: "Mniejsze nagłówki działów", href: "/rynek", detail: "Katalog tematów bliżej początku strony, statystyki poniżej katalogu." },
  { id: "compact-cards", group: "Nawigacja", title: "Mniejsze kafelki", href: "/rynek", detail: "Zwarty katalog bez dużych numerów i pustych odstępów." },
  { id: "dropdown", group: "Nawigacja", title: "Rozwijane menu", href: "/rynek", detail: "Podstrony dostępne myszką, klawiaturą i na telefonie." },
  { id: "library", group: "Nawigacja", title: "Uporządkowana Baza wiedzy", href: "/baza-wiedzy", detail: "Katalog bez kopii kontaktu, archiwów i polityk oraz bez usuniętych podstron prawnych." },
  { id: "summaries", group: "Treść", title: "Redagowane opisy i leady", href: "/rynek", detail: "Krótkie opisy zamiast automatycznych wycinków tekstu; ukrycie zbędnych leadów." },
  { id: "typography", group: "Treść", title: "Czytelniejsza typografia", href: "/tresc/zarzad-i-rada-izby", detail: "Szerokość tekstu, odstępy, listy i kontakty bez nadmiernych podkreśleń." },
  { id: "text-cleanup", group: "Treść", title: "Porządki w treści", href: "/tresc/segmentacja", detail: "Powtórzone nagłówki, spacje przed procentami i artefakty importu; formatowanie polityk i QAFP." },
  { id: "images", group: "Treść", title: "Grafiki bez przycinania", href: "/tresc/dolacz-do-nas", detail: "Pełne grafiki nagłówków i właściwa okładka e-booka z istniejącego źródła." },
  { id: "campaigns", group: "Treść", title: "Kampanie bez dat publikacji", href: "/tresc/kampanie", detail: "Jednolity wykaz kampanii bez niepełnych dat po prawej stronie." },
  { id: "links", group: "Treść", title: "Lokalne linki i wspólne archiwa", href: "/tresc/promocja-drobiu", detail: "Akceptacja warunkowa: wymagane lokalne strony, wpisy i pliki KRD-IG. Brakuje 15 oryginalnych załączników (404). Obecny podgląd nie obejmuje pełnej migracji." },
  { id: "contacts", group: "Treść", title: "Jeden widok kontaktu", href: "/tresc/kontakt", detail: "Kontakt z Bazy wiedzy otwiera aktualny widok kontaktów. Telefony i adres administratora wymagają potwierdzenia." },
  { id: "wstawienia", group: "Treść", title: "Wstawienia: lata w kolumnach", href: "/tresc/wstawienia", detail: "Lata w kolumnach; osobne tła wierszy kwartałów i dynamiki. Bez modyfikacji danych i sposobu ich zapisu." },
  { id: "counts", group: "Treść", title: "Poprawna odmiana liczby materiałów", href: "/", detail: "Materiał, materiały albo materiałów zależnie od liczby." },
  { id: "seo", group: "SEO", title: "Indywidualne SEO publikacji", href: "/admin/publikacje", detail: "Tytuł i opis SEO zapisywane przy poście lub zapytaniu ofertowym w panelu administratora." },
  { id: "directory", group: "Nowe funkcje", title: "Prototyp katalogu członków", href: "/tresc/czlonkowie", detail: "Wyszukiwanie, filtry, profile i mapa na jawnie demonstracyjnych danych. Nie zastępuje zatwierdzonego wykazu." },
  { id: "health", group: "Nowe funkcje", title: "Prototyp HPAI / ND / ograniczeń", href: "/podglad-zmian/zdrowie", detail: "Oddzielne zestawienia, filtrowanie i status źródła; bez fikcyjnych komunikatów epidemiologicznych." },
  { id: "verification", group: "Treść", title: "Status weryfikacji danych", href: "/tresc/kraje-trzecie", detail: "Ostrzeżenia przy danych wymagających przeglądu; nie oznaczamy ich jako aktualne." },
] as const;

export type ProposalId = typeof reviewedProposals[number]["id"];
export type ProposalFlags = Record<ProposalId, boolean>;

export const acceptedProposalIds: readonly ProposalId[] = ["compact-header", "compact-cards", "summaries", "typography", "text-cleanup", "images", "contacts", "counts", "seo", "library", "wstawienia"];
export const pendingProposalIds: readonly ProposalId[] = ["links"];
export const rejectedProposalIds: readonly ProposalId[] = ["dropdown", "directory", "health", "verification", "campaigns"];
export const localProposals = reviewedProposals.filter(({ id }) => pendingProposalIds.includes(id));

export function parseProposalFlags(value: string | undefined, enabled: boolean): ProposalFlags {
  const selected = new Set(enabled ? (value ?? "").split(",") : []);
  return Object.fromEntries(reviewedProposals.map(({ id }) => [id, acceptedProposalIds.includes(id) || (pendingProposalIds.includes(id) && selected.has(id))])) as ProposalFlags;
}

export function materialCountLabel(count: number) {
  if (count === 1) return "materiał";
  const lastTwo = count % 100;
  return count % 10 >= 2 && count % 10 <= 4 && (lastTwo < 12 || lastTwo > 14) ? "materiały" : "materiałów";
}