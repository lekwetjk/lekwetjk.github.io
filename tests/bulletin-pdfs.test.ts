import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { bulletinPdfFileName, getPreparedBulletinPdf } from "../app/lib/bulletin-pdfs.ts";
import type { getMemberDocumentsBucket } from "../db/index.ts";

test("bulletin filenames map monthly and combined editions without allowing paths", () => {
  assert.equal(bulletinPdfFileName("2026-01"), "biuletyn-2026-01.pdf");
  assert.equal(bulletinPdfFileName("2026-04-05"), "biuletyn-2026-04_05.pdf");
  for (const id of ["../2026-01", "2026-01/other", "2026-00", "2026-13", "2026-04-13", "report-uuid", ""]) {
    assert.equal(bulletinPdfFileName(id), null);
  }
});

test("all built-in editions download local PDF bytes without needing private production files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bulletin-pdf-test-"));
  const previousDirectory = process.cwd();
  try {
    const directory = path.join(root, "private", "bulletins");
    await mkdir(directory, { recursive: true });
    process.chdir(root);
    for (const id of ["2026-01", "2026-02", "2026-03", "2026-04-05", "2026-06", "2026-07", "2026-08"]) {
      const expected = Buffer.from(`%PDF-fixture-${id}`);
      await writeFile(path.join(directory, bulletinPdfFileName(id)!), expected);
      const result = await getPreparedBulletinPdf(id);
      assert.ok(result, id);
      const downloaded = Buffer.from(await new Response(result.body).arrayBuffer());
      assert.deepEqual(downloaded, expected);
    }
    assert.equal(await getPreparedBulletinPdf("1900-01"), null);
  } finally {
    process.chdir(previousDirectory);
    await rm(root, { recursive: true, force: true });
  }
});

test("R2 uses private edition keys, never falls back to local files and surfaces failures", async () => {
  const runtime = globalThis as typeof globalThis & {
    env?: { MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket> };
  };
  const previous = runtime.env;
  const keys: string[] = [];
  const bucket: ReturnType<typeof getMemberDocumentsBucket> = {
    async put() {},
    async delete() {},
    async list() { return { objects: [] }; },
    async get(key) {
      keys.push(key);
      return { body: new Response("%PDF-test").body!, uploaded: new Date() };
    },
  };
  runtime.env = { MEMBER_DOCUMENTS: bucket };
  try {
    const result = await getPreparedBulletinPdf("2026-04-05");
    assert.equal(await new Response(result?.body).text(), "%PDF-test");
    assert.deepEqual(keys, ["bulletin-pdfs/biuletyn-2026-04_05.pdf"]);
    assert.equal(await getPreparedBulletinPdf("../2026-01"), null);
    assert.equal(keys.length, 1);
    bucket.get = async () => null;
    assert.equal(await getPreparedBulletinPdf("2026-01"), null);
    bucket.get = async () => { throw new Error("R2 unavailable"); };
    await assert.rejects(getPreparedBulletinPdf("2026-01"), /R2 unavailable/);
  } finally {
    runtime.env = previous;
  }
});
