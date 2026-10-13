import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import {
  createMemberProfileDictionaryOption,
  getMemberProfileDictionaries,
  updateMemberProfileDictionaryOption,
} from "../app/lib/member-profile-dictionaries.ts";
import { memberProfileDictionaryCategories } from "../app/lib/member-profile-options.ts";

test("member profile dictionaries are bilingual and administrator-managed", async () => {
  const runtime = globalThis as typeof globalThis & { env?: { DB?: unknown } };
  const previousEnv = runtime.env;
  const database = new DatabaseSync(":memory:");
  let maximumBoundParameters = 0;
  database.exec("CREATE TABLE member_export_permit_options (name TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  database.exec("INSERT INTO member_export_permit_options (name) VALUES ('Nowy rynek')");
  runtime.env = {
    DB: {
      prepare(query: string) {
        const statement = database.prepare(query);
        return {
          bind(...params: SQLInputValue[]) {
            maximumBoundParameters = Math.max(maximumBoundParameters, params.length);
            if (params.length > 100) throw new Error("D1 parameter limit exceeded");
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
    const initial = await getMemberProfileDictionaries();
    for (const category of memberProfileDictionaryCategories) {
      assert.ok(initial[category].length > 0, `${category} should be seeded`);
      assert.ok(initial[category].every((item) => item.valuePl && item.valueEn));
    }
    assert.equal(initial.exportPermits.find((item) => item.valuePl === "Arabia Saudyjska")?.valueEn, "Saudi Arabia");
    assert.equal(initial.exportPermits.find((item) => item.valuePl === "Nowy rynek")?.valueEn, "Nowy rynek");
    assert.ok(maximumBoundParameters <= 100);

    const created = await createMemberProfileDictionaryOption({
      category: "poultrySpecies",
      valuePl: "Przepiórka",
      valueEn: "Quail",
      sortOrder: 2,
    });
    assert.equal(created.valueEn, "Quail");
    await assert.rejects(
      createMemberProfileDictionaryOption({
        category: "poultrySpecies",
        valuePl: "Przepiórka",
        valueEn: "Quail",
      }),
      /już istnieje/,
    );

    const updated = await updateMemberProfileDictionaryOption(created.id, {
      category: "poultrySpecies",
      valuePl: "Przepiórka",
      valueEn: "Common quail",
      sortOrder: 3,
      isActive: false,
    });
    assert.equal(updated.valueEn, "Common quail");
    assert.equal(updated.sortOrder, 3);
    assert.equal(updated.isActive, false);
    assert.equal((await getMemberProfileDictionaries()).poultrySpecies.some((item) => item.id === created.id), false);
    assert.equal((await getMemberProfileDictionaries(true)).poultrySpecies.find((item) => item.id === created.id)?.isActive, false);
  } finally {
    runtime.env = previousEnv;
    database.close();
  }
});
