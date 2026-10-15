import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "materials", "metodyka-i-biuletyny");
const audit = JSON.parse(
  await readFile(path.join(root, "docs", "link-audit", "downloads.json"), "utf8"),
);
const records = [
  ...audit.results.filter((record) =>
    record.usedBy?.includes("/tresc/metodyka-i-biuletyny"),
  ),
  ...[
    { year: 2021, position: 36, isapId: "WDU20210000036", fileName: "D20210036.pdf" },
    { year: 2021, position: 1248, isapId: "WDU20210001248", fileName: "D20211248.pdf" },
    { year: 2022, position: 177, isapId: "WDU20220000177", fileName: "D20220177.pdf" },
  ].map(({ year, position, isapId, fileName }) => ({
    source: `https://isap.sejm.gov.pl/isap.nsf/download.xsp/${isapId}/O/${fileName}`,
    file: `https://api.sejm.gov.pl/eli/acts/DU/${year}/${position}/text.pdf`,
    fileName,
  })),
];

await mkdir(destination, { recursive: true });

async function readIfExists(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const manifestPath = path.join(destination, "manifest.json");
const previousManifest = await readIfExists(manifestPath);
const previousFiles = previousManifest ? JSON.parse(previousManifest.toString("utf8")).files : [];
const usedNames = new Set();
const manifest = [];

for (const record of records) {
  const urlName = record.fileName || decodeURIComponent(new URL(record.file).pathname.split("/").pop() || "material");
  const extension = path.extname(urlName);
  const baseName = path.basename(urlName, extension).replace(/[^a-zA-Z0-9._-]/g, "-");
  let fileName = `${baseName}${extension.toLowerCase()}`;
  let suffix = 2;
  while (usedNames.has(fileName.toLowerCase())) {
    fileName = `${baseName}-${suffix}${extension.toLowerCase()}`;
    suffix += 1;
  }
  usedNames.add(fileName.toLowerCase());

  const target = path.join(destination, fileName);
  const existingContent = await readIfExists(target);
  let content = existingContent;
  if (!content && record.target) {
    const cachedSource = path.join(root, "public", record.target.replace(/^\//, "").replaceAll("/", path.sep));
    content = await readIfExists(cachedSource);
  }
  if (!content) {
    const response = await fetch(record.file, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw new Error(`Nie udało się pobrać ${record.file}: HTTP ${response.status}`);
    }
    content = Buffer.from(await response.arrayBuffer());
  }

  const sha256 = createHash("sha256").update(content).digest("hex");
  const expectedHash = record.sha256 || previousFiles.find((entry) => entry.sourcePage === record.source)?.sha256;
  if (expectedHash && sha256 !== expectedHash) {
    throw new Error(`Suma kontrolna nie zgadza się dla ${fileName}. Istniejący plik nie został nadpisany.`);
  }
  if (extension.toLowerCase() === ".pdf" && !content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error(`Pobrany materiał nie jest plikiem PDF: ${record.file}`);
  }
  if (!existingContent) {
    await writeFile(target, content, { flag: "wx" });
  }

  manifest.push({
    fileName,
    sourcePage: record.source,
    sourceFile: record.file,
    size: content.length,
    sha256,
  });
}

await writeFile(
  manifestPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2)}\n`,
);

console.log(`Przygotowano ${manifest.length} materiałów w ${destination}`);
