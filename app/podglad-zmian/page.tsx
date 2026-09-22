import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocalProposals } from "../lib/local-proposals-server";
import ProposalPanel from "./ProposalPanel";

export const metadata: Metadata = { title: "Lokalny przegląd zmian", robots: { index: false, follow: false } };

export default async function ProposalPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ProposalPanel initialFlags={await getLocalProposals()} />;
}