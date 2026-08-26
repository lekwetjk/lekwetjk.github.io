export type AboutSection = {
  slug: string;
  title: string;
  teaser: string;
};

export const aboutSections: AboutSection[] = [
  {
    slug: "our-organisation",
    title: "Our organisation",
    teaser:
      "The history, mission, role and international partnerships of the National Poultry Council - Chamber of Commerce, including AVEC, ELPHA, WPSA, CLITRAVI and IPC.",
  },
  {
    slug: "board-and-council",
    title: "Board and Council",
    teaser:
      "The chamber's governing bodies, their members and their responsibilities.",
  },
  {
    slug: "commissions",
    title: "Commissions",
    teaser:
      "Nine specialist commissions covering production, quality, safety, policy and development.",
  },
  {
    slug: "members",
    title: "Members",
    teaser:
      "Companies and institutions representing the full Polish poultry value chain.",
  },
  {
    slug: "statute",
    title: "Statute",
    teaser:
      "The legal framework defining the chamber's structure, powers and operation.",
  },
];

export function aboutSectionHref(slug: string) {
  return `/en/about/${slug}`;
}
