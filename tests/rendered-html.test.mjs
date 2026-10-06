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
  for (const file of ["app/page.tsx", "app/aktualnosci/page.tsx"]) {
    assert.match(await readProjectFile(file), /await mergeManagedPosts\(/);
    assert.match(await readProjectFile(file), /await connection\(\)/);
  }
  const articleBody = await readProjectFile("app/components/ArticleBody.tsx");
  assert.match(articleBody, /await applyManagedPostOverrides\(/);
  assert.match(articleBody, /await connection\(\)/);
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

test("foreign trade page links the latest local export reports", async () => {
  const source = await readProjectFile("app/components/ArticleBody.tsx");
  assert.match(source, /eksport-rolno-spozywczy-2025\.pdf/);
  assert.match(source, /eksport-rolno-spozywczy-pierwsze-polrocze-2026\.pdf/);
});

test("member logos use private R2 storage with legacy D1 compatibility", async () => {
  const auth = await readProjectFile("app/lib/auth.ts");
  const logoRoute = await readProjectFile("app/api/admin/users/[id]/logo/route.ts");
  const createRoute = await readProjectFile("app/api/admin/users/create/route.ts");
  const updateRoute = await readProjectFile("app/api/admin/users/[id]/route.ts");

  assert.match(auth, /MEMBER_LOGOS_PREFIX = "member-logos\/"/);
  assert.match(auth, /getMemberDocumentsBucket\(\)\.put\(memberLogoKey\(userId\)/);
  assert.match(auth, /getMemberDocumentsBucket\(\)\.get\(memberLogoKey\(userId\)\)/);
  assert.match(auth, /bucket\.delete\(memberLogoKey\(userId\)\)/);
  assert.ok(auth.indexOf("getMemberDocumentsBucket().get(memberLogoKey(userId))") < auth.indexOf("db.select().from(memberUserLogos)"));
  assert.match(createRoute, /await saveMemberLogo\(user\.id/);
  assert.match(updateRoute, /await saveMemberLogo\(id/);
  assert.match(logoRoute, /Buffer\.from\(logo\.content, "base64"\)/);
});

test("member ticker uses active member logos with bounded administrator-controlled scaling", async () => {
  const ticker = await readProjectFile("app/components/CommissionTicker.tsx");
  const auth = await readProjectFile("app/lib/auth.ts");
  const publicLogoRoute = await readProjectFile("app/api/member-logos/[id]/route.ts");
  const editForm = await readProjectFile("app/admin/uzytkownicy/EditUserForm.tsx");
  const styles = await readProjectFile("app/globals.css");

  assert.match(ticker, /getPublicMemberBannerItems/);
  assert.doesNotMatch(ticker, /commission-banner\.json/);
  assert.match(ticker, /animationDuration: "112s"/);
  assert.match(ticker, /--member-logo-scale/);
  assert.match(auth, /user\.role === "member" && user\.isActive/);
  assert.doesNotMatch(auth, /user\.role === "admin" && user\.isActive/);
  assert.match(auth, /profiles\[user\.id\]\?\.companyName\?\.trim\(\) \|\| user\.name/);
  assert.match(publicLogoRoute, /user\.id === id && user\.role === "member" && user\.isActive/);
  assert.doesNotMatch(publicLogoRoute, /getMemberProfile/);
  assert.match(editForm, /name="logoScale" type="range" min="50" max="100"/);
  assert.match(styles, /\.commission-ticker-logo-wrap \{[\s\S]*width: 100%;[\s\S]*height: 76px;[\s\S]*overflow: hidden;/);
  assert.match(styles, /\.commission-ticker-logo \{[\s\S]*object-fit: contain;[\s\S]*object-position: center;/);
});

test("report archive is public while bulletins and PDF files remain member-only", async () => {
  const middleware = await readProjectFile("middleware.ts");
  const reportPage = await readProjectFile("app/tresc/[slug]/page.tsx");
  const articleBody = await readProjectFile("app/components/ArticleBody.tsx");
  const reports = await readProjectFile("app/components/BulletinReports.tsx");
  const bulletin = await readProjectFile("app/components/InteractiveBulletin.tsx");
  const pdfRoute = await readProjectFile("app/api/member/reports/[id]/pdf/route.ts");
  const reportStorage = await readProjectFile("app/lib/bulletin-reports.ts");
  const reportsApi = await readProjectFile("app/api/admin/reports/route.ts");
  const reportsManager = await readProjectFile("app/admin/raporty/ReportsManager.tsx");
  const chapters = await readProjectFile("app/lib/bulletin-chapters.ts");
  const documentClient = await readProjectFile("app/lib/bulletin-document-client.ts");
  const loginForm = await readProjectFile("app/login/czlonkowie/MemberLoginForm.tsx");
  const passwordForm = await readProjectFile("app/member/zmien-haslo/ChangePasswordForm.tsx");
  const profile = await readProjectFile("app/member/profil/page.tsx");
  const worker = await readProjectFile("worker/index.ts");
  assert.match(middleware, /pathname === "\/tresc\/raporty" && !request\.nextUrl\.searchParams\.get\("raport"\)/);
  assert.match(middleware, /`\$\{pathname\}\$\{request\.nextUrl\.search\}`/);
  assert.match(middleware, /pathname === "\/login\/czlonkowie"/);
  assert.match(middleware, /safeMemberRedirect\(request\.nextUrl\.searchParams\.get\("redirect"\)\)/);
  assert.match(reportPage, /if \(selectedSlug\)/);
  assert.match(reportPage, /reportBulletinHref=\{reportBulletinHref\}/);
  assert.match(articleBody, /Biuletyn informacyjny KRD-IG/);
  assert.match(articleBody, /report-material-link-featured/);
  assert.match(reports, /<span>Otwórz biuletyn<\/span>/);
  assert.doesNotMatch(bulletin, /Arkusze źródłowe|Źródła i kontrola danych|\/sources\//);
  assert.match(bulletin, /\/api\/member\/reports\/\$\{report\.id\}\/pdf/);
  assert.match(pdfRoute, /verifySessionToken/);
  assert.match(pdfRoute, /"Content-Type": "application\/pdf"/);
  assert.match(reportStorage, /from "read-excel-file\/node"/);
  assert.doesNotMatch(reportStorage, /read-excel-file\/web-worker/);
  assert.doesNotMatch(reportStorage, /JSON\.stringify\(\{ sheets, model/);
  assert.doesNotMatch(reportStorage, /function trimRows/);
  assert.match(reportStorage, /stageBulletinReportSource/);
  assert.match(reportStorage, /cancelStagedBulletinReport/);
  assert.match(reportStorage, /MAX_STAGED_SHEET_CELLS = 500_000/);
  assert.match(reportStorage, /finalizeStagedBulletinReport/);
  assert.match(reportsApi, /form\.get\("mode"\) === "stage"/);
  assert.match(reportsApi, /request\.headers\.get\("content-type"\).*application\/json/);
  assert.match(reportsApi, /input\.mode === "cancel"/);
  assert.match(reportsApi, /form\.get\("mode"\) === "prepared"/);
  assert.match(reportStorage, /createPreparedBulletinReport/);
  assert.match(reportStorage, /validatePreparedBulletin/);
  assert.doesNotMatch(reportsManager, /read-excel-file\/browser/);
  assert.match(reportsManager, /formData\.set\("mode", "prepared"\)/);
  assert.match(reportsManager, /Gotowy model JSON/);
  assert.match(documentClient, /pdfjs-dist\/build\/pdf\.worker\.min\.mjs\?url/);
  assert.match(documentClient, /word\/document\.xml/);
  assert.match(documentClient, /getElementsByTagNameNS\(WORDPROCESSING_NAMESPACE, "t"\)/);
  assert.doesNotMatch(documentClient, /paragraph\.textContent/);
  assert.equal((chapters.match(/id: "/g) ?? []).length, 20);
  assert.match(reportStorage, /Biuletyn informacyjny \"\$\{POLISH_MONTHS\[month - 1\]\}, \$\{year\}\"/);
  assert.doesNotMatch(reportStorage, /Biuletyn informacyjny[^\n]*narastająco/);
  assert.match(loginForm, /window\.location\.assign\(redirectTo\)/);
  assert.doesNotMatch(loginForm, /router\.push\(redirectTo\)/);
  assert.match(passwordForm, /window\.location\.assign\(safeMemberRedirect\(searchParams\.get\("redirect"\)\)\)/);
  await assert.rejects(readProjectFile("app/api/member/reports/[id]/sources/[sourceIndex]/route.ts"));
  assert.match(worker, /"\/tresc\/raporty"/);
  assert.ok(profile.indexOf('href="/admin/raporty"') < profile.indexOf('href="/admin/wstawienia"'));
  assert.match(profile, /href="\/tresc\/raporty">Raporty/);
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

  assert.match(sitemap, /https:\/\/krd-ig-website-concept\.lek-wet-jk\.workers\.dev/);
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

test("site shell does not render the disabled chat assistant", async () => {
  const siteChrome = await readProjectFile("app/components/SiteChrome.tsx");

  assert.doesNotMatch(siteChrome, /ChatWidget/);
});

test("disabled chat contains no page self-fetch path", async () => {
  const worker = await readProjectFile("worker/index.ts");

  assert.match(worker, /const CHAT_FEATURE_DISABLED = true as const;/);
  assert.doesNotMatch(worker, /SOURCE_SITE_BASE_URL|fetchSourceContext|fetchSiteText/);
});

test("Cloudflare Worker caches only anonymous public HTML pages", async () => {
  const worker = await readProjectFile("worker/index.ts");

  assert.match(worker, /const PUBLIC_PAGE_CACHE_SECONDS = 300;/);
  assert.match(worker, /request\.headers\.has\("cookie"\)/);
  assert.match(worker, /request\.headers\.has\("authorization"\)/);
  assert.match(worker, /\["\/api", "\/admin", "\/member", "\/login", "\/podglad-zmian", "\/tresc\/raporty"\]/);
  assert.match(worker, /if \(!cache\) \{[\s\S]*return handler\.fetch\(request, env, ctx\);/);
  assert.match(worker, /headers\.set\("x-worker-cache", "HIT"\)/);
  assert.match(worker, /headers\.set\("x-worker-cache", "MISS"\)/);
  assert.match(worker, /ctx\.waitUntil\(cache\.put\(request, cacheableResponse\.clone\(\)\)\.catch/);
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
  const marketPage = await readProjectFile("app/rynek/page.tsx");
  const hub = await readProjectFile("app/components/HubPage.tsx");

  assert.match(page, /imageAspectRatio="980 \/ 654"/);
  assert.match(breedingPage, /imageAspectRatio="480 \/ 456"/);
  assert.match(breedingPage, /imageWidth="80%"/);
  assert.match(marketPage, /image="\/media\/trendy\.jpg"/);
  assert.match(marketPage, /imageAspectRatio="740 \/ 444"/);
  assert.match(hub, /marginInline: imageWidth \? "auto" : undefined/);
});

test("food disinformation action displays its horizontal logo without cropping", async () => {
  const articleBody = await readProjectFile("app/components/ArticleBody.tsx");
  const page = await readProjectFile("app/tresc/[slug]/page.tsx");
  const styles = await readProjectFile("app/globals.css");

  assert.match(page, /\/media\/stop_dez_clear\.png/);
  assert.match(page, /"akcja-stopdezinformacjizywnosciowej"[\s\S]*"article-hero-image-logo"/);
  assert.match(page, /shouldJustifyArticleContent[\s\S]*"akcja-stopdezinformacjizywnosciowej"/);
  assert.match(articleBody, /displayParagraph === "www\.stopdezinformacjizywnosciowej\.pl"[\s\S]*href="https:\/\/stopdezinformacjizywnosciowej\.pl\/"/);
  assert.match(articleBody, /\.filter\(\(paragraph\) => paragraph !== "Dowiedz się więcej na stronie"\)/);
  assert.match(articleBody, /\[👉 stopdezinformacjizywnosciowej\.pl\]\(https:\/\/stopdezinformacjizywnosciowej\.pl\/\)/);
  assert.match(styles, /\.article-hero-grid > img\.article-hero-image-logo[\s\S]*aspect-ratio: 52 \/ 19[\s\S]*object-fit: contain/);
});

test("important link card logos keep their proportions inside stable frames", async () => {
  const styles = await readProjectFile("app/globals.css");

  assert.match(styles, /\.wazne-link-logo \{[\s\S]*width: 72px;[\s\S]*height: 64px;[\s\S]*flex: 0 0 72px;/);
  assert.match(styles, /\.wazne-link-logo img \{[\s\S]*width: calc\(100% - 12px\);[\s\S]*height: calc\(100% - 12px\);[\s\S]*margin: 0;[\s\S]*object-fit: contain;/);
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
