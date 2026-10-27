import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";

import { buildBulletinFromDocx, readBulletinDocxParts } from "../app/lib/bulletin-docx.ts";
import { buildOcrData, readEmfText, suggestOcrTable } from "../app/lib/bulletin-ocr-model.ts";

test("DOCX extraction keeps document, chart, embedded workbook and image parts but not unrelated files", () => {
  const zip = zipSync({
    "word/document.xml": strToU8("<document/>"),
    "word/_rels/document.xml.rels": strToU8("<Relationships/>"),
    "word/charts/chart1.xml": strToU8("<chart/>"),
    "word/charts/_rels/chart1.xml.rels": strToU8("<Relationships/>"),
    "word/embeddings/source.xlsx": new Uint8Array([1, 2]),
    "word/media/image1.png": new Uint8Array([3, 4]),
    "word/media/vector.emf": new Uint8Array([5]),
    "word/media/unsafe.svg": strToU8("<svg/>"),
    "unrelated.bin": new Uint8Array([9]),
  });
  assert.deepEqual(Object.keys(readBulletinDocxParts(zip)).sort(), [
    "word/_rels/document.xml.rels", "word/charts/_rels/chart1.xml.rels", "word/charts/chart1.xml",
    "word/document.xml", "word/embeddings/source.xlsx", "word/media/image1.png", "word/media/vector.emf",
  ]);
});

test("DOCX validates file size, format and publication period before reading XML", async () => {
  assert.throws(() => readBulletinDocxParts(new Uint8Array()), /25 MB/);
  assert.throws(() => readBulletinDocxParts(new Uint8Array(25 * 1024 * 1024 + 1)), /25 MB/);
  assert.throws(() => readBulletinDocxParts(zipSync({ "not-a-docx.txt": strToU8("text") })), /brak word\/document/);
  await assert.rejects(buildBulletinFromDocx(new File(["x"], "source.doc"), "2026-09"), /DOCX/);
  await assert.rejects(buildBulletinFromDocx(new File(["x"], "source.docx"), "2026-13"), /miesiąc/);
  await assert.rejects(buildBulletinFromDocx(new File(["x"], "source.docx"), "1999-01"), /2000/);
});

test("OCR requires explicit rows and preserves Polish decimals, missing values, zeros and table text", () => {
  const data = buildOcrData({
    id: "image-1", title: "Miesięczna produkcja mięsa", section: "Produkcja mięsa drobiowego",
    text: "Miesiąc;2025;2026\nI;1 234,50;0\nII;—;310.25\nIII;;−2,5*",
    unit: "tys. ton", kind: "barChart", chart: true,
  });
  assert.deepEqual(data.chart?.series, [
    { name: "2025", values: [1234.5, null, null] },
    { name: "2026", values: [0, 310.25, -2.5] },
  ]);
  assert.deepEqual(data.chart?.categories, ["I", "II", "III"]);
  assert.equal(data.table.rows[1][1], "1 234,50");
  assert.match(data.chart?.title ?? "", /tys\. ton/);
  assert.equal(data.chart?.metric?.format, "number");
});

test("OCR percentages are converted to fractions for the viewer without changing original table text", () => {
  const data = buildOcrData({
    id: "image-2", title: "Udział eksportu", section: "Handel zagraniczny",
    text: "Miesiąc\t2026\nI\t53,3%\nII\t0", unit: "%", kind: "lineChart", chart: true,
  });
  assert.ok(Math.abs((data.chart?.series[0].values[0] ?? 0) - 0.533) < 1e-12);
  assert.equal(data.chart?.series[0].values[1], 0);
  assert.equal(data.table.rows[1][1], "53,3%");
  assert.equal(data.chart?.metric?.format, "percent");
});

test("OCR never guesses invalid numbers or silently shifts columns", () => {
  const input = {
    id: "image-3", title: "Ceny drobiu", section: "Ceny i rynek krajowy",
    text: "Miesiąc;2026\nI;3O1,5", unit: "zł/kg", kind: "barChart", chart: true,
  };
  assert.throws(() => buildOcrData(input), /Nieprawidłowa liczba/);
  assert.throws(() => buildOcrData({ ...input, text: "Miesiąc;2026\nI;2;3" }), /tyle samo kolumn/);
  assert.throws(() => buildOcrData({ ...input, unit: "" }), /jednostkę/);
  assert.throws(() => buildOcrData({ ...input, text: "Miesiąc;2026\nI;—" }), /co najmniej jedną liczbę/);
  assert.throws(() => buildOcrData({ ...input, title: "" }), /tytuł/);
  assert.throws(() => buildOcrData({ ...input, text: "x".repeat(200001) }), /zbyt długi/);
});

test("OCR can add approved prose or tables without inventing a numeric chart", () => {
  const data = buildOcrData({
    id: "image-4", title: "Informacja źródłowa", section: "Pozostałe dane",
    text: "Pierwszy wiersz tekstu\nDrugi wiersz tekstu", unit: "", kind: "barChart", chart: false,
  });

  assert.equal(data.chart, undefined);
  assert.deepEqual(data.table.rows, [["Pierwszy wiersz tekstu"], ["Drugi wiersz tekstu"]]);
});

test("OCR table suggestions use only explicit label-number rows and retain the original numbers", () => {
  assert.equal(suggestOcrTable("Kierunki eksportu\n1. Niemcy 230 611 301\n2. Francja 148 475 043\nCreated with mapchart.net"), "Kategoria;Wartość\nNiemcy;230 611 301\nFrancja;148 475 043");
  assert.equal(suggestOcrTable("Wykres bez etykiet\n100 200 300\n1. Niemcy 12"), null);
});

function emfFixture() {
  const text = "Kurczęta 4 815,04";
  const recordSize = 76 + text.length * 2;
  const bytes = new Uint8Array(88 + recordSize + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 1, true);
  view.setUint32(4, 88, true);
  view.setUint32(40, 0x464d4520, true);
  view.setUint32(88, 84, true);
  view.setUint32(92, recordSize, true);
  view.setInt32(88 + 36, 10, true);
  view.setInt32(88 + 40, 20, true);
  view.setUint32(88 + 44, text.length, true);
  view.setUint32(88 + 48, 76, true);
  [...text].forEach((character, index) => view.setUint16(88 + 76 + index * 2, character.charCodeAt(0), true));
  view.setUint32(88 + recordSize, 14, true);
  view.setUint32(92 + recordSize, 8, true);
  return bytes;
}

test("EMF reads exact vector text and rejects corrupt or textless images", () => {
  const bytes = emfFixture();
  assert.equal(readEmfText(bytes), "Kurczęta 4 815,04");
  assert.throws(() => readEmfText(new Uint8Array(10)), /Nieprawidłowy/);
  assert.throws(() => readEmfText(bytes.subarray(0, bytes.length - 20)), /Uszkodzony/);
  const empty = bytes.slice(0, 88);
  assert.throws(() => readEmfText(empty), /nie zawiera napisów/);
});
