import { readFile } from "node:fs/promises";
import path from "node:path";

import { getMemberDocumentsBucket } from "../../db/index.ts";

export function bulletinPdfFileName(id: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|1[0-2]))?$/.test(id)) return null;
  const [year, month, endMonth] = id.split("-");
  return `biuletyn-${year}-${month}${endMonth ? `_${endMonth}` : ""}.pdf`;
}

export async function getPreparedBulletinPdf(id: string) {
  const fileName = bulletinPdfFileName(id);
  if (!fileName) return null;
  let bucket: ReturnType<typeof getMemberDocumentsBucket> | null = null;
  try {
    bucket = getMemberDocumentsBucket();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) throw error;
  }
  if (bucket) {
    const object = await bucket.get(`bulletin-pdfs/${fileName}`);
    return object ? { body: object.body, fileName } : null;
  }
  try {
    const content = await readFile(path.join(process.cwd(), "private", "bulletins", fileName));
    return { body: new Uint8Array(content), fileName };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
