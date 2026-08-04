import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function readProjectFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("home page includes the main KRD-IG sections and messaging", async () => {
  const page = await readProjectFile("app/page.tsx");

  assert.match(page, /Partner branży/);
  assert.match(page, /Najważniejsze obszary/);
  assert.match(page, /Aktualności/);
  assert.match(page, /Kompletna baza informacji/);
});

test("layout exposes the site metadata expected for production", async () => {
  const layout = await readProjectFile("app/layout.tsx");

  assert.match(layout, /KRD-IG \| Partner i głos polskiego sektora drobiarskiego/);
  assert.match(layout, /metadataBase/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
});

test("core routes and navigation targets exist in the project", async () => {
  const routes = [
    "o-izbie",
    "aktualnosci",
    "rynek",
    "hodowla",
    "zrownowazony-rozwoj",
    "dezinformacja",
    "baza-wiedzy",
    "czlonkostwo",
    "kontakt",
    "dokumenty",
    "zapytania-ofertowe",
  ];

  await Promise.all(
    routes.map((route) => access(new URL(`../app/${route}/page.tsx`, import.meta.url))),
  );
});

test("board and council content remains present with mailto links", async () => {
  const source = await readProjectFile("app/components/ArticleBody.tsx");

  assert.match(source, /Dariusz Goszczyński/);
  assert.match(source, /Prezes Zarządu KRD-IG/);
  assert.match(source, /Adam Sojka/);
  assert.match(source, /Tomasz Szulc/);
  assert.match(source, /Władysław Piasecki/);
  assert.match(source, /Przewodniczący Rady Izby/);
  assert.match(source, /board-email-link/);
  assert.match(source, /mailto:/);
});

test("about page renders partner organisations without the resource box", async () => {
  const source = await readProjectFile("app/components/ArticleBody.tsx");

  assert.match(source, /slug === "o-nas"/);
  assert.match(source, /partner-organisations/);
  assert.match(source, /partners\/avec\.svg/);
  assert.match(source, /partners\/uecbv\.svg/);
  assert.match(source, /partners\/clitravi\.svg/);
  assert.match(source, /partners\/ipc\.svg/);
});
