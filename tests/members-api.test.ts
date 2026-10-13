import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { GET } from "../app/api/members/route.ts";
import { isMembersApiKeyValid } from "../app/lib/members-api.ts";
import type { getMemberDocumentsBucket } from "../db/index.ts";

const KEY = "test-only-members-api-key";
const runtime = globalThis as typeof globalThis & {
  env?: {
    DB?: unknown;
    MEMBERS_API_KEY?: string;
    MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket>;
  };
};

function request(key: string | null = KEY) {
  return new Request("https://example.com/api/members", {
    headers: key === null ? {} : { "X-API-Key": key },
  });
}

async function withDatabase(run: (database: DatabaseSync) => Promise<void>) {
  const previousEnv = runtime.env;
  const previousKey = process.env.MEMBERS_API_KEY;
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE member_users (
      id TEXT PRIMARY KEY, username TEXT, name TEXT, role TEXT,
      password_hash TEXT, is_active TEXT
    );
    CREATE TABLE member_profiles (user_id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE member_user_logos (
      user_id TEXT PRIMARY KEY, content TEXT, content_type TEXT, updated_at TEXT
    );
  `);
  runtime.env = {
    MEMBERS_API_KEY: KEY,
    DB: {
      prepare(query: string) {
        const statement = database.prepare(query);
        return {
          bind(...params: SQLInputValue[]) {
            return {
              async run() { return statement.run(...params); },
              async raw() { return statement.all(...params).map((row) => Object.values(row)); },
            };
          },
        };
      },
    },
  };
  delete process.env.MEMBERS_API_KEY;
  try {
    await run(database);
  } finally {
    runtime.env = previousEnv;
    if (previousKey === undefined) delete process.env.MEMBERS_API_KEY;
    else process.env.MEMBERS_API_KEY = previousKey;
    database.close();
  }
}

function addMember(database: DatabaseSync, id: string, role = "member", active = "true") {
  database.prepare("INSERT INTO member_users VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, "private-login", `User ${id}`, role, "private-password-hash", active);
}

test("key comparison requires an exact nonempty value", () => {
  assert.equal(isMembersApiKeyValid(KEY, KEY), true);
  for (const value of [null, "", "invalid", `${KEY}x`, KEY.toUpperCase(), ` ${KEY}`, `${KEY}, ${KEY}`]) {
    assert.equal(isMembersApiKeyValid(value, KEY), false);
  }
});

test("unauthorized requests cannot read storage or authenticate via query/cookies", async () => {
  await withDatabase(async () => {
    runtime.env!.DB = { prepare() { throw new Error("Storage must not be accessed"); } };
    for (const key of [null, "", "invalid", `${KEY}x`]) {
      const response = await GET(request(key));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "Unauthorized" });
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("vary"), "X-API-Key");
    }
    const response = await GET(new Request(`https://example.com/api/members?api_key=${KEY}`, {
      headers: { Cookie: `X-API-Key=${KEY}`, Authorization: `Bearer ${KEY}` },
    }));
    assert.equal(response.status, 401);
  });
});

test("missing or blank secret disables API, while server environment is supported", async (t) => {
  t.mock.method(console, "error", () => {});
  await withDatabase(async () => {
    for (const key of [undefined, "", "   "]) {
      runtime.env!.MEMBERS_API_KEY = key;
      const response = await GET(request());
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: "Service unavailable" });
    }
    delete runtime.env!.MEMBERS_API_KEY;
    process.env.MEMBERS_API_KEY = KEY;
    assert.equal((await GET(request())).status, 200);
    runtime.env!.MEMBERS_API_KEY = "binding-secret";
    assert.equal((await GET(request())).status, 401);
    assert.equal((await GET(request("binding-secret"))).status, 200);
  });
});

