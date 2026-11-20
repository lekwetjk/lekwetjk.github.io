import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { getPlatformProxy } from "wrangler";
import { unzipSync } from "fflate";

const execute = promisify(execFile);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = path.join(repository, "node_modules", "wrangler", "bin", "wrangler.js");
export const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const json = value => JSON.stringify(value, null, 2);
const quote = value => `"${value.replaceAll('"', '""')}"`;
const sort = values => values.sort((a, b) => a.localeCompare(b, "en"));

export function outside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("The destination must be outside the source directory.");
  }
}

export function contained(parent, relative) {
  if (typeof relative !== "string" || /[\\:\0]/.test(relative) || path.posix.isAbsolute(relative)) throw new Error("Invalid archive path.");
  const target = path.resolve(parent, ...relative.split("/"));
  const inside = path.relative(parent, target);
  if (!inside || inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) throw new Error("Archive path escapes its destination.");
  return target;
}

function canonical(value) {
  if (typeof value === "bigint") return ["number", String(value)];
  if (typeof value === "number") return ["number", String(value)];
  if (value instanceof Uint8Array) return ["blob", Buffer.from(value).toString("hex")];
  if (value instanceof ArrayBuffer) return ["blob", Buffer.from(value).toString("hex")];
  if (Array.isArray(value)) return ["blob", Buffer.from(value).toString("hex")];
  return value;
}

export async function databaseInventory(query) {
  const schema = await query("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY type, name");
  const tables = [];
  for (const table of schema.filter(item => item.type === "table")) {
    const rows = await query(`SELECT * FROM ${quote(table.name)}`);
    const serialized = sort(rows.map(row => JSON.stringify(Object.fromEntries(
      Object.keys(row).sort().map(key => [key, canonical(row[key])]),
    ))));
    tables.push({ name: table.name, rows: rows.length, sha256: sha256(JSON.stringify(serialized)) });
  }
  return { schemaSha256: sha256(JSON.stringify(schema)), tables };
}

export async function objectInventory(bucket) {
  const objects = [];
  const seen = new Set();
  const cursors = new Set();
  let cursor;
  do {
    const page = await bucket.list({ cursor, limit: 1000, include: ["httpMetadata", "customMetadata"] });
    for (const object of page.objects) {
      if (seen.has(object.key)) throw new Error("R2 returned a duplicate object.");
      seen.add(object.key);
      objects.push({
        key: object.key, size: object.size, etag: object.etag, version: object.version,
        uploaded: object.uploaded.toISOString(), httpMetadata: object.httpMetadata ?? {},
        customMetadata: object.customMetadata ?? {}, storageClass: object.storageClass ?? "Standard",
      });
    }
    if (page.truncated && (!page.cursor || cursors.has(page.cursor))) throw new Error("R2 pagination did not advance.");
    if (page.truncated) cursors.add(page.cursor);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects.sort((a, b) => a.key.localeCompare(b.key, "en"));
}

export async function restoreDatabase(database, sqlSource) {
  const source = new DatabaseSync(":memory:");
  try {
    source.exec(sqlSource);
    const schema = source.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND sql IS NOT NULL ORDER BY type, name").all();
    const tables = schema.filter(item => item.type === "table");
    const statements = [database.prepare("PRAGMA defer_foreign_keys = ON")];
    for (const table of tables) statements.push(database.prepare(table.sql));
    for (const table of tables) {
      const columns = source.prepare(`PRAGMA table_xinfo(${quote(table.name)})`).all().filter(column => column.hidden === 0);
      const projection = columns.map(column => quote(column.name)).join(",");
      const insert = `INSERT INTO ${quote(table.name)} (${projection}) VALUES (${columns.map(() => "?").join(",")})`;
      for (const row of source.prepare(`SELECT ${projection} FROM ${quote(table.name)}`).all()) {
        const values = columns.map(column => row[column.name]).map(value => value instanceof Uint8Array ? Uint8Array.from(value).buffer : value);
        statements.push(database.prepare(insert).bind(...values));
      }
    }
    for (const item of schema.filter(item => item.type !== "table")) statements.push(database.prepare(item.sql));
    statements.push(database.prepare("PRAGMA defer_foreign_keys = OFF"));
    await database.batch(statements);
    assert.deepEqual(await databaseInventory(async sql => (await database.prepare(sql).all()).results), await databaseInventory(sql => source.prepare(sql).all()), "Parameterized database restoration differs from the original.");
  } finally { source.close(); }
}

async function writeObject(file, body) {
  const output = await fs.open(file, "wx", 0o600);
  const hash = crypto.createHash("sha256");
  let size = 0;
  try {
    for await (const chunk of body) {
      hash.update(chunk);
      size += chunk.byteLength;
      await output.writeFile(chunk);
    }
  } finally {
    await output.close();
  }
  return { size, sha256: hash.digest("hex") };
}

async function digest(file) {
  const input = await fs.open(file, "r");
  const hash = crypto.createHash("sha256");
  let size = 0;
  try {
    for await (const chunk of input.createReadStream()) { hash.update(chunk); size += chunk.length; }
  } finally {
    await input.close();
  }
  return { size, sha256: hash.digest("hex") };
}

async function runWrangler(args) {
  try {
    await execute(process.execPath, [wrangler, ...args], {
      cwd: repository, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG: "error" },
    });
  } catch (error) {
    const message = String(error.stderr || error.message).replace(/https?:\/\/\S+/g, "[redacted URL]");
    throw new Error(`Wrangler failed (${error.code ?? "unknown"}): ${message.slice(-2000)}`);
  }
}

