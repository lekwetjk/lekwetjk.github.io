import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

type CloudflareBindings = {
  DB?: any;
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
