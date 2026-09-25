import assert from "node:assert/strict";
import { access, readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function readProjectFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("publication image fit defaults, overrides and validation work for Markdown news and tenders", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "publication-image-fit-"));
  try {
    for (const directory of ["scripts", "app/data", "content/aktualnosci", "content/zapytania-ofertowe"]) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    const script = path.join(root, "scripts/generate-content-posts.mjs");
    await writeFile(script, await readProjectFile("scripts/generate-content-posts.mjs"));
    for (const kind of ["aktualnosci", "zapytania-ofertowe"]) {
      for (const fit of ["default", "contain", "cover"]) {
        await writeFile(path.join(root, `content/${kind}/${fit}.md`), `---\ntitle: ${kind}-${fit}\ndate: 2026-09-24\nimage: /media/example.png\n${fit === "default" ? "" : `imageFit: ${fit}\n`}---\n\nExample content.`);
      }
    }
    execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" });
    const posts = JSON.parse(await readFile(path.join(root, "app/data/generated-posts.json"), "utf8"));
    assert.equal(posts.length, 6);
    for (const post of posts) {
      assert.equal(post.imageFit, post.title.endsWith("-cover") ? "cover" : "contain");
    }
    await writeFile(path.join(root, "content/aktualnosci/invalid.md"), "---\ntitle: Invalid\ndate: 2026-09-24\nimageFit: stretch\n---\n\nInvalid fit.");
    assert.throws(() => execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" }), /imageFit/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publication image fit reaches archive and article renderers and admin forms", async () => {
  for (const file of ["app/aktualnosci/page.tsx", "app/zapytania-ofertowe/page.tsx"]) {
    assert.match(await readProjectFile(file), /image, imageFit/);
  }
  for (const file of ["app/components/NewsArchive.tsx", "app/aktualnosci/[slug]/page.tsx", "app/page.tsx"]) {
    assert.match(await readProjectFile(file), /objectFit: post.imageFit/);
  }
  for (const file of ["app/admin/publikacje/PublicationForm.tsx", "app/admin/publikacje/ManagedPostsManager.tsx"]) {
    assert.match(await readProjectFile(file), /name="imageFit"/);
  }
  for (const file of ["app/api/admin/managed-posts/route.ts", "app/api/admin/managed-posts/[id]/route.ts"]) {
    assert.match(await readProjectFile(file), /form.get\("imageFit"\)/);
  }
});

test("publication editor uses consistent Markdown formatting without raw HTML tags", async () => {
  const editor = await readProjectFile("app/admin/publikacje/MarkdownEditor.tsx");
  assert.match(editor, /toggleInline\("\*\*"\)/);
  assert.match(editor, /toggleInline\("_"\)/);
  assert.match(editor, /aria-label="Rozmiar czcionki"/);
  assert.match(editor, /setFontSize/);
  assert.match(editor, /setSelectionRange/);
  assert.doesNotMatch(editor, /<\$\{tag\}>/);
  for (const file of ["app/admin/publikacje/PublicationForm.tsx", "app/admin/publikacje/ManagedPostsManager.tsx"]) {
    assert.match(await readProjectFile(file), /<MarkdownEditor/);
  }
  assert.doesNotMatch(await readProjectFile("app/admin/publikacje/PublicationForm.tsx"), /dangerouslySetInnerHTML/);
  const backend = await readProjectFile("app/lib/managed-posts.ts");
  assert.match(backend, /normalizePublicationMarkdown\(input.content\)/);
  assert.match(backend, /"\*\*\$1\*\*"/);
  const renderer = await readProjectFile("app/lib/inlineMarkdown.tsx");
  assert.match(renderer, /<em key=/);
  assert.match(renderer, /inline-text-\$\{fontSize\}/);
  const article = await readProjectFile("app/components/ArticleBody.tsx");
  assert.match(article, /uploadedAttachments/);
  assert.match(article, /aria-label="Pliki do pobrania"/);
  assert.match(await readProjectFile("app/admin/publikacje/PublicationForm.tsx"), /attachmentNames\.length.*Pliki do pobrania/);
  assert.match(await readProjectFile("app/admin/publikacje/ManagedPostsManager.tsx"), /aria-label="Obecne pliki"/);
});

test("imported campaign edits take precedence in public views and require an admin import action", async () => {
  const detail = await readProjectFile("app/aktualnosci/[slug]/page.tsx");
  assert.equal(detail.match(/resolvePublishedPost\(slug, postBySlug\(slug\)\)/g)?.length, 2);
  for (const file of ["app/page.tsx", "app/aktualnosci/page.tsx", "app/components/ArticleBody.tsx"]) {
    assert.match(await readProjectFile(file), /await applyManagedPostOverrides\(/);
    assert.match(await readProjectFile(file), /await connection\(\)/);
  }
  const archive = await readProjectFile("app/components/NewsArchive.tsx");
  assert.ok(archive.includes("[...data.posts, ...posts]"));
  const api = await readProjectFile("app/api/admin/managed-posts/route.ts");
  assert.match(api, /importExistingPost\(String\(form.get\("slug"\) \?\? ""\), session.username\)/);
  assert.ok(api.indexOf('session.role !== "admin"', api.indexOf("export async function POST")) < api.indexOf('form.get("action") === "import"'));
  const manager = await readProjectFile("app/admin/publikacje/ManagedPostsManager.tsx");
  assert.match(manager, /Włącz edycję w panelu/);
  assert.match(manager, /form.set\("action", "import"\)/);
});

test("articles omit legacy site referrals while retaining specific resource links", async () => {
  const source = await readProjectFile("app/components/ArticleBody.tsx");

  assert.doesNotMatch(source, /Zobacz materiał na obecnej stronie KRD-IG/);
  assert.doesNotMatch(source, /View the source material on the KRD-IG website/);
  assert.match(source, /Zobacz materiały techniczne Komisji Europejskiej/);
  assert.match(source, /PRZEJDŹ DO STRONY ZSRIR/);
  assert.match(source, /\{sourceLinkLabel \? \(/);
});

test("deleted imported posts stay hidden in archives and sitemap with an enabled delete action", async () => {
  const manager = await readProjectFile("app/admin/publikacje/ManagedPostsManager.tsx");
  assert.doesNotMatch(manager, /disabled=\{post.imported/);
  assert.match(manager, /window.confirm/);
  const archive = await readProjectFile("app/components/NewsArchive.tsx");
  assert.match(archive, /!data.deletedSlugs\?\.includes\(post.slug\)/);
  assert.doesNotMatch(archive, /if \(!data\?\.posts\?\.length\) return/);
  assert.match(await readProjectFile("app/api/managed-posts/route.ts"), /deletedSlugs: await listDeletedPostSlugs\(\)/);
  assert.match(await readProjectFile("app/aktualnosci/[slug]/page.tsx"), /if \(!post\) \{\s*notFound\(\)/);
  assert.match(await readProjectFile("app/sitemap.ts"), /!deletedRoutes.has\(route\)/);
  assert.match(await readProjectFile("app/sitemap.xml/route.ts"), /await sitemap\(\)/);
});

test("campaign dates recognize Polish months and fall back to linked publication metadata", async () => {
  const source = await readProjectFile("app/components/ArticleBody.tsx");
  const styles = await readProjectFile("app/proposals.css");
  assert.ok(source.includes("const datePattern = /^\\d{1,2}\\s+\\p{L}{3}\\s+\\d{4}$/iu;"));
  assert.ok(source.includes("newsPosts.find((post) => post.slug === campaignSlug)"));
  assert.ok(source.includes("date: dateByTitle.get(normalizeText(link.label.trim())) ??"));
  assert.ok(source.includes("campaignDateFormatter.format(new Date(campaignPost.date))"));
  assert.ok(source.includes('title="Data publikacji"'));
  assert.doesNotMatch(styles, /\.kampanie-date\s*\{\s*display:\s*none/);
  const data = JSON.parse(await readProjectFile("app/data/content.json"));
  for (const [slug, expectedDate] of [
    ["indyk-ma-wiele-do-dania-podsumowanie-wrzesnia-2024", "2024-10-31"],
    ["piknik-z-okazji-dnia-dziecka-na-dziedzincu-w-ogrodach-i-na-dziedzincu-kancelarii-prezesa-rady-ministrow", "2022-07-18"],
  ]) {
    assert.equal(data.posts.find((post) => post.slug === slug)?.date.slice(0, 10), expectedDate);
  }
});

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

test("sitemap includes static and dynamic site routes", async () => {
  const sitemap = await readProjectFile("app/sitemap.ts");
  const sitemapRoute = await readProjectFile("app/sitemap.xml/route.ts");

  assert.match(sitemap, /https:\/\/lekwetjk\.github\.io/);
  assert.match(sitemap, /knowledgePages\.map/);
  assert.match(sitemap, /newsPosts\.map/);
  assert.match(sitemap, /"zapytania-ofertowe"/);
  assert.match(sitemapRoute, /application\/xml/);
});

test("footer links to Dobry Drób with its logo", async () => {
  const footer = await readProjectFile("app/components/SiteChrome.tsx");

  assert.match(footer, /https:\/\/dobrydrob\.pl\//);
  assert.match(footer, /wp-content\/uploads\/2020\/07\/logo\.png/);
  assert.match(footer, /aria-label="Dobry Drób"/);
});

test("tender archive includes the contractor selection post for the national poultry image protection project", async () => {
  const source = await readProjectFile("app/lib/content.ts");

  assert.match(
    source,
    /wybor-wykonawcy-projektu-zadania-pt-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-proje-2/,
  );
  assert.match(source, /Instytut Badań Internetu i Mediów Społecznościowych sp\. z o\.o\./);
});

test("tender posts normalize the required filter tags for the archive", async () => {
  const source = await readProjectFile("app/lib/content.ts");

  assert.match(source, /normalizeTenderCategories/);
  assert.match(source, /normalizedCategories\.add\("Zapytania ofertowe"\)/);
  assert.match(source, /normalizedCategories\.add\("Wybór wykonawcy"\)/);
  assert.match(source, /normalizedCategories\.add\("Zaproszenie do składania ofert"\)/);
  assert.match(source, /normalizedCategories\.add\("Wyniki postępowania"\)/);
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

test("about hub shows its complete hero image without cropping", async () => {
  const page = await readProjectFile("app/o-izbie/page.tsx");
  const breedingPage = await readProjectFile("app/hodowla/page.tsx");
  const hub = await readProjectFile("app/components/HubPage.tsx");

  assert.match(page, /imageAspectRatio="980 \/ 654"/);
  assert.match(breedingPage, /imageAspectRatio="480 \/ 456"/);
  assert.match(breedingPage, /imageWidth="80%"/);
  assert.match(hub, /marginInline: imageWidth \? "auto" : undefined/);
});

test("food disinformation action displays its square logo without cropping", async () => {
  const page = await readProjectFile("app/tresc/[slug]/page.tsx");

  assert.match(page, /"akcja-stopdezinformacjizywnosciowej"[\s\S]*"article-hero-image-contain"/);
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
  assert.match(source, /AVEC_logo-1\.webp/);
  assert.match(source, /CLITRAVI-LOGO-1\.png/);
  assert.match(source, /LOGO-IPC-2025\.jpg/);
  assert.match(source, /Logo-WPSA\.png/);
  assert.match(source, /ELPHA-LOGO-2025\.jpg/);
  assert.doesNotMatch(source, /UECBV/);
});

test("CSV import accepts Polish header names with diacritics", async () => {
  const source = await readProjectFile("app/api/admin/users/import/route.ts");

  assert.match(source, /export function normalizeCsvHeader/);
  assert.match(source, /\[ą\]/g);
  assert.match(source, /\[ć\]/g);
  assert.match(source, /\[ł\]/g);
  assert.match(source, /\[ó\]/g);
  assert.match(source, /\[żź\]/g);
  assert.match(source, /\["haslo", "password"\]/);
});
