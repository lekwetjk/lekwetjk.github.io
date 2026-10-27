import { strFromU8, unzipSync } from "fflate";

import { validatePreparedBulletin, type PreparedBulletin, type PreparedBulletinChart } from "./prepared-bulletin-model.ts";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_XML_BYTES = 50 * 1024 * 1024;
const MAX_CELLS = 500_000;
const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const SUPPORTED_CHARTS = new Set(["barChart", "bar3DChart", "lineChart", "line3DChart", "areaChart", "area3DChart", "pieChart", "pie3DChart", "doughnutChart", "scatterChart"]);

export type DocxBulletinImage = { id: string; name: string; title: string; bytes: Uint8Array; contentType: string };
export type DocxBulletinResult = { bulletin: PreparedBulletin; warnings: string[]; images: DocxBulletinImage[] };

export function readBulletinDocxParts(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("Plik DOCX musi mieć od 1 bajta do 25 MB.");
  let total = 0;
  const parts = unzipSync(bytes, {
    filter: (entry) => {
      if (!/^(word\/document\.xml|word\/_rels\/document\.xml\.rels|word\/charts\/[^/]+\.xml|word\/charts\/_rels\/[^/]+\.rels|word\/embeddings\/[^/]+\.xlsx|word\/media\/[^/]+\.(?:png|jpe?g|gif|bmp|tiff?|emf|wmf))$/i.test(entry.name)) return false;
      total += entry.originalSize;
      if (total > MAX_XML_BYTES) throw new Error("Rozpakowany dokument zawiera zbyt dużo danych XML (limit 50 MB).");
      return true;
    },
  });
  if (!parts["word/document.xml"]) throw new Error("Plik nie jest dokumentem DOCX: brak word/document.xml.");
  return parts;
}

function elements(node: Document | Element, name: string) {
  return Array.from(node.getElementsByTagNameNS("*", name));
}

function children(node: Element, name: string) {
  return Array.from(node.children).filter((child) => child.localName === name);
}

function attribute(node: Element | undefined, name: string) {
  return node ? Array.from(node.attributes).find((item) => item.localName === name)?.value : undefined;
}

function parseXml(bytes: Uint8Array, name: string) {
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error(`Niedozwolona deklaracja w pliku ${name}.`);
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (elements(xml, "parsererror").length) throw new Error(`Nieprawidłowa struktura XML: ${name}.`);
  return xml;
}

function paragraphText(node: Element) {
  return elements(node, "t").filter((text) => {
    let parent = text.parentElement;
    while (parent && parent !== node) {
      if (parent.localName === "del" || parent.localName === "Fallback") return false;
      parent = parent.parentElement;
    }
    return text.namespaceURI?.includes("wordprocessingml");
  }).map((text) => text.textContent ?? "").join("").replace(/\s+/g, " ").trim();
}

function sectionFor(text: string) {
  if (/impor|ekspor|export|handl|CN\s?0[12]/i.test(text)) return "Handel zagraniczny";
  if (/wylęg|wyl[eę]gi|piskl|hodowl|jaj|niosek|reprodukcyjn/i.test(text)) return "Wylęgi i hodowla";
  if (/\bcen\b|cen[ayę]|ceny|inflac|skup|pasz|zł|EUR|euro/i.test(text)) return "Ceny i rynek krajowy";
  if (/produkcj|ub[oó]j|uboju|pogłowi|mięs/i.test(text)) return "Produkcja mięsa drobiowego";
  return "Pozostałe dane";
}

function isUsefulTitle(text: string) {
  return text.length >= 12 && /[a-ząćęłńóśźż]/i.test(text) && !/^(?:\*|[/(*]|źródło|source|strona|opracowanie|biuletyn informacyjny|dot\.|dane z|eksport - dotyczy|wzrost o|spadek o)/i.test(text);
}

function cachedPoints(container: Element | undefined, numeric: boolean): Array<string | number | null> {
  if (!container) return [];
  const cache = elements(container, numeric ? "numCache" : "strCache")[0]
    ?? elements(container, numeric ? "numLit" : "strLit")[0]
    ?? (!numeric ? elements(container, "numCache")[0] ?? elements(container, "numLit")[0] : undefined);
  if (!cache) {
    const level = elements(container, "lvl")[0];
    if (level && !numeric) return points(level, false);
    return [];
  }
  return points(cache, numeric);
}

function points(cache: Element, numeric: boolean): Array<string | number | null> {
  const count = Number(attribute(children(cache, "ptCount")[0], "val") ?? 0);
  const entries = children(cache, "pt");
  const indexes = entries.map((entry) => Number(attribute(entry, "idx")));
  if (!Number.isInteger(count) || count < 0 || count > 10000 || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= 10000) || new Set(indexes).size !== indexes.length) {
    throw new Error("Wykres zawiera nieprawidłowe indeksy lub zbyt wiele punktów danych.");
  }
  const length = Math.max(count, ...indexes.map((index) => index + 1), 0);
  const result: Array<string | number | null> = Array.from({ length }, () => numeric ? null : "");
  entries.forEach((entry, index) => {
    const raw = children(entry, "v")[0]?.textContent?.trim() ?? "";
    if (!numeric) result[indexes[index]] = raw;
    else if (raw && !/^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|NULL!)$/.test(raw)) {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`Wykres zawiera nieprawidłową liczbę: ${raw}.`);
      result[indexes[index]] = value;
    }
  });
  return result;
}

