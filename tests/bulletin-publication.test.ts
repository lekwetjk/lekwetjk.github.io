import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { buildExportMapData, type ExportMapTableSelection } from "../app/lib/bulletin-export-map.ts";
import { createPreparedBulletinReport, getBulletinReportData, getBulletinPdf, listBulletinReports, updatePreparedBulletinReport } from "../app/lib/bulletin-reports.ts";
import type { PreparedBulletin } from "../app/lib/prepared-bulletin-model.ts";

const original = JSON.parse(readFileSync(new URL("../app/data/bulletins/2026-08.json", import.meta.url), "utf8")) as PreparedBulletin;
const selection: ExportMapTableSelection = {
  eu0207: "table-50", eu1602: "table-51", nonEu0207: "table-52", nonEu1602: "table-53", confirmedTitleMismatch: false,
};

function edition(id: string, month: string, period: string, mass: string) {
  return {
    ...original,
    id,
    period: `${month} 2026`,
    title: `Biuletyn informacyjny "${month}, 2026"`,
    exportMap: selection,
    tables: original.tables.map((table) => ({
      ...table,
      rows: table.rows.map((row) => row.map((cell) =>
        cell.replace("I-VII.2026 R.", period).replace("197 101 004", mass),
      )),
    })),
  };
}

