import type { PreparedBulletinChart, PreparedBulletinTable } from "./prepared-bulletin-model.ts";

export function suggestOcrTable(text: string) {
  const rows = text.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().replace(/^\d+[.)]\s*/, "").match(/^([^\d;]+?)\s+([−–+-]?(?:\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[.,]\d+)?%?)$/);
    return match && match[1].trim().length > 1 ? [[match[1].trim(), match[2]]] : [];
  });
  return rows.length >= 2 ? ["Kategoria;Wartość", ...rows.map((row) => row.join(";"))].join("\n") : null;
}

export function readEmfText(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 88 || view.getUint32(0, true) !== 1 || view.getUint32(40, true) !== 0x464d4520) throw new Error("Nieprawidłowy obraz EMF.");
  const labels: Array<{ x: number; y: number; text: string }> = [];
  for (let at = 0; at + 8 <= bytes.length;) {
    const type = view.getUint32(at, true);
    const size = view.getUint32(at + 4, true);
    if (size < 8 || at + size > bytes.length) throw new Error("Uszkodzony rekord EMF.");
    if (type === 84 && size >= 76) {
      const count = view.getUint32(at + 44, true);
      const offset = view.getUint32(at + 48, true);
      if (offset < 76 || offset + count * 2 > size) throw new Error("Nieprawidłowy tekst w obrazie EMF.");
      const text = new TextDecoder("utf-16le").decode(bytes.subarray(at + offset, at + offset + count * 2)).trim();
      if (text) labels.push({ x: view.getInt32(at + 36, true), y: view.getInt32(at + 40, true), text });
    }
    at += size;
  }
  if (!labels.length) throw new Error("EMF nie zawiera napisów wektorowych. Wyeksportuj ten obraz z Worda do PNG i wgraj go do OCR.");
  const rows = new Map<number, typeof labels>();
  for (const label of labels.sort((left, right) => left.y - right.y || left.x - right.x)) {
    const y = [...rows.keys()].find((key) => Math.abs(key - label.y) <= 3) ?? label.y;
    rows.set(y, [...(rows.get(y) ?? []), label]);
  }
  return [...rows.values()].map((row) => row.sort((left, right) => left.x - right.x).map((label) => label.text).join("\t")).join("\n");
}

function numberFromOcr(value: string, percent: boolean) {
  const raw = value.trim().replace(/[\s\u00a0\u202f]/g, "").replace(/^[−–]/, "-").replace(/\*$/, "").replace(/%$/, "");
  if (!raw || ["-", "—", "–", "…"].includes(raw)) return null;
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(raw)) throw new Error(`Nieprawidłowa liczba „${value}”. Popraw wynik OCR; użyj przecinka lub kropki dziesiętnej.`);
  const result = Number(raw.replace(",", "."));
  if (!Number.isFinite(result)) throw new Error(`Liczba poza zakresem: ${value}.`);
  return percent ? result / 100 : result;
}

export function buildOcrData(input: { text: string; title: string; unit: string; section: string; id: string; kind: string; chart: boolean }) {
  if (!input.title.trim()) throw new Error("Podaj tytuł danych odczytanych z obrazu.");
  if (input.text.length > 200000) throw new Error("Tekst OCR jest zbyt długi (limit 200 000 znaków).");
  const lines = input.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.map((line) => line.split(line.includes("\t") ? "\t" : ";").map((cell) => cell.trim()));
  if (!rows.length) throw new Error("Brak tekstu do dodania.");
  const description = "Dane odczytane z obrazu i zatwierdzone przez administratora.";
  const table: PreparedBulletinTable = { id: `ocr-table-${input.id}`, section: input.section, title: input.title.trim(), description, rows };
  let chart: PreparedBulletinChart | undefined;
  if (input.chart) {
    if (!input.unit.trim()) throw new Error("Podaj jednostkę danych wykresu.");
    const header = rows[0];
    if (rows.length < 2 || header.length < 2 || header.some((cell) => !cell) || rows.some((row) => row.length !== header.length || !row[0])) {
      throw new Error("Dla wykresu wpisz tabelę: pierwszy wiersz to „Kategoria;Nazwa serii”, kolejne to „Nazwa kategorii;Wartość”. Każdy wiersz musi mieć tyle samo kolumn. Można używać tabulatorów zamiast średników.");
    }
    const percent = input.unit.trim() === "%";
    const series = header.slice(1).map((name, index) => ({ name, values: rows.slice(1).map((row) => numberFromOcr(row[index + 1], percent)) }));
    if (series.some((item) => item.values.every((value) => value === null))) throw new Error("Każda seria wykresu musi zawierać co najmniej jedną liczbę.");
    chart = {
      id: `ocr-chart-${input.id}`, section: input.section, title: `${input.title.trim()} (${input.unit.trim()})`, description, kind: input.kind,
      categories: rows.slice(1).map((row) => row[0]), series,
      metric: { label: input.title.trim(), description, unit: input.unit.trim(), format: percent ? "percent" : "number" },
    };
  }
  return { table, chart };
}
