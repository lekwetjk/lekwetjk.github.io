import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({
  stdin: {
    contents: 'export { knowledgePages, newsPosts } from "./app/lib/content.ts"; export { collectMediaReferences, addMediaUsage } from "./app/lib/media-references.ts";',
    resolveDir: root,
  },
  bundle: true, platform: "node", format: "esm", write: false,
});
const { knowledgePages, newsPosts, collectMediaReferences, addMediaUsage } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const references = new Map();
for (const page of knowledgePages) {
  addMediaUsage(references, collectMediaReferences(page), { kind: "page", label: page.title, href: `/tresc/${page.slug}` });
}
for (const post of newsPosts) {
  addMediaUsage(references, collectMediaReferences(post), { kind: "post", label: post.title, href: `/aktualnosci/${post.slug}` });
}

async function scanSource(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "data") await scanSource(file);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      addMediaUsage(references, collectMediaReferences(await fs.readFile(file, "utf8")), {
        kind: "component", label: `Element strony: ${path.relative(root, file).split(path.sep).join("/")}`, href: null,
      });
    }
  }
}
await scanSource(path.join(root, "app"));

const contentTypes = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif", ".ico": "image/x-icon",
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip", ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const tracked = execFileSync("git", ["ls-files", "-z", "--", "public"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).split("\0").filter(Boolean);
const assets = [];
for (const relative of tracked.sort()) {
  const contentType = contentTypes[path.extname(relative).toLowerCase()];
  if (!contentType) continue;
  const bytes = await fs.readFile(path.join(root, ...relative.split("/")));
  const key = `/${relative.slice("public/".length)}`;
  const id = `static:${key}`;
  assets.push({
    id, key, name: path.posix.basename(relative),
    href: key.split("/").map(segment => encodeURIComponent(segment)).join("/"),
    source: "static", contentType, size: bytes.length, uploadedAt: null, private: false, trashedAt: null,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    usages: references.get(id) ?? [],
  });
}
const destination = path.join(root, "app", "data", "media-catalog.json");
const output = `${JSON.stringify(assets, null, 2)}\n`;
let previous;
try { previous = await fs.readFile(destination, "utf8"); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (output !== previous) await fs.writeFile(destination, output);
console.log(`Media catalog: ${assets.length} existing static files; no files moved or rewritten.`);