test("publication persists each edition's map data and surfaces storage failures", async () => {
  const runtime = globalThis as typeof globalThis & { env?: unknown };
  const previousEnv = runtime.env;
  const previousNodeEnv = process.env.NODE_ENV;
  const database = new DatabaseSync(":memory:");
  const objects = new Map<string, Uint8Array>();
  let failInsert = false;
  let failUpdate = false;
  let failPut = false;
  let failModelPut = false;
  let concurrentUpdate = false;
  let failDelete = false;
  runtime.env = {
    DB: {
      prepare(query: string) {
        if (failInsert && /^insert into "bulletin_reports"/i.test(query)) throw new Error("database insert failed");
        if (failUpdate && /^update "bulletin_reports"/i.test(query)) throw new Error("database update failed");
        const statement = database.prepare(query);
        return {
          bind(...params: SQLInputValue[]) {
            return {
              async run() { return statement.run(...params); },
              async all() { return { results: statement.all(...params) }; },
              async raw() { return statement.all(...params).map((row) => Object.values(row)); },
            };
          },
        };
      },
    },
    MEMBER_DOCUMENTS: {
      async put(key: string, value: Uint8Array | ArrayBuffer) {
        if (failPut || (failModelPut && key.endsWith("/report.json"))) throw new Error("storage put failed");
        if (concurrentUpdate && key.includes("/revisions/") && key.endsWith("/report.json")) {
          database.prepare("UPDATE bulletin_reports SET data_key = ? WHERE slug = ?").run("concurrent-version.json", "biuletyn-informacyjny-2026-09");
        }
        objects.set(key, new Uint8Array(value));
      },
      async get(key: string) {
        const bytes = objects.get(key);
        return bytes ? { body: new Response(Uint8Array.from(bytes)).body!, uploaded: new Date() } : null;
      },
      async delete(key: string) {
        if (failDelete) throw new Error("storage delete failed");
        objects.delete(key);
      },
    },
  };
  Reflect.set(process.env, "NODE_ENV", "production");

  try {
    const publish = (bulletin: PreparedBulletin) => createPreparedBulletinReport({
      modelFile: new File([JSON.stringify(bulletin)], "model.json", { type: "application/json" }),
      createdBy: "test",
    });
    const september = await publish(edition("2026-09", "wrzesień", "I-VIII.2026 R.", "197 101 005"));
    const october = await publish(edition("2026-10", "październik", "I-IX.2026 R.", "197 101 006"));
    assert.equal((await listBulletinReports()).length, 2);
    for (const [report, period, mass] of [
      [september, "I-VIII.2026 R.", "197 101 005"],
      [october, "I-IX.2026 R.", "197 101 006"],
    ] as const) {
      const saved = (await getBulletinReportData(report))?.prepared;
      assert.ok(saved?.exportMap);
      const map = buildExportMapData(saved.tables, saved.exportMap, saved.id);
      assert.equal(map.period, period);
      assert.equal(map.countries.find((country) => country.iso3 === "DEU")?.records.cn0207?.netMassKg.text, mass);
    }

    await assert.rejects(publish(edition("2026-10", "październik", "I-IX.2026 R.", "197 101 006")), /już opublikowane/);
    const update = (model: PreparedBulletin, expectedRevision = september.dataKey, pdfFile?: File) => updatePreparedBulletinReport({
      id: september.id, expectedRevision, modelFile: new File([JSON.stringify(model)], "model.json"), pdfFile, createdBy: "editor",
    });
    const revised = edition("2026-09", "wrzesień", "I-VIII.2026 R.", "197 101 099");
    const before = new Map(objects);
    await assert.rejects(update({ ...revised, exportMap: undefined }), /przygotuj mapę/);
    await assert.rejects(update(edition("2026-10", "październik", "I-IX.2026 R.", "197 101 006")), /tego samego/);
    failPut = true;
    await assert.rejects(update(revised), /storage put failed/);
    failPut = false;
    failModelPut = true;
    await assert.rejects(update(revised, september.dataKey, new File(["PDF"], "new.pdf")), /storage put failed/);
    failModelPut = false;
    assert.deepEqual(objects, before);
    concurrentUpdate = true;
    await assert.rejects(update(revised), /zostało zmienione/);
    concurrentUpdate = false;
    assert.deepEqual(objects, before);
    assert.equal((await listBulletinReports()).find((report) => report.id === september.id)?.dataKey, "concurrent-version.json");
    database.prepare("UPDATE bulletin_reports SET data_key = ? WHERE id = ?").run(september.dataKey, september.id);
    failUpdate = true;
    await assert.rejects(update(revised, september.dataKey, new File(["PDF"], "new.pdf")), /database update failed/);
    failUpdate = false;
    assert.deepEqual(objects, before);
    assert.equal((await listBulletinReports()).find((report) => report.id === september.id)?.dataKey, september.dataKey);
    const updated = await update(revised, september.dataKey, new File(["PDF"], "new.pdf"));
    assert.equal(updated.id, september.id);
    assert.equal(updated.slug, september.slug);
    assert.equal(updated.createdAt, september.createdAt);
    assert.notEqual(updated.dataKey, september.dataKey);
    assert.deepEqual(objects.get(september.dataKey), before.get(september.dataKey));
    const backup = JSON.parse(new TextDecoder().decode(objects.get(updated.dataKey.replace("report.json", "previous.json"))));
    assert.deepEqual(backup.report, september);
    const savedUpdate = (await getBulletinReportData(updated))!.prepared!;
    assert.equal(buildExportMapData(savedUpdate.tables, savedUpdate.exportMap!, savedUpdate.id).countries.find((country) => country.iso3 === "DEU")?.records.cn0207?.netMassKg.text, "197 101 099");
    assert.equal((await getBulletinPdf(september.id))?.source.name, "new.pdf");
    const again = await update(revised, updated.dataKey);
    assert.deepEqual(again.sources, updated.sources);
    assert.ok(objects.has(updated.dataKey));
    assert.ok(objects.has(updated.sources[0].key));
    await assert.rejects(update(revised), /zostało zmienione/);
    assert.equal((await listBulletinReports()).length, 2);
    const objectCount = objects.size;
    objects.set(september.dataKey, new TextEncoder().encode("{"));
    await assert.rejects(getBulletinReportData(september), /nie są poprawnym JSON-em/);

    failInsert = true;
    await assert.rejects(publish(edition("2026-11", "listopad", "I-X.2026 R.", "197 101 007")), /database insert failed/);
    assert.equal(objects.size, objectCount);
    failDelete = true;
    await assert.rejects(publish(edition("2026-11", "listopad", "I-X.2026 R.", "197 101 007")), /ani usunąć wszystkich zapisanych plików/);

    runtime.env = {};
    await assert.rejects(listBulletinReports(), /binding `DB` is unavailable/);
  } finally {
    runtime.env = previousEnv;
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    database.close();
  }
});
