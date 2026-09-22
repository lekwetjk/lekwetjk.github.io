import { cookies } from "next/headers";
import { parseLocalSeoDraft, parseProposalFlags, PROPOSAL_COOKIE, PROPOSAL_SEO_COOKIE } from "./local-proposals";

export async function getLocalProposals() {
  const enabled = process.env.NODE_ENV === "development";
  const value = enabled ? (await cookies()).get(PROPOSAL_COOKIE)?.value : undefined;
  return parseProposalFlags(value, enabled);
}

export async function getLocalSeoDraft(path: string) {
  if (process.env.NODE_ENV !== "development") return null;
  const draft = parseLocalSeoDraft((await cookies()).get(PROPOSAL_SEO_COOKIE)?.value);
  return draft?.path === path ? draft : null;
}