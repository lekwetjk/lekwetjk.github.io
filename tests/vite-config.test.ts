import test from "node:test";
import assert from "node:assert/strict";

import { getD1DatabaseConfig } from "../vite.config.ts";

test("D1 config is omitted when no database id is configured", () => {
  assert.deepEqual(getD1DatabaseConfig(undefined, "DB"), []);
  assert.deepEqual(getD1DatabaseConfig("   ", "DB"), []);
});

test("D1 config uses the provided database id and binding", () => {
  assert.deepEqual(getD1DatabaseConfig("  18db881f-ee60-458d-89cd-ff4043884971  ", "DB"), [
    {
      binding: "DB",
      database_name: "site-creator-d1",
      database_id: "18db881f-ee60-458d-89cd-ff4043884971",
    },
  ]);
});
