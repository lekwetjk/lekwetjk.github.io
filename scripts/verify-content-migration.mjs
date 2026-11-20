import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { unzipSync } from "fflate";
import { sha256 } from "./content-safety.mjs";

export function additiveStatements(source) {
  const statements = [];
  let statement = "", quote = "", comment = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment === "line") {
      if (c === "\n") { comment = ""; statement += " "; }
    } else if (comment === "block") {
      if (c === "*" && next === "/") { comment = ""; statement += " "; i++; }
    } else if (quote) {
      statement += c;
      if (c === quote) {
        if (next === quote && quote !== "]") statement += source[++i];
        else quote = "";
      }
    } else if (c === "-" && next === "-") { comment = "line"; i++; }
    else if (c === "/" && next === "*") { comment = "block"; i++; }
    else if (`"'[\``.includes(c)) { quote = c === "[" ? "]" : c; statement += c; }
    else if (c === ";") { if (statement.trim()) statements.push(statement.trim()); statement = ""; }
    else statement += c;
  }
  assert.ok(!quote && comment !== "block", "Unterminated SQL quote or comment.");
  if (statement.trim()) statements.push(statement.trim());
  assert.ok(statements.length, "An empty migration is not a migration.");
  const identifier = '(?:"(?:[^"]|"")*"|`[^`]*`|\\[[^\\]]+\\]|[a-z_][a-z0-9_]*)';
  const allowed = new RegExp(`^(?:CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+|CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+|ALTER\\s+TABLE\\s+${identifier}\\s+ADD\\s+COLUMN\\s+)`, "i");
  for (const sql of statements) assert.match(sql, allowed, "Only additive table/index creation and ADD COLUMN are permitted.");
  return statements;
}

const quoteIdentifier = name => `"${name.replaceAll('"', '""')}"`;
const encode = value => JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item);
const fingerprintRows = rows => sha256(encode(rows.map(row => encode(Object.values(row))).sort()));

function captureDatabase(db) {
  const schema = db.prepare("SELECT name, type, sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name").all();
  const tables = schema.filter(row => row.type === "table").map(row => {
    const columns = db.prepare(`PRAGMA table_xinfo(${quoteIdentifier(row.name)})`).all();
    const projection = columns.map(column => quoteIdentifier(column.name)).join(",");
    const select = `SELECT ${projection} FROM ${quoteIdentifier(row.name)}`;
    const rows = db.prepare(select).all();
    return { name: row.name, columns, select, rows: rows.length, sha256: fingerprintRows(rows) };
  });
  return { schema, tables };
}