function readChart(xml: Document, id: string, context: string): PreparedBulletinChart {
  const plot = elements(xml, "plotArea")[0];
  if (!plot) throw new Error(`Wykres ${id} nie zawiera obszaru danych.`);
  const groups = Array.from(plot.children).filter((child) => /Chart$/.test(child.localName));
  if (groups.length !== 1 || !SUPPORTED_CHARTS.has(groups[0].localName)) {
    throw new Error(`Wykres ${id} ma nieobsługiwany lub mieszany typ. Użyj wykresu słupkowego, liniowego, warstwowego, punktowego lub kołowego w DOCX.`);
  }
  const group = groups[0];
  const sourceSeries = children(group, "ser");
  const first = sourceSeries[0];
  if (!first) throw new Error(`Wykres ${id} nie zawiera serii danych.`);
  const categoryNode = children(first, "cat")[0] ?? children(first, "xVal")[0];
  const categories = cachedPoints(categoryNode, false).map((value) => String(value ?? ""));
  if (!categories.length) throw new Error(`Wykres ${id} nie ma zapisanych kategorii. Otwórz DOCX w Wordzie, odśwież wykresy i zapisz dokument.`);
  const series = sourceSeries.map((source, index) => {
    const ownCategories = cachedPoints(children(source, "cat")[0] ?? children(source, "xVal")[0], false);
    if (ownCategories.length && JSON.stringify(ownCategories.map(String)) !== JSON.stringify(categories)) {
      throw new Error(`Wykres ${id} zawiera serie o różnych kategoriach. Ujednolić osie w dokumencie źródłowym.`);
    }
    const values = cachedPoints(children(source, "val")[0] ?? children(source, "yVal")[0], true).map((value) => typeof value === "number" ? value : null);
    if (values.length > categories.length) throw new Error(`Wykres ${id} ma więcej wartości niż kategorii.`);
    while (values.length < categories.length) values.push(null);
    const tx = children(source, "tx")[0];
    const name = tx ? elements(tx, "v")[0]?.textContent?.trim() || elements(tx, "t").map((item) => item.textContent).join("").trim() : "";
    return { name: name || `Seria ${index + 1}`, values };
  });
  if (series.every((item) => item.values.every((value) => value === null))) throw new Error(`Wykres ${id}: brak danych liczbowych w DOCX. Odśwież wykres w Wordzie lub odczytaj jego obraz przez OCR.`);
  const chartTitle = elements(xml, "chart")[0];
  const titleNode = chartTitle ? children(chartTitle, "title")[0] : undefined;
  const explicitTitle = titleNode ? elements(titleNode, "t").map((item) => item.textContent).join("").trim() || elements(titleNode, "v")[0]?.textContent?.trim() || "" : "";
  const title = isUsefulTitle(explicitTitle) ? explicitTitle : context;
  if (!title) throw new Error(`Nie można ustalić tematu wykresu ${id}. Dodaj tytuł wykresu lub opis bezpośrednio przed nim w DOCX.`);
  const description = context && context !== title ? context : `Dane z dokumentu źródłowego: ${title}.`;
  const unit = `${title} ${description}`.match(/tys\.?\s*ton|mln\s*(?:szt\.?|EUR|euro)|tys\.?\s*szt\.?|zł\/kg|EUR\/100\s*kg|masa netto kg|(?:^|[\s(])kg(?=[\s).,]|$)|%/i)?.[0].trim();
  const percentFormat = elements(group, "formatCode").some((node) => node.textContent?.includes("%"));
  return {
    id, section: sectionFor(`${title} ${description}`), title, description,
    kind: group.localName, categories, series,
    ...(unit || percentFormat ? { metric: { label: title, description, unit: unit || "%", format: percentFormat ? "percent" as const : "number" as const } } : {}),
  };
}

