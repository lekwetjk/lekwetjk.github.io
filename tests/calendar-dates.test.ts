import assert from "node:assert/strict";
import test from "node:test";

import { formatPolishDate, getMonthDays, parseIsoDate, parsePolishDate, warsawDayBoundary } from "../app/lib/calendar-dates.ts";

test("Polish date display round-trips ISO query values", () => {
  assert.equal(formatPolishDate("2026-10-16"), "16.10.2026");
  assert.equal(parsePolishDate("16.10.2026"), "2026-10-16");
  assert.equal(formatPolishDate("2024-02-29"), "29.02.2024");
  assert.equal(parsePolishDate("29.02.2024"), "2024-02-29");
  assert.equal(formatPolishDate(""), "");
});

test("invalid calendar dates and non-Polish display formats are rejected", () => {
  for (const value of ["31.02.2026", "29.02.2026", "31.04.2026", "16.13.2026", "16.00.2026", "00.10.2026", "16.10.0000", "10/16/2026", "2026-10-16", ""]) {
    assert.equal(parsePolishDate(value), null, value);
  }
  for (const value of ["2026-02-31", "2026-13-01", "invalid"]) {
    assert.equal(parseIsoDate(value), null, value);
  }
});

test("calendar weeks start on Monday and include leap days", () => {
  const october = getMonthDays(parseIsoDate("2026-10-16")!);
  assert.deepEqual(october.slice(0, 4), [null, null, null, "2026-10-01"]);
  assert.equal(october.filter(Boolean).length, 31);
  assert.equal(october.length % 7, 0);
  const february = getMonthDays(parseIsoDate("2024-02-01")!);
  assert.equal(february.filter(Boolean).length, 29);
  assert.ok(february.includes("2024-02-29"));
});

test("Warsaw date boundaries account for summer, winter and daylight saving transitions", () => {
  assert.equal(warsawDayBoundary("2026-10-16"), "2026-10-15T22:00:00.000Z");
  assert.equal(warsawDayBoundary("2026-01-16"), "2026-01-15T23:00:00.000Z");
  assert.equal(warsawDayBoundary("2026-03-29"), "2026-03-28T23:00:00.000Z");
  assert.equal(warsawDayBoundary("2026-03-29", true), "2026-03-29T22:00:00.000Z");
  assert.equal(warsawDayBoundary("2026-10-25"), "2026-10-24T22:00:00.000Z");
  assert.equal(warsawDayBoundary("2026-10-25", true), "2026-10-25T23:00:00.000Z");
  assert.throws(() => warsawDayBoundary("2026-02-31"), /Nieprawidłowa data/);
});
