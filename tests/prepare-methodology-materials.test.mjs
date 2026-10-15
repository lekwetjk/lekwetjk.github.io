import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("methodology archive includes legal documents and never overwrites prepared files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "methodology-archive-"));
  const content = Buffer.from("%PDF-1.4 archive fixture");
  const sha256 = createHash("sha256").update(content).digest("hex");
  const destination = path.join(root, "materials", "metodyka-i-biuletyny");
  const script = path.join(root, "scripts", "prepare-methodology-materials.mjs");
  const mock = path.join(root, "mock-fetch.mjs");
  try {
    for (const directory of ["scripts", path.join("docs", "link-audit"), path.join("public", "media", "imported-documents")]) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    await writeFile(script, await readFile(new URL("../scripts/prepare-methodology-materials.mjs", import.meta.url)));
    await writeFile(mock, `
      globalThis.fetch = async (url) => {
        if (!/^https:\\/\\/api\\.sejm\\.gov\\.pl\\/eli\\/acts\\/DU\\/(2021\\/(36|1248)|2022\\/177)\\/text\\.pdf$/.test(url)) {
          throw new Error("Unexpected network access: " + url);
        }
        return new Response("%PDF-1.4 legal fixture", {headers: {"Content-Type": "application/pdf"}});
      };
    `);
    await writeFile(path.join(root, "public", "media", "imported-documents", "cached.pdf"), content);
    const audit = {
      results: [{
        source: "https://krd-ig.com.pl/test-material/",
        file: "https://krd-ig.com.pl/uploads/Material.pdf",
        usedBy: ["/tresc/metodyka-i-biuletyny"],
        target: "/media/imported-documents/cached.pdf",
        sha256,
      }],
    };
    await writeFile(path.join(root, "docs", "link-audit", "downloads.json"), JSON.stringify(audit));
    const run = () => execFileSync(process.execPath, ["--import", pathToFileURL(mock).href, script], { cwd: root, stdio: "pipe" });
    run();
    const manifest = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
    assert.equal(manifest.files.length, 4);
    assert.deepEqual(manifest.files.map((entry) => entry.fileName).sort(), ["D20210036.pdf", "D20211248.pdf", "D20220177.pdf", "Material.pdf"]);
    assert.equal(await readFile(path.join(destination, "Material.pdf"), "utf8"), content.toString());
    run();
    await writeFile(path.join(destination, "Material.pdf"), "%PDF-1.4 prepared by administrator");
    assert.throws(run, /Istniejący plik nie został nadpisany/);
    assert.equal(await readFile(path.join(destination, "Material.pdf"), "utf8"), "%PDF-1.4 prepared by administrator");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