export async function backup({ destination, configPath, sourceRef }) {
  outside(repository, destination);
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  assert.equal(config.d1_databases?.length, 1, "Exactly one explicit database is required.");
  assert.equal(config.r2_buckets?.length, 1, "Exactly one explicit bucket is required.");
  assert.ok(config.d1_databases[0].remote && config.r2_buckets[0].remote, "Backup requires explicit remote bindings.");
  const { stdout } = await execute("git", ["rev-parse", `${sourceRef}^{commit}`], { cwd: repository });
  const commit = stdout.trim();
  const directory = path.join(destination, `backup-${new Date().toISOString().replaceAll(":", "-")}-${crypto.randomUUID().slice(0, 8)}`);
  await fs.mkdir(directory, { recursive: false, mode: 0o700 });
  await fs.mkdir(path.join(directory, "objects"), { mode: 0o700 });
  await fs.writeFile(path.join(directory, "INCOMPLETE.json"), json({ startedAt: new Date().toISOString(), commit }), { flag: "wx", mode: 0o600 });
  const platform = await getPlatformProxy({ configPath, envFiles: [], persist: false, remoteBindings: true });
  try {
    const bucket = platform.env[config.r2_buckets[0].binding];
    const database = platform.env[config.d1_databases[0].binding];
    const inventory = await objectInventory(bucket);
    const objects = [];
    for (const item of inventory) {
      const object = await bucket.get(item.key);
      if (!object || object.etag !== item.etag || object.version !== item.version) throw new Error("R2 changed during backup; restart in a quiet window.");
      const file = `objects/${sha256(item.key)}.bin`;
      const content = await writeObject(contained(directory, file), object.body);
      assert.equal(content.size, item.size, "Incomplete R2 object download.");
      objects.push({ ...item, ...content, file });
      if (objects.length % 25 === 0) console.log(`Copied ${objects.length}/${inventory.length} R2 objects.`);
    }
    const query = async sql => (await database.prepare(sql).all()).results;
    const before = await databaseInventory(query);
    await runWrangler(["d1", "export", config.d1_databases[0].database_name, "--remote", "--config", configPath, "--output", path.join(directory, "database.sql"), "--skip-confirmation"]);
    assert.deepEqual(await databaseInventory(query), before, "D1 changed during export; backup is not marked complete.");
    assert.deepEqual(await objectInventory(bucket), inventory, "R2 changed during backup; backup is not marked complete.");
    const sqlFile = path.join(directory, "database.sql");
    const verification = new DatabaseSync(":memory:");
    try {
      verification.exec(await fs.readFile(sqlFile, "utf8"));
      assert.deepEqual(await databaseInventory(sql => verification.prepare(sql).all()), before, "Exported SQL does not reproduce the source database.");
      assert.deepEqual(verification.prepare("PRAGMA integrity_check").all().map(row => Object.values(row)[0]), ["ok"]);
      assert.equal(verification.prepare("PRAGMA foreign_key_check").all().length, 0, "Foreign key check failed.");
    } finally { verification.close(); }
    await execute("git", ["archive", "--format=zip", "--output", path.join(directory, "source.zip"), commit], { cwd: repository });
    const entries = unzipSync(await fs.readFile(path.join(directory, "source.zip")));
    const sourceFiles = Object.entries(entries).filter(([name]) => !name.endsWith("/")).map(([name, bytes]) => ({ path: name, size: bytes.length, sha256: sha256(bytes) }));
    const manifest = {
      format: "krd-content-backup-v1", createdAt: new Date().toISOString(), commit,
      encryption: "none; operator-declared private destination",
      database: { ...await digest(sqlFile), inventory: before },
      source: { ...await digest(path.join(directory, "source.zip")), files: sourceFiles },
      objects, consistency: "D1 stable across export; R2 stable across copy and SQL export",
    };
    await fs.writeFile(path.join(directory, "manifest.json"), json(manifest), { flag: "wx", mode: 0o600 });
    await fs.unlink(path.join(directory, "INCOMPLETE.json"));
    console.log(json({ backup: directory, objects: objects.length, tables: before.tables.length, sourceFiles: sourceFiles.length, status: "COPIED; restore verification still required" }));
    return directory;
  } finally { await platform.dispose(); }
}

