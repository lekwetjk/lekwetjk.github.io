import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { correctCampaignPost } from "../app/lib/campaign-posts.ts";
import type { NewsPost } from "../app/lib/content.ts";

const raw = JSON.parse(readFileSync(new URL("../app/data/content.json", import.meta.url), "utf8"));
const generated: NewsPost[] = JSON.parse(readFileSync(new URL("../app/data/generated-posts.json", import.meta.url), "utf8"));
const campaigns: NewsPost[] = raw.posts.filter((post: NewsPost) => post.categories.includes("Kampanie"));
const original = (id: number): NewsPost => campaigns.find((post) => post.id === id)!;
// Match the existing sanitizer: the helper must recreate Markdown after this.
const sanitize = (post: NewsPost): NewsPost => ({
  ...post, paragraphs: post.paragraphs.map((text) => text.replace(/\s+/g, " ").trim()),
});
const corrected = (id: number) => correctCampaignPost(sanitize(original(id)));
const body = (id: number) => corrected(id).paragraphs.join("\n\n");

test("all 26 legacy campaigns remain scoped and immutable", () => {
  assert.equal(campaigns.length, 26);
  const before = JSON.stringify(campaigns);
  for (const post of campaigns) {
    const result = correctCampaignPost(sanitize(post));
    for (const key of ["id", "slug", "date", "year", "source", "image", "categories"] as const) {
      assert.deepEqual(result[key], post[key]);
    }
    assert.ok(result.paragraphs.length);
    assert.doesNotMatch(result.excerpt, /…$|\.\.\.$/);
  }
  assert.equal(JSON.stringify(campaigns), before);
});

test("noncampaign, unknown, mismatched and managed records are untouched", () => {
  for (const post of [
    { ...original(12925), categories: ["Wydarzenia"] },
    { ...original(12925), slug: "inna-kampania" },
    { ...original(12925), id: 999 },
    { ...original(12925), managed: true },
    { ...original(12925), slug: "wybierz-twoje-wartosci", managed: true },
  ]) {
    assert.equal(correctCampaignPost(post), post);
  }
});

test("October report is a real local Markdown link, not an old download CTA", () => {
  assert.match(body(10327), /\[Raport za październik 2024 \(PDF\)\]\(\/media\/reports\/KRD-indyk_pazdziernik\.pdf\)/);
  assert.ok(existsSync(new URL("../public/media/reports/KRD-indyk_pazdziernik.pdf", import.meta.url)));
  assert.ok(!corrected(10327).links.some((link) => /^https?:.*KRD-indyk_pazdziernik/.test(link.href)));
  assert.deepEqual(corrected(10327).links.filter((link) => link.href === "/media/reports/KRD-indyk_pazdziernik.pdf"), [
    { href: "/media/reports/KRD-indyk_pazdziernik.pdf", label: "Raport za październik 2024 (PDF)", document: true },
  ]);
  assert.doesNotMatch(body(10327), /pobierz\.pdf/);
});

test("broken references are notes, not active recommendations", () => {
  const forbidden = /indykajemy\.pl|foodservice24\.pl|e-restauracja\.pl|horectrends\.pl|st8084416|Prezentacja_indyk\.pptx|KRD_Indyk_wrzesien\.pdf|POLSKI-DROB-W-OCZACH-DZIECKA|krd-test-2|https?:\/\/m\.in\b/;
  for (const post of campaigns.map((post) => correctCampaignPost(sanitize(post)))) {
    for (const link of post.links) assert.doesNotMatch(link.href, forbidden);
    for (const match of post.paragraphs.join("\n").matchAll(/https?:\/\/[^\s)]+/g)) {
      assert.doesNotMatch(match[0], forbidden);
    }
  }
  for (const id of [12815, 10327, 10323]) assert.match(body(id), /indykajemy\.pl[\s\S]*niedostępna/);
  assert.match(body(10323), /Dzień dobry TVN.*niedostępny.*404/);
  assert.match(body(10323), /e-restauracja\.pl.*parkingowej/);
  assert.match(body(10323), /Nie potwierdzono poprawnego adresu horectrends\.pl/);
  for (const id of [10327, 10323]) {
    assert.match(body(id), /\[interia\.pl\]\(https:\/\/www\.interia\.pl\/\)/);
    assert.match(body(id), /\[wp\.pl\]\(https:\/\/www\.wp\.pl\/\)/);
  }
});

test("missing attachments and eight absent media captions have explicit notices", () => {
  assert.match(body(12815), /Prezentacja.*nie jest dostępna/);
  assert.match(body(10323), /Raport za wrzesień 2024.*nie jest dostępny/);
  assert.match(body(10384), /Dwa archiwalne pliki PDF.*nie są dostępne/);
  for (const id of [10378, 10381]) {
    assert.equal(corrected(id).paragraphs.filter((text) => /Archiwalne spoty/.test(text)).length, 1);
    assert.doesNotMatch(body(id), /^(?:Spot|SPOT) (?:TV|RADIO)/m);
  }
  assert.match(body(14223), /Szymon Marciniak ambasadorem polskiego drobiu/);
  assert.match(body(14223), /Pełna treść archiwalnego materiału nie zachowała się/);
});

