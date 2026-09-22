import { readFile, writeFile, mkdir, rename, unlink, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const report = JSON.parse(await readFile(resolve(root, "docs/link-audit/rendered-links.json"), "utf8"));
const maxBytes = 25 * 1024 * 1024;
const directory = resolve(root, "public/media/imported-documents");
await mkdir(directory, { recursive: true });
const candidates = report.results.filter((entry) => ["file", "attachment", "not-in-source-audit"].includes(entry.kind));
for (const entry of candidates) {
  if (entry.file) continue;
  if (/\.[a-z0-9]{2,5}$/i.test(new URL(entry.source).pathname)) { entry.file = entry.source; continue; }
  const slug = new URL(entry.source).pathname.split("/").filter(Boolean).pop();
  try {
    const response = await fetch(`https://krd-ig.com.pl/wp-json/wp/v2/media?slug=${encodeURIComponent(slug)}&_fields=source_url`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
    const media = await response.json();
    if (media.length === 1 && media[0].source_url) entry.file = media[0].source_url;
  } catch (error) { entry.error = error.message; }
}
const queue = [...new Set(candidates.map((entry) => entry.file).filter(Boolean))];
const downloads = new Map();
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const source = queue.shift();
    const extension = extname(new URL(source).pathname).toLowerCase();
    const name = `${createHash("sha256").update(source).digest("hex").slice(0, 24)}${extension}`;
    const target = resolve(directory, name);
    const temporary = `${target}.part`;
    try {
      if (!/^\.[a-z0-9]{2,5}$/.test(extension) || [".html", ".htm", ".php", ".js"].includes(extension)) throw new Error("Unsupported file extension");
      let size = 0;
      let digest;
      try {
        const existing = await readFile(target);
        size = existing.length;
        digest = createHash("sha256").update(existing).digest("hex");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        const response = await fetch(source, { signal: AbortSignal.timeout(90000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!new Set(["krd-ig.com.pl", "www.krd-ig.com.pl"]).has(new URL(response.url).hostname)) throw new Error("Unexpected download host");
        if (/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new Error("HTML response instead of file");
        if (Number(response.headers.get("content-length")) > maxBytes) {
          await response.body.cancel();
          throw new Error("Exceeds 25 MiB hosting asset limit");
        }
        const hash = createHash("sha256");
        let firstChunk = true;
        const check = new Transform({ transform(chunk, encoding, callback) {
          size += chunk.length;
          if (size > maxBytes) return callback(new Error("Exceeds 25 MiB hosting asset limit"));
          if (firstChunk && extension === ".pdf" && !chunk.subarray(0, 1024).includes(Buffer.from("%PDF-"))) return callback(new Error("Invalid PDF signature"));
          firstChunk = false;
          hash.update(chunk);
          callback(null, chunk);
        } });
        await pipeline(Readable.fromWeb(response.body), check, createWriteStream(temporary, { flags: "wx" }));
        if (!size) throw new Error("Empty file");
        digest = hash.digest("hex");
        await rename(temporary, target);
      }
      if (!size || size > maxBytes || (await stat(target)).size !== size) throw new Error("Invalid local file size");
      downloads.set(source, { source, target: `/media/imported-documents/${name}`, size, sha256: digest });
    } catch (error) {
      await unlink(temporary).catch(() => {});
      downloads.set(source, { source, error: error.message });
    }
  }
}));
const results = candidates.map((entry) => ({ usedBy: entry.usedBy, file: entry.file, ...(downloads.get(entry.file) ?? { error: entry.error ?? "No source file resolved" }), source: entry.source }));
const manifest = Object.fromEntries(results.filter((entry) => !entry.error).flatMap((entry) => [[entry.source, { target: entry.target, size: entry.size, sha256: entry.sha256 }], [entry.file, { target: entry.target, size: entry.size, sha256: entry.sha256 }]]));
await writeFile(resolve(root, "app/data/local-link-assets.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(root, "docs/link-audit/downloads.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
const failures = results.filter((entry) => entry.error);
console.log(JSON.stringify({ verifiedFiles: [...downloads.values()].filter((entry) => !entry.error).length, bytes: [...downloads.values()].reduce((sum, entry) => sum + (entry.size ?? 0), 0), failedLinks: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;