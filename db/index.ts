import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

type CloudflareBindings = {
  DB?: any;
  MEMBER_DOCUMENTS?: {
    put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; uploaded: Date } | null>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string; uploaded: Date }> }>;
  };
};

function getCloudflareBindings() {
  return (globalThis as typeof globalThis & { env?: CloudflareBindings }).env;
}

export function getDb() {
  const bindings = getCloudflareBindings();

  if (!bindings?.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(bindings.DB, { schema });
}

export function getMemberDocumentsBucket() {
  const bucket = getCloudflareBindings()?.MEMBER_DOCUMENTS;

  if (!bucket) {
    throw new Error("Cloudflare R2 binding `MEMBER_DOCUMENTS` is unavailable.");
  }

  return bucket;
}