test("full existing leads and excerpt-only introductions are retained", () => {
  for (const id of [12829, 12815, 10325, 10361]) {
    assert.equal(corrected(id).excerpt, original(id).paragraphs[0]);
  }
  assert.match(body(14102), /W roku, w którym Polska pełniła rolę kraju partnerskiego,/);
  assert.match(body(10378), /^1 listopada ruszyła/);
  assert.match(body(10369), /^Targi ANUGA w Kolonii od lat/);
  assert.match(body(10109), /maj 2019 – kwiecień 2021/);
  assert.match(body(10109), /w Polsce, Niemczech i Czechach/);
  assert.ok(body(10109).includes(original(10109).paragraphs[0]));
  assert.match(body(10115), /styczeń 2020 – grudzień 2021/);
  assert.match(body(10115), /projektem ochrony wizerunku/);
  assert.match(body(10105), /^Przedmiotem działalności promocyjnej/);
  assert.ok(body(10105).includes(original(10105).paragraphs[0]));
});

test("lists and only real section headings survive post-sanitize corrections", () => {
  for (const id of [14102, 12815, 10327, 10323, 10364, 10115]) {
    const result = corrected(id);
    assert.ok(result.paragraphs.some((text) => /^- .+\n- /m.test(text)), String(id));
  }
  assert.ok(corrected(12815).paragraphs.includes("## Edukacja i wsparcie branży HoReCa"));
  assert.ok(corrected(10327).paragraphs.includes("## Programy telewizyjne"));
  assert.match(body(10327), /- \[Monika Molecka\]/);
  assert.doesNotMatch(body(10327), /ᴍᴏɴɪᴋᴀ/);
  assert.doesNotMatch(body(10364), /będzie miał|nastąpi|zwiększy/);
  assert.doesNotMatch(body(13472), /^(?:[1-7]|enjoy)$/m);
  assert.doesNotMatch(body(13472), /^## /m);
});

test("Wybierz groups adjacent lists without changing source or prose", () => {
  const post = generated.find((item) => item.slug === "wybierz-twoje-wartosci")!;
  const before = JSON.stringify(post);
  const result = correctCampaignPost(sanitize(post));
  const lists = result.paragraphs.filter((text) => text.startsWith("- "));
  assert.equal(lists.length, 3);
  assert.equal(lists[0].split("\n").length, 3);
  assert.equal(lists[2].split("\n").length, 3);
  assert.ok(result.paragraphs.includes("## Cele kampanii"));
  assert.equal(result.paragraphs[0], post.paragraphs[0]);
  assert.equal(result.paragraphs.at(-1), post.paragraphs.at(-1));
  assert.equal(JSON.stringify(post), before);
});

test("specific spelling, dates, fund, units and business sentences are corrected", () => {
  assert.match(corrected(12925).title, /kampanii „/);
  assert.match(body(12925), /w Korei Południowej/);
  assert.match(body(12925), /Seoul Food & Hotel w Seulu/);
  assert.doesNotMatch(body(12925), /m\.in \.|Seoulu|KoreiPołudniowej/);
  assert.match(body(12829), /Przedstawiciele polskich firm/);
  assert.match(body(12807), /Funduszu Promocji Mięsa Drobiowego\.$/);
  assert.match(body(12881), /Półwyspem Iberyjskim/);
  assert.match(body(12881), /między Europą a Ameryką/);
  assert.match(body(12881), /POLISH POULTRY, które liczyło 110 m²/);
  assert.match(body(10369), /7 850[\s\S]*300 000 m²[\s\S]*140 000/);
  assert.doesNotMatch(body(10369), /sp\.j\.|sp\. zo\.o\./);
  assert.match(body(10372), /każda z firm miała własną przestrzeń/);
  assert.equal((body(10372).match(/Funduszu Promocji Mięsa Drobiowego/gi) ?? []).length, 1);
  assert.match(corrected(10375).title, /2022.*2020/);
  assert.doesNotMatch(body(10375), /\bIFE\b/);
  assert.match(corrected(10381).title, /szerokozasięgowa/);
  assert.match(body(10367), /minimiasteczka/);
  assert.doesNotMatch(body(10367), /wydarzania/);
  assert.match(body(10361), /247 m²/);
  assert.match(body(10358), /tzw\. „/);
  assert.equal(corrected(10358).links[0].href, "https://dobrydrob.pl/");
  assert.match(body(10121), /Część z nich indywidualnie nie zdecydowałaby się/);
  assert.match(body(10105), /Chin \(w tym Hongkongu\) i Japonii/);
  assert.match(body(10105), /2020 r\..*2019 r\./);
  assert.doesNotMatch(body(10105), /Południowo-wschodniej|dwóch najważniejszych/);
});

test("integration calls helper after the final sanitizing map", () => {
  const source = readFileSync(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  const news = source.slice(source.indexOf("export const newsPosts"), source.indexOf("function normalizeTenderCategories"));
  assert.match(news, /\}\)\)\.map\(correctCampaignPost\);\s*$/);
  assert.ok(news.lastIndexOf("sanitizeNewsPost") < news.indexOf(".map(correctCampaignPost)"));
});
