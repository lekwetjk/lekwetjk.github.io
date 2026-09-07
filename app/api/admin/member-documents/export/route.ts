import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";

const MEMBER_DOCUMENTS_DIR = path.join(os.tmpdir(), "krd-ig-member-docs");

const allowedFiles = [
  "regulamin.pdf",
  "umowa-czlonkowska.pdf",
  "materialy-lipiec-2026.pdf",
];

function crc32Table() {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }

  return table;
}

const CRC32_TABLE = crc32Table();

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toUint8Array(data: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (Buffer.isBuffer(data)) return new Uint8Array(data);
  return new Uint8Array(data);
}

function makeZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const compressed = deflateRawSync(data);
    const crc = crc32(new Uint8Array(data));

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    localParts.push(Buffer.concat([localHeader, compressed]));

    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt32LE(0, 36);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralHeader, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = Buffer.concat(centralParts).length;
  const endOfCentral = Buffer.alloc(22);
  endOfCentral.writeUInt32LE(0x06054b50, 0);
  endOfCentral.writeUInt16LE(0, 4);
  endOfCentral.writeUInt16LE(0, 6);
  endOfCentral.writeUInt16LE(entries.length, 8);
  endOfCentral.writeUInt16LE(entries.length, 10);
  endOfCentral.writeUInt32LE(centralSize, 12);
  endOfCentral.writeUInt32LE(offset, 16);
  endOfCentral.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endOfCentral]);
}

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const fileEntries: Array<{ name: string; data: Buffer }> = [];

  for (const fileName of allowedFiles) {
    const fullPath = path.join(MEMBER_DOCUMENTS_DIR, fileName);
    try {
      const data = await readFile(fullPath);
      fileEntries.push({ name: fileName, data });
    } catch {
      return NextResponse.json({ error: `Dokument nie został znaleziony: ${fileName}` }, { status: 404 });
    }
  }

  const zipBuffer = makeZip(fileEntries);

  return new NextResponse(zipBuffer as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="dokumenty-czlonkowskie.zip"',
    },
  });
}
