import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, createMemberAccount, verifySessionToken } from "../../../../lib/auth";

function parseCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === separator && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

async function decodeCsvFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
}

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Wybierz plik CSV." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Plik CSV może mieć maksymalnie 5 MB." }, { status: 400 });

  const lines = (await decodeCsvFile(file)).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return NextResponse.json({ error: "CSV musi zawierać nagłówek i co najmniej jeden wiersz." }, { status: 400 });

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0].toLowerCase(), separator).map((header) => header.replace(/\s+/g, ""));
  const loginIndex = headers.findIndex((header) => ["login", "username", "nazwa_uzytkownika"].includes(header));
  const nameIndex = headers.findIndex((header) => ["nazwa", "name", "imieinazwisko"].includes(header));
  const passwordIndex = headers.findIndex((header) => ["haslo", "password"].includes(header));
  const roleIndex = headers.findIndex((header) => ["rola", "role"].includes(header));

  if (loginIndex < 0 || nameIndex < 0 || passwordIndex < 0) {
    return NextResponse.json({ error: "Nagłówek musi zawierać kolumny: login, nazwa, haslo. Opcjonalnie: rola." }, { status: 400 });
  }

  let created = 0;
  const errors: string[] = [];
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const values = parseCsvLine(lines[rowIndex], separator);
    try {
      await createMemberAccount({
        username: values[loginIndex] ?? "",
        name: values[nameIndex] ?? "",
        password: values[passwordIndex] ?? "",
        role: values[roleIndex]?.toLowerCase() === "admin" ? "admin" : "member",
      });
      created += 1;
    } catch (error) {
      errors.push(`Wiersz ${rowIndex + 1}: ${error instanceof Error ? error.message : "Nieprawidłowe dane"}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, created, skipped: errors.length, errors });
}
