import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { getWstawieniaRows, saveWstawieniaRows } from "../app/lib/wstawienia.ts";

async function withDatabase(run: (database: DatabaseSync) => Promise<void>) {
  const runtime = globalThis as typeof globalThis & { env?: { DB?: unknown } };
  const previousEnv = runtime.env;
  const database = new DatabaseSync(":memory:");
  runtime.env = {
    DB: {
      async batch(queries: { all(): Promise<{ results: unknown[] }> }[]) {
        database.exec("BEGIN");
        try {
          const results = [];
          for (const query of queries) results.push(await query.all());
          database.exec("COMMIT");
          return results;
        } catch (error) { database.exec("ROLLBACK"); throw error; }
      },
      prepare(query: string) {
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
  };
  try {
    await run(database);
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

test("a failed replacement rolls back removed and updated placement rows", async () => {
  await withDatabase(async database => {
    const before = await getWstawieniaRows();
    database.exec("CREATE TRIGGER reject_fixture BEFORE INSERT ON wstawienia_rows WHEN NEW.year = '2099' BEGIN SELECT RAISE(FAIL, 'fixture write failure'); END");
    await assert.rejects(saveWstawieniaRows([{ year: "2098", values: Array(26).fill("12") }, { year: "2099", values: Array(26).fill("34") }], "fixture"), /fixture write failure/);
    assert.deepEqual(await getWstawieniaRows(), before);
  });
});

test("a seed version change never replaces existing placements", async () => {
  await withDatabase(async database => {
    await saveWstawieniaRows([{ year: "2090", values: Array(26).fill("123") }], "test-editor");
    const before = database.prepare("SELECT * FROM wstawienia_rows").all();
    database.prepare("UPDATE wstawienia_metadata SET value = 'older-seed' WHERE key = 'data_version'").run();
    const errors: string[] = [];
    const originalError = console.error;
    console.error = message => errors.push(String(message));
    try { assert.equal((await getWstawieniaRows())[0].year, "2090"); }
    finally { console.error = originalError; }
    assert.deepEqual(database.prepare("SELECT * FROM wstawienia_rows").all(), before);
    assert.match(errors.join(" "), /preserved/);
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
