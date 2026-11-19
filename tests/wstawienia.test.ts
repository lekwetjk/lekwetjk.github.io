import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { getWstawieniaRows, saveWstawieniaRows } from "../app/lib/wstawienia.ts";

async function withDatabase(run: () => Promise<void>) {
  const runtime = globalThis as typeof globalThis & { env?: { DB?: unknown } };
  const previousEnv = runtime.env;
  const database = new DatabaseSync(":memory:");
  runtime.env = {
    DB: {
      prepare(query: string) {
        const statement = database.prepare(query);
        return {
          bind(...params: SQLInputValue[]) {
            return {
              async run() { return statement.run(...params); },
              async raw() { return statement.all(...params).map((row) => Object.values(row)); },
            };
          },
        };
      },
    },
  };
  try {
    await run();
  } finally {
    runtime.env = previousEnv;
    database.close();
  }
}

test("initial placements can be edited and saved without removing the historical footnote", async () => {
  await withDatabase(async () => {
    const rows = await getWstawieniaRows();
    const historical = rows.find((row) => row.year === "2020")!;
    assert.equal(historical.values[17], "1 103 050*");
    historical.values[0] = "123";
    await saveWstawieniaRows(rows, "test-editor");
    const saved = await getWstawieniaRows();
    assert.equal(saved.length, rows.length);
    assert.equal(saved.find((row) => row.year === "2020")?.values[0], "123");
    assert.equal(saved.find((row) => row.year === "2020")?.values[17], "1 103 050*");
    assert.equal(saved.find((row) => row.year === "2020")?.updatedBy, "test-editor");
    assert.deepEqual(await getWstawieniaRows(), saved);
  });
});

test("saving imported placements replaces derived CSV values with calculated sums and dynamics", async () => {
  await withDatabase(async () => {
    await saveWstawieniaRows([
      { year: "2090", values: Array(26).fill("50") },
      { year: "2091", values: Array(26).fill("100") },
    ], "test-editor");
    const rows = await getWstawieniaRows();
    assert.deepEqual(rows.map((row) => row.year), ["2090", "2091"]);
    assert.equal(rows[1].values[3], "300");
    assert.equal(rows[1].values[24].replace(/\s/g, ""), "1200");
    assert.equal(rows[1].values[25], "200,0%");
  });
});

test("malformed numeric annotations are rejected without changing saved placements", async () => {
  await withDatabase(async () => {
    await saveWstawieniaRows([{ year: "2090", values: Array(26).fill("100") }], "test-editor");
    const original = await getWstawieniaRows();
    for (const invalid of ["123**", "*123", "123abc"]) {
      const values = Array(26).fill("100");
      values[0] = invalid;
      await assert.rejects(saveWstawieniaRows([{ year: "2091", values }], "test-editor"), /wyłącznie cyfry/);
      assert.deepEqual(await getWstawieniaRows(), original);
    }
  });
});
