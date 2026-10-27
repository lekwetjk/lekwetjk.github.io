import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "private", "bulletins");
const bucket = process.env.CLOUDFLARE_MEMBER_DOCUMENTS_BUCKET?.trim() || "krd-ig-member-documents";
const files = (await readdir(directory)).filter((name) => /^biuletyn-\d{4}-(0[1-9]|1[0-2])(?:_(0[1-9]|1[0-2]))?\.pdf$/.test(name)).sort();
if (!files.length) throw new Error("Brak biuletynów PDF do przesłania.");
for (const name of files) {
  const content = await readFile(path.join(directory, name));
  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error(`Nieprawidłowy PDF: ${name}`);
}
for (const name of files) {
  const result = spawnSync(process.execPath, [
    path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
    "r2", "object", "put", `${bucket}/bulletin-pdfs/${name}`,
    "--file", path.join(directory, name), "--content-type", "application/pdf", "--remote",
  ], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Nie udało się przesłać ${name} (kod ${result.status}).`);
}