test("API exports exactly the requested fields, includes inactive members and excludes administrators", async () => {
  await withDatabase(async (database) => {
    addMember(database, "z-active");
    addMember(database, "a-inactive", "member", "false");
    addMember(database, "admin", "admin");
    database.prepare("INSERT INTO member_profiles VALUES (?, ?)").run("z-active", JSON.stringify({
      companyName: "Firma",
      streetAddress: "Street 1",
      postalCode: "00-001",
      city: "City",
      voivodeship: "Region",
      notes: "Description",
      selectedScopes: ["Scope"],
      selectedSpecies: ["Species"],
      selectedAssortments: ["Assortment"],
      selectedExportPermits: ["Permit"],
      selectedCertifications: ["Certificate"],
      website: "https://company.example",
      email: "private-email",
      phone: "private-phone",
      contactPerson: "private-contact",
      nip: "private-nip",
      consent: true,
      username: "private-profile-login",
      password: "private-profile-password",
    }));
    database.prepare("INSERT INTO member_user_logos VALUES (?, ?, ?, ?)").run(
      "a-inactive", "bG9nbw==", "image/png", "2026-01-01",
    );
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /application\/json/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const body = await response.json();
    assert.deepEqual(body, {
      members: [
        {
          id: "a-inactive", name: "User a-inactive",
          address: { street: "", postalCode: "", city: "", voivodeship: "" },
          description: "", logo: "data:image/png;base64,bG9nbw==",
          scopes: [], species: [], assortments: [], exportPermits: [], certifications: [], website: "",
        },
        {
          id: "z-active", name: "Firma",
          address: { street: "Street 1", postalCode: "00-001", city: "City", voivodeship: "Region" },
          description: "Description", logo: null,
          scopes: ["Scope"], species: ["Species"], assortments: ["Assortment"],
          exportPermits: ["Permit"], certifications: ["Certificate"], website: "https://company.example",
        },
      ],
    });
    assert.doesNotMatch(JSON.stringify(body), /private-|username|password|email|phone|contactPerson|nip|consent/);
  });
});

test("empty database returns an empty list without seeding sample accounts", async () => {
  await withDatabase(async (database) => {
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { members: [] });
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM member_users").get()?.count, 0);
  });
});

test("R2 logos take precedence over legacy D1 logos", async () => {
  await withDatabase(async (database) => {
    addMember(database, "member with spaces");
    database.prepare("INSERT INTO member_user_logos VALUES (?, ?, ?, ?)").run(
      "member with spaces", "bGVnYWN5", "image/png", "2026-01-01",
    );
    runtime.env!.MEMBER_DOCUMENTS = {
      async get(key) {
        assert.equal(key, "member-logos/member%20with%20spaces");
        return {
          body: new Response("r2-logo").body!,
          httpMetadata: { contentType: "image/webp" },
          uploaded: new Date("2026-01-01"),
        };
      },
      async put() { throw new Error("Unexpected write"); },
      async delete() { throw new Error("Unexpected delete"); },
      async list() { throw new Error("Unexpected list"); },
    };
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).members[0].logo, "data:image/webp;base64,cjItbG9nbw==");
  });
});

test("invalid profiles and storage failures return an explicit error, never fallback or partial data", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  await withDatabase(async (database) => {
    addMember(database, "member");
    for (const data of ["{", "null", "[]", '{"notes":42}', '{"selectedScopes":["ok",42]}']) {
      database.prepare("INSERT OR REPLACE INTO member_profiles VALUES (?, ?)").run("member", data);
      const response = await GET(request());
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Unable to load members" });
    }
    database.exec("DELETE FROM member_profiles");
    runtime.env!.MEMBER_DOCUMENTS = {
      async get() { throw new Error("R2 unavailable"); },
      async put() { throw new Error("Unexpected write"); },
      async delete() { throw new Error("Unexpected delete"); },
      async list() { throw new Error("Unexpected list"); },
    };
    assert.equal((await GET(request())).status, 500);
    delete runtime.env!.MEMBER_DOCUMENTS;
    database.exec("DROP TABLE member_user_logos");
    database.exec("CREATE VIEW member_user_logos AS SELECT * FROM missing_table");
    assert.equal((await GET(request())).status, 500);
    delete runtime.env!.DB;
    const response = await GET(request());
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Unable to load members" });
    assert.equal(log.mock.callCount(), 8);
  });
});
