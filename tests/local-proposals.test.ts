import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { acceptedProposalIds, localProposals, materialCountLabel, parseLocalSeoDraft, parseProposalFlags, pendingProposalIds, rejectedProposalIds, reviewedProposals } from "../app/lib/local-proposals.ts";
import { cleanProposedParagraph, localContentHref, proposedPageHref } from "../app/lib/local-proposal-content.ts";

test("accepted changes are permanent and pending previews are disabled by default and in production", () => {
  for (const flags of [parseProposalFlags(undefined, true), parseProposalFlags(reviewedProposals.map(({ id }) => id).join(","), false)]) {
    for (const id of acceptedProposalIds) assert.equal(flags[id], true);
    for (const id of [...pendingProposalIds, ...rejectedProposalIds]) assert.equal(flags[id], false);
  }
  assert.equal(acceptedProposalIds.length, 11);
  assert.equal(pendingProposalIds.length, 1);
  assert.equal(parseProposalFlags(undefined, false).wstawienia, true);
  assert.equal(parseProposalFlags(undefined, false).library, true);
  assert.equal(rejectedProposalIds.length, 5);
});

test("only pending proposals remain selectable and rejected flags cannot be restored by old cookies", () => {
  assert.deepEqual(localProposals.map(({ id }) => id), pendingProposalIds);
  for (const { id } of localProposals) {
    const flags = parseProposalFlags(`${id},${rejectedProposalIds.join(",")},unknown`, true);
    assert.equal(flags[id], true);
    assert.equal(Object.values(flags).filter(Boolean).length, acceptedProposalIds.length + 1);
    for (const rejected of rejectedProposalIds) assert.equal(flags[rejected], false);
    assert.equal("unknown" in flags, false);
  }
});

test("material counts use Polish plural forms", () => {
  for (const count of [0, 5, 12, 14, 112, 437]) assert.equal(materialCountLabel(count), "materiałów");
  for (const count of [2, 4, 22, 104]) assert.equal(materialCountLabel(count), "materiały");
  assert.equal(materialCountLabel(1), "materiał");
});

test("content cleanup and local links preserve documents and unknown external destinations", () => {
  const entries = [{ source: "https://krd-ig.com.pl/promocja-drobiu/", slug: "promocja-drobiu", kind: "page" as const }];
  assert.equal(localContentHref("https://krd-ig.com.pl/promocja-drobiu/#opis", entries), "/tresc/promocja-drobiu#opis");
  for (const href of ["https://krd-ig.com.pl/wp-content/file.pdf", "https://example.com/promocja-drobiu/", "https://krd-ig.com.pl/unknown/", "mailto:test@example.com"]) assert.equal(localContentHref(href, entries), href);
  assert.equal(proposedPageHref("kontakt"), "/kontakt");
  assert.equal(localContentHref("/wp-content/uploads/2025/07/Dezinformacja-zywnosciow-ebook.pdf", []), "https://krd-ig.com.pl/wp-content/uploads/2025/07/Dezinformacja-zywnosciow-ebook.pdf");
  assert.equal(cleanProposedParagraph("70 %  produkcji \uE00A"), "70% produkcji");
});

test("SEO drafts accept only local article paths and bounded plain text", () => {
  const encode = (draft: unknown) => encodeURIComponent(JSON.stringify(draft));
  assert.equal(parseLocalSeoDraft("not-json"), null);
  assert.equal(parseLocalSeoDraft(encode({ path: "javascript:alert(1)", title: "test", description: "test" })), null);
  assert.equal(parseLocalSeoDraft(encode({ path: "/aktualnosci/test", title: 42, description: "test" })), null);
  const draft = parseLocalSeoDraft(encode({ path: "/aktualnosci/test", title: "t".repeat(150), description: "d".repeat(400) }));
  assert.equal(draft?.title.length, 100);
  assert.equal(draft?.description.length, 240);
});

test("production SEO is indexable and the draft editor remains development-only", async () => {
  const news = await readFile(new URL("../app/aktualnosci/[slug]/page.tsx", import.meta.url), "utf8");
  const admin = await readFile(new URL("../app/admin/publikacje/page.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("../app/lib/local-proposals-server.ts", import.meta.url), "utf8");
  assert.match(news, /robots: process\.env\.NODE_ENV === "development" \? \{ index: false, follow: false \} : undefined/);
  assert.doesNotMatch(admin, /showLocalSeoEditor|\/podglad-zmian\/seo/);
  assert.match(news, /const title = post\.seoTitle \|\| draft\?\.title \|\| post\.title/);
  assert.match(news, /const description = post\.seoDescription \|\| draft\?\.description \|\| post\.excerpt/);
  assert.match(server, /if \(process\.env\.NODE_ENV !== "development"\) return null/);
});

test("rejected prototype components and routes are removed", async () => {
  for (const path of ["app/components/ProposalNavigation.tsx", "app/components/ProposalMemberDirectory.tsx", "app/podglad-zmian/zdrowie/page.tsx", "app/podglad-zmian/zdrowie/HealthPrototype.tsx"]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)), { code: "ENOENT" });
  }
});