function assertDatabasePreserved(db, { schema, tables }) {
  for (const before of tables) {
    const columns = db.prepare(`PRAGMA table_xinfo(${quoteIdentifier(before.name)})`).all();
    assert.equal(encode(columns.slice(0, before.columns.length)), encode(before.columns), "An existing column changed.");
    const rows = db.prepare(before.select).all();
    assert.equal(rows.length, before.rows, "An existing publication or record disappeared.");
    assert.equal(fingerprintRows(rows), before.sha256, "Existing data, publication status, dates or URLs changed.");
    if (["managed_posts", "bulletin_reports", "posts", "campaigns", "pages", "publications"].includes(before.name)) {
      const oldColumns = new Set(before.columns.map(column => column.name));
      const active = [];
      if (oldColumns.has("deleted_at")) active.push("deleted_at IS NULL");
      for (const name of ["status", "publication_status"]) {
        if (oldColumns.has(name)) active.push(`${quoteIdentifier(name)} = 'published'`);
      }
      for (const name of ["published", "is_published"]) {
        if (oldColumns.has(name)) active.push(`${quoteIdentifier(name)} IN (1, 'true', 'published')`);
      }
      for (const column of columns.filter(column => !oldColumns.has(column.name))) {
        let invalid;
        const name = quoteIdentifier(column.name);
        if (["status", "publication_status"].includes(column.name)) invalid = `${name} IS NOT 'published'`;
        if (column.name === "visibility") invalid = `${name} IS NOT 'public'`;
        if (["published", "is_published"].includes(column.name)) invalid = `(${name} IS NULL OR ${name} NOT IN (1, 'true', 'published'))`;
        if (column.name === "deleted_at") invalid = `${name} IS NOT NULL`;
        if (["is_deleted", "is_draft"].includes(column.name)) invalid = `(${name} IS NULL OR ${name} NOT IN (0, 'false'))`;
        if (invalid) {
          const count = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(before.name)} WHERE ${[...active, `(${invalid})`].join(" AND ")}`).get().count;
          assert.equal(count, 0, "A new publication column would hide or unpublish existing content.");
        }
      }
    }
  }
  for (const before of schema.filter(row => row.type !== "table")) {
    const after = db.prepare("SELECT sql FROM sqlite_master WHERE name = ? AND type = ?").get(before.name, before.type);
    assert.equal(after?.sql, before.sql, "An existing view, trigger or index changed.");
  }
  assert.deepEqual(db.prepare("PRAGMA integrity_check").all().map(row => row.integrity_check), ["ok"]);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0, "Foreign keys are invalid after migration.");
}

export function simulateMigration(databaseSql, migrationSql) {
  const statements = additiveStatements(migrationSql);
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(databaseSql);
    db.exec("PRAGMA foreign_keys = ON");
    const state = captureDatabase(db);
    db.exec("BEGIN IMMEDIATE");
    for (const sql of statements) db.exec(sql);
    assertDatabasePreserved(db, state);
    db.exec("COMMIT");
    return { status: "LOCAL SIMULATION VERIFIED; NOT APPLIED TO PRODUCTION", migrationSha256: sha256(migrationSql), tablesChecked: state.tables.length, recordsChecked: state.tables.reduce((count, table) => count + table.rows, 0), statements: statements.length };
  } finally { db.close(); }
}

export async function verifyStaticContent(manifest, repository, backupDirectory) {
  const existing = manifest.source.files.filter(file => file.path.startsWith("public/") || file.path.startsWith("app/data/"));
  const jsonLineEndingOnly = [];
  const svgLineEndingOnly = [];
  let archivedText;
  for (const entry of existing) {
    const current = await fs.readFile(path.join(repository, ...entry.path.split("/")));
    if (sha256(current) === entry.sha256) continue;
    const dataJson = entry.path.startsWith("app/data/") && entry.path.endsWith(".json");
    const publicSvg = entry.path.startsWith("public/") && entry.path.endsWith(".svg");
    if (backupDirectory && (dataJson || publicSvg)) {
      if (!archivedText) {
        const archive = await fs.readFile(path.join(backupDirectory, "source.zip"));
        assert.equal(sha256(archive), manifest.source.sha256, "The original source archive changed.");
        archivedText = unzipSync(archive, { filter: file => (file.name.startsWith("app/data/") && file.name.endsWith(".json")) || (file.name.startsWith("public/") && file.name.endsWith(".svg")) });
      }
      const original = archivedText[entry.path];
      assert.ok(original, "Missing original text file.");
      assert.equal(sha256(original), entry.sha256);
      assert.equal(sha256(current.toString("utf8").replaceAll("\r\n", "\n")), sha256(Buffer.from(original).toString("utf8").replaceAll("\r\n", "\n")), `Archived content changed: ${entry.path}`);
      (dataJson ? jsonLineEndingOnly : svgLineEndingOnly).push(entry.path);
    } else assert.equal(sha256(current), entry.sha256, `Existing public file changed: ${entry.path}`);
  }
  return { staticFilesChecked: existing.length, jsonLineEndingOnly, svgLineEndingOnly };
}

export function compareBackups(before, after, beforeSql, afterSql) {
  if (beforeSql !== undefined || afterSql !== undefined) {
    assert.equal(sha256(beforeSql), before.database.sha256, "Before SQL changed.");
    assert.equal(sha256(afterSql), after.database.sha256, "After SQL changed.");
    const original = new DatabaseSync(":memory:"), current = new DatabaseSync(":memory:");
    try {
      original.exec(beforeSql);
      current.exec(afterSql);
      assertDatabasePreserved(current, captureDatabase(original));
    } finally { original.close(); current.close(); }
  } else {
    for (const table of before.database.inventory.tables) {
      assert.deepEqual(after.database.inventory.tables.find(item => item.name === table.name), table, "An existing database table changed.");
    }
  }
  const files = new Map(after.source.files.map(file => [file.path, file]));
  for (const file of before.source.files.filter(item => item.path.startsWith("public/") || item.path.startsWith("app/data/"))) {
    assert.deepEqual(files.get(file.path), file, "An existing archive or public file changed.");
  }
  const objects = new Map(after.objects.map(object => [object.key, object]));
  for (const object of before.objects) {
    const current = objects.get(object.key);
    assert.ok(current, "An existing stored file disappeared.");
    assert.equal(current.size, object.size, "An existing stored file changed size.");
    assert.equal(current.sha256, object.sha256, "An existing stored file changed content.");
    assert.deepEqual(current.httpMetadata, object.httpMetadata, "HTTP metadata changed.");
    assert.deepEqual(current.customMetadata, object.customMetadata, "Custom metadata changed.");
  }
  return { status: "EXISTING CONTENT AND FILES UNCHANGED", tables: before.database.inventory.tables.length, objects: before.objects.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [backupDirectory, migrationFile] = process.argv.slice(2);
    assert.ok(backupDirectory && migrationFile, "Usage: node scripts\\verify-content-migration.mjs BACKUP_DIRECTORY MIGRATION.sql");
    if (backupDirectory === "--compare") {
      const afterDirectory = process.argv[4];
      assert.ok(afterDirectory, "Usage: --compare BEFORE_BACKUP AFTER_BACKUP");
      for (const directory of [migrationFile, afterDirectory]) {
        await assert.rejects(fs.access(path.join(directory, "INCOMPLETE.json")), { code: "ENOENT" });
      }
      const before = JSON.parse(await fs.readFile(path.join(migrationFile, "manifest.json"), "utf8"));
      const after = JSON.parse(await fs.readFile(path.join(afterDirectory, "manifest.json"), "utf8"));
      const beforeSql = await fs.readFile(path.join(migrationFile, "database.sql"), "utf8");
      const afterSql = await fs.readFile(path.join(afterDirectory, "database.sql"), "utf8");
      console.log(JSON.stringify(compareBackups(before, after, beforeSql, afterSql), null, 2));
      process.exit(0);
    }
    const manifestBytes = await fs.readFile(path.join(backupDirectory, "manifest.json"));
    const manifest = JSON.parse(manifestBytes);
    const restored = JSON.parse(await fs.readFile(path.join(backupDirectory, "restore-verification.json"), "utf8"));
    assert.equal(restored.status, "RESTORE VERIFIED", "A successful restore test is required first.");
    assert.equal(restored.manifestSha256, sha256(manifestBytes), "Restore verification does not match this backup.");
    const databaseSql = await fs.readFile(path.join(backupDirectory, "database.sql"), "utf8");
    assert.equal(sha256(databaseSql), manifest.database.sha256, "Backup SQL changed.");
    const migrationSql = await fs.readFile(migrationFile, "utf8");
    const result = simulateMigration(databaseSql, migrationSql);
    Object.assign(result, await verifyStaticContent(manifest, path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), backupDirectory));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