function restoreChartCaches(chart: Document, key: string, parts: Record<string, Uint8Array>) {
  const missing = [...elements(chart, "numRef"), ...elements(chart, "strRef")].filter((ref) => !children(ref, ref.localName === "numRef" ? "numCache" : "strCache").length);
  if (!missing.length) return;
  const relKey = key.replace(/\/([^/]+)$/, "/_rels/$1.rels");
  if (!parts[relKey]) return;
  const externalId = attribute(elements(chart, "externalData")[0], "id");
  const relationship = elements(parseXml(parts[relKey], relKey), "Relationship")
    .find((rel) => rel.getAttribute("Id") === externalId && rel.getAttribute("Type")?.endsWith("/package"));
  if (!relationship || relationship.getAttribute("TargetMode") === "External") return;
  const target = relationship.getAttribute("Target") ?? "";
  if (!/^\.\.\/embeddings\/[^/]+\.xlsx$/.test(target)) throw new Error("Nieprawidłowy odnośnik do osadzonego arkusza wykresu.");
  const workbookKey = `word/${target.slice(3)}`;
  if (!parts[workbookKey]) throw new Error("Brak osadzonego arkusza Excel dla wykresu.");
  let total = 0;
  const workbook = unzipSync(parts[workbookKey], { filter: (entry) => {
    if (!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(entry.name)) return false;
    total += entry.originalSize;
    if (total > MAX_XML_BYTES) throw new Error("Osadzony arkusz Excel jest zbyt duży.");
    return true;
  } });
  if (!workbook["xl/workbook.xml"] || !workbook["xl/_rels/workbook.xml.rels"]) throw new Error("Osadzony arkusz nie zawiera struktury skoroszytu.");
  const strings = workbook["xl/sharedStrings.xml"] ? elements(parseXml(workbook["xl/sharedStrings.xml"], "napisy arkusza"), "si").map((item) => elements(item, "t").map((text) => text.textContent).join("")) : [];
  const sheets = elements(parseXml(workbook["xl/workbook.xml"], "skoroszyt"), "sheet");
  const rels = elements(parseXml(workbook["xl/_rels/workbook.xml.rels"], "relacje arkuszy"), "Relationship");
  const sheetCells = new Map<string, Map<string, string>>();
  for (const ref of missing) {
    const formula = children(ref, "f")[0]?.textContent ?? "";
    const range = formula.match(/^(?:'((?:[^']|'')+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/);
    if (!range) throw new Error(`Nieobsługiwany zakres danych wykresu: ${formula}.`);
    const sheetName = (range[1]?.replace(/''/g, "'") ?? range[2]);
    let cells = sheetCells.get(sheetName);
    if (!cells) {
      const sheet = sheets.find((item) => item.getAttribute("name") === sheetName);
      const rel = rels.find((item) => item.getAttribute("Id") === attribute(sheet, "id"));
      const sheetTarget = rel?.getAttribute("Target")?.replace(/^\/xl\//, "") ?? "";
      if (!/^worksheets\/[^/]+\.xml$/.test(sheetTarget) || !workbook[`xl/${sheetTarget}`]) throw new Error(`Brak arkusza źródłowego: ${sheetName}.`);
      cells = new Map(elements(parseXml(workbook[`xl/${sheetTarget}`], sheetName), "c").map((cell) => {
        const type = cell.getAttribute("t");
        const raw = children(cell, "v")[0]?.textContent ?? "";
        const value = type === "s" ? strings[Number(raw)] ?? "" : type === "inlineStr" ? elements(cell, "t").map((item) => item.textContent).join("") : raw;
        return [cell.getAttribute("r") ?? "", value];
      }));
      sheetCells.set(sheetName, cells);
    }
    const column = (value: string) => [...value].reduce((count, char) => count * 26 + char.charCodeAt(0) - 64, 0);
    const columnName = (value: number): string => value ? columnName(Math.floor((value - 1) / 26)) + String.fromCharCode(65 + (value - 1) % 26) : "";
    const startColumn = column(range[3]), endColumn = column(range[5] ?? range[3]);
    const startRow = Number(range[4]), endRow = Number(range[6] ?? range[4]);
    const count = (endColumn - startColumn + 1) * (endRow - startRow + 1);
    if (count < 1 || count > 10000 || startRow < 1 || endColumn < startColumn || endRow < startRow || (endColumn !== startColumn && endRow !== startRow)) throw new Error("Wykres odwołuje się do nieprawidłowego lub dwuwymiarowego zakresu.");
    const cache = chart.createElementNS(ref.namespaceURI, ref.localName === "numRef" ? "numCache" : "strCache");
    const pointCount = chart.createElementNS(ref.namespaceURI, "ptCount");
    pointCount.setAttribute("val", String(count));
    cache.appendChild(pointCount);
    let index = 0;
    for (let row = startRow; row <= endRow; row++) for (let col = startColumn; col <= endColumn; col++) {
      const raw = cells.get(`${columnName(col)}${row}`) ?? "";
      if (raw) {
        const point = chart.createElementNS(ref.namespaceURI, "pt");
        point.setAttribute("idx", String(index));
        const value = chart.createElementNS(ref.namespaceURI, "v");
        value.textContent = raw;
        point.appendChild(value);
        cache.appendChild(point);
      }
      index++;
    }
    ref.appendChild(cache);
  }
}