export async function restore({ backupDirectory, target }) {
  outside(repository, target);
  outside(backupDirectory, target);
  const manifest = JSON.parse(await fs.readFile(path.join(backupDirectory, "manifest.json"), "utf8"));
  assert.equal(manifest.format, "krd-content-backup-v1");
  await assert.rejects(fs.access(path.join(backupDirectory, "INCOMPLETE.json")), { code: "ENOENT" });
  assert.deepEqual(await digest(path.join(backupDirectory, "database.sql")), { size: manifest.database.size, sha256: manifest.database.sha256 });
  assert.deepEqual(await digest(path.join(backupDirectory, "source.zip")), { size: manifest.source.size, sha256: manifest.source.sha256 });
  for (const object of manifest.objects) assert.deepEqual(await digest(contained(backupDirectory, object.file)), { size: object.size, sha256: object.sha256 });
  await fs.mkdir(target, { recursive: false, mode: 0o700 });
  const source = path.join(target, "source");
  await fs.mkdir(source, { mode: 0o700 });
  const entries = unzipSync(await fs.readFile(path.join(backupDirectory, "source.zip")));
  const expectedFiles = new Map(manifest.source.files.map(file => [file.path, file]));
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith("/")) continue;
    const expected = expectedFiles.get(name);
    assert.ok(expected, "Unexpected source archive entry.");
    assert.equal(sha256(bytes), expected.sha256);
    assert.equal(bytes.length, expected.size);
    const file = contained(source, name);
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await fs.writeFile(file, bytes, { flag: "wx", mode: 0o600 });
    expectedFiles.delete(name);
  }
  assert.equal(expectedFiles.size, 0, "Missing source archive entries.");
  const id = crypto.randomUUID();
  const configPath = path.join(target, "local-restore.json");
  await fs.writeFile(configPath, json({
    name: `restore-${id}`, compatibility_date: "2026-07-31",
    d1_databases: [{ binding: "DB", database_name: "restore-only", database_id: id }],
    r2_buckets: [{ binding: "FILES", bucket_name: `restore-only-${id}` }],
  }), { flag: "wx", mode: 0o600 });
  const persist = path.join(target, "state");
  const platform = await getPlatformProxy({ configPath, envFiles: [], persist: { path: path.join(persist, "v3") }, remoteBindings: false });
  try {
    await restoreDatabase(platform.env.DB, await fs.readFile(path.join(backupDirectory, "database.sql"), "utf8"));
    assert.deepEqual(await databaseInventory(async sql => (await platform.env.DB.prepare(sql).all()).results), manifest.database.inventory);
    const bucket = platform.env.FILES;
    for (const object of manifest.objects) {
      const httpMetadata = { ...object.httpMetadata };
      if (httpMetadata.cacheExpiry) httpMetadata.cacheExpiry = new Date(httpMetadata.cacheExpiry);
      await bucket.put(object.key, await fs.readFile(contained(backupDirectory, object.file)), { httpMetadata, customMetadata: object.customMetadata, storageClass: object.storageClass });
      const restored = await bucket.get(object.key);
      assert.ok(restored, "Restored object is missing.");
      assert.equal(sha256(new Uint8Array(await restored.arrayBuffer())), object.sha256);
      assert.deepEqual(JSON.parse(JSON.stringify(restored.httpMetadata ?? {})), object.httpMetadata);
      assert.deepEqual(restored.customMetadata ?? {}, object.customMetadata);
    }
    assert.equal((await objectInventory(bucket)).length, manifest.objects.length);
    const result = {
      verifiedAt: new Date().toISOString(), backupDirectory, target, commit: manifest.commit,
      manifestSha256: sha256(await fs.readFile(path.join(backupDirectory, "manifest.json"))),
      database: "all table contents, schema, integrity and foreign keys verified",
      sourceFiles: manifest.source.files.length, objects: manifest.objects.length,
      remoteBindings: false, status: "RESTORE VERIFIED",
    };
    await fs.writeFile(path.join(target, "VERIFIED.json"), json(result), { flag: "wx", mode: 0o600 });
    await fs.writeFile(path.join(backupDirectory, "restore-verification.json"), json(result), { flag: "wx", mode: 0o600 });
    console.log(json({ status: result.status, sourceFiles: result.sourceFiles, objects: result.objects, tables: manifest.database.inventory.tables.length }));
    return result;
  } finally { await platform.dispose(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  try {
    const options = Object.fromEntries(Array.from({ length: Math.ceil(args.length / 2) }, (_, index) => [args[index * 2], args[index * 2 + 1]]));
    if (command === "backup" && options["--destination"] && options["--config"] && options["--ref"]) {
      await backup({ destination: path.resolve(options["--destination"]), configPath: path.resolve(options["--config"]), sourceRef: options["--ref"] });
    } else if (command === "restore-test" && options["--backup"] && options["--target"]) {
      await restore({ backupDirectory: path.resolve(options["--backup"]), target: path.resolve(options["--target"]) });
    } else throw new Error("Use backup --destination PRIVATE_PATH --config READ_CONFIG --ref COMMIT or restore-test --backup BACKUP --target NEW_PRIVATE_PATH.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
