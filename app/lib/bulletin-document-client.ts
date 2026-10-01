import { strFromU8, unzipSync } from "fflate";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_DOCUMENT_TEXT_LENGTH = 2_000_000;

function normalizeExtractedText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, MAX_DOCUMENT_TEXT_LENGTH);
}

async function extractDocxText(file: File) {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("Plik DOCX nie zawiera dokumentu tekstowego.");
  const xml = new DOMParser().parseFromString(strFromU8(documentXml), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Nie udało się odczytać struktury DOCX.");
  return [...xml.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "p")]
    .map((paragraph) => paragraph.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

async function extractPdfText(file: File) {
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
  }
  return pages.join("\n");
}

export async function extractBulletinDocumentText(file: File) {
  const text = /\.docx$/i.test(file.name) ? await extractDocxText(file) : await extractPdfText(file);
  const normalized = normalizeExtractedText(text);
  if (normalized.length < 100) throw new Error(`Dokument „${file.name}” nie zawiera wystarczającej ilości tekstu do walidacji.`);
  return normalized;
}