function relationshipPath(target: string, type: "chart" | "image") {
  if (/^[a-z]+:|[\\?#]/i.test(target)) throw new Error("Odnośnik wykresu nie wskazuje na część dokumentu DOCX.");
  const parts = (target.startsWith("/") ? target.slice(1) : `word/${target}`).split("/");
  const path: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (!path.length) throw new Error("Odnośnik wykresu wychodzi poza dokument DOCX.");
      path.pop();
    } else if (part && part !== ".") path.push(part);
  }
  const result = path.join("/");
  if (!(type === "chart" ? /^word\/charts\/[^/]+\.xml$/ : /^word\/media\/[^/]+$/).test(result)) throw new Error("Nieprawidłowa ścieżka danych w dokumencie DOCX.");
  return result;
}

export async function buildBulletinFromDocx(file: File, period: string): Promise<DocxBulletinResult> {
  if (!/\.docx$/i.test(file.name)) throw new Error("Wybierz dokument w formacie DOCX.");
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error("Wybierz niepusty plik DOCX o rozmiarze do 25 MB.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("Wybierz miesiąc i rok wydania.");
  const year = Number(period.slice(0, 4));
  if (year < 2000 || year > 2100) throw new Error("Rok wydania musi być w zakresie 2000–2100.");
  const month = Number(period.slice(5, 7));
  const parts = readBulletinDocxParts(new Uint8Array(await file.arrayBuffer()));
  const document = parseXml(parts["word/document.xml"], "word/document.xml");
  const relationships = new Map<string, string>();
  const imageRelationships = new Map<string, string>();
  const rels = parts["word/_rels/document.xml.rels"];
  if (rels) for (const rel of elements(parseXml(rels, "relacje dokumentu"), "Relationship")) {
    const type = rel.getAttribute("Type");
    if (type?.endsWith("/image") && rel.getAttribute("TargetMode") !== "External") {
      imageRelationships.set(rel.getAttribute("Id") ?? "", relationshipPath(rel.getAttribute("Target") ?? "", "image"));
    }
    if (!type?.endsWith("/chart")) continue;
    if (rel.getAttribute("TargetMode") === "External") throw new Error("DOCX zawiera wykres odwołujący się do zewnętrznego pliku.");
    relationships.set(rel.getAttribute("Id") ?? "", relationshipPath(rel.getAttribute("Target") ?? "", "chart"));
  }
  const body = elements(document, "body")[0];
  if (!body) throw new Error("DOCX nie zawiera treści dokumentu.");
  const charts: PreparedBulletin["charts"] = [];
  const tables: PreparedBulletin["tables"] = [];
  const warnings: string[] = [];
  let context = "";
  let paragraphs = 0;
  let numericCells = 0;
  let cells = 0;
  const images: DocxBulletinImage[] = [];
  const imageKeys = new Set<string>();
  const walk = (node: Element) => {
    if (node.localName === "p") {
      paragraphs++;
      const text = paragraphText(node);
      if (isUsefulTitle(text)) context = text.slice(0, 500);
      let failedChart = false;
      for (const ref of elements(node, "chart")) {
        const key = relationships.get(attribute(ref, "id") ?? "");
        if (!key || !parts[key]) throw new Error("Brak powiązanego pliku danych wykresu w DOCX.");
        const chartXml = parseXml(parts[key], key);
        try {
          restoreChartCaches(chartXml, key, parts);
          const chart = readChart(chartXml, `chart-${charts.length + 1}`, context);
          cells += chart.categories.length * chart.series.length;
          charts.push(chart);
        } catch (error) {
          failedChart = true;
          warnings.push(`${context || key}: ${error instanceof Error ? error.message : "Nie udało się odczytać danych wykresu."} Uzupełnij dane przez OCR obrazu lub ręcznie przed publikacją.`);
        }
      }
      for (const image of [...elements(node, "blip"), ...elements(node, "imagedata")]) {
        let parent = image.parentElement;
        let fallback = false;
        while (parent && parent !== node) {
          if (parent.localName === "Fallback" && parent.parentElement && children(parent.parentElement, "Choice").length) fallback = true;
          parent = parent.parentElement;
        }
        if (fallback && !failedChart) continue;
        const key = imageRelationships.get(attribute(image, "embed") ?? attribute(image, "id") ?? "");
        if (!key || imageKeys.has(key)) continue;
        if (!parts[key]) throw new Error(`Brak osadzonego obrazu ${key} lub nieobsługiwany format obrazu. Użyj PNG, JPEG, BMP, GIF, TIFF lub EMF.`);
        imageKeys.add(key);
        const extension = key.split(".").pop()?.toLowerCase();
        const contentType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "emf" ? "image/emf" : extension === "wmf" ? "image/wmf" : `image/${extension === "tif" ? "tiff" : extension}`;
        images.push({ id: `image-${images.length + 1}`, name: key.split("/").pop() ?? key, title: context || `Obraz ${images.length + 1}`, bytes: parts[key], contentType });
      }
    } else if (node.localName === "tbl") {
      const rows = children(node, "tr").map((row) => {
        const values: string[] = [];
        for (const cell of children(row, "tc")) {
          const text = children(cell, "p").map(paragraphText).filter(Boolean).join(" ");
          const span = Number(attribute(elements(cell, "gridSpan")[0], "val") ?? 1);
          if (!Number.isInteger(span) || span < 1 || span > 100) throw new Error("Tabela zawiera nieprawidłowe scalone komórki.");
          values.push(text, ...Array.from({ length: span - 1 }, () => ""));
        }
        return values;
      });
      if (rows.some((row) => row.some(Boolean))) {
        const title = context || rows[0].filter(Boolean).join(" — ").slice(0, 300) || `Tabela ${tables.length + 1}`;
        tables.push({ id: `table-${tables.length + 1}`, section: sectionFor(title), title, description: `Zestawienie z dokumentu źródłowego: ${title}.`, rows });
        cells += rows.reduce((sum, row) => sum + row.length, 0);
        numericCells += rows.flat().filter((value) => /^[−–-]?\d[\d\s.,%]*\*?$/.test(value.trim())).length;
      }
      for (const child of Array.from(node.children)) walk(child);
      return;
    } else {
      for (const child of Array.from(node.children)) walk(child);
    }
    if (cells > MAX_CELLS || charts.length > 500 || tables.length > 2000 || paragraphs > 60000) throw new Error("Dokument przekracza limit danych (500 000 komórek, 500 wykresów lub 2000 tabel).");
  };
  walk(body);
  if (!charts.length && !images.length) throw new Error("DOCX nie zawiera wykresów ani obrazów do odczytu OCR.");
  if (!tables.length && !images.length) throw new Error("DOCX nie zawiera tabel ani obrazów do odczytu OCR.");
  const sections = [...new Set([...charts, ...tables].map((item) => item.section))];
  const bulletin: PreparedBulletin = {
    id: period, period: `${MONTHS[month - 1]} ${year}`,
    title: `Biuletyn informacyjny "${MONTHS[month - 1]}, ${year}"`,
    sections, charts, tables, stats: { paragraphs, charts: charts.length, tables: tables.length, numericCells },
  };
  if (charts.length && tables.length) validatePreparedBulletin(bulletin);
  return {
    bulletin, images,
    warnings: [
      "Przed publikacją sprawdź okres wydania, tytuły, jednostki i zgodność danych w podglądzie z dokumentem źródłowym.",
      ...warnings,
      ...(images.length ? [`Dokument zawiera ${images.length} obrazów do sprawdzenia. Użyj OCR, popraw odczyt i dodaj zatwierdzone dane do biuletynu; logo i elementy dekoracyjne możesz pominąć.`] : []),
    ],
  };
}
