import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';

const inputPath = 'C:/Users/Jakub Kubacki/Documents/rozne/import.csv';
const DEFAULT_D1_DATABASE = 'site-creator-d1';
const MEMBER_PASSWORD_SALT = 'krd-ig-member-salt';

function parseArgs(argv) {
  const options = {
    input: inputPath,
    database: process.env.CLOUDFLARE_D1_DATABASE ?? process.env.D1_DATABASE_NAME ?? DEFAULT_D1_DATABASE,
    remote: false,
    output: '',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--remote' || arg === '--cloudflare') {
      options.remote = true;
      continue;
    }

    if (arg === '--local') {
      options.remote = false;
      continue;
    }

    if (arg === '--input' || arg === '-i') {
      options.input = argv[++i];
      continue;
    }

    if (arg === '--database' || arg === '--db') {
      options.database = argv[++i];
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      options.output = argv[++i];
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.input) {
    throw new Error('Missing CSV path. Pass --input path/to/import.csv.');
  }

  if (!options.database) {
    throw new Error('Missing D1 database name. Pass --database <name-or-id>.');
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/import_member_csv.mjs [options]

Options:
  -i, --input <path>      CSV file path (default: ${inputPath})
      --remote            Execute import on Cloudflare D1 with wrangler --remote
      --local             Execute import on local Wrangler D1 (default)
      --db, --database    D1 database name or id (default: ${DEFAULT_D1_DATABASE})
  -o, --output <path>     Save generated SQL to a file instead of a temp file
      --dry-run           Generate SQL and print summary without calling Wrangler
  -h, --help              Show this help

CSV columns: login, nazwa, haslo, optional rola.`);
}

function decodeCsvFile(filePath) {
  const bytes = fs.readFileSync(filePath);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1250').decode(bytes);
  }
}

function parseCsvLine(line, separator) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (ch === separator && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

function normalizeImportedText(value) {
  return value
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/[\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashPassword(password) {
  return crypto.scryptSync(password, MEMBER_PASSWORD_SALT, 64).toString('hex');
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildImportSql(users) {
  const statements = [
    'CREATE TABLE IF NOT EXISTS member_users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT \'member\', password_hash TEXT NOT NULL, is_active TEXT NOT NULL DEFAULT \'true\', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);',
  ];

  for (const user of users) {
    const values = [
      sqlString(user.id),
      sqlString(user.username),
      sqlString(user.name),
      sqlString(user.role),
      sqlString(user.passwordHash),
      "'true'",
    ].join(', ');

    statements.push(`INSERT INTO member_users (id, username, name, role, password_hash, is_active) VALUES (${values}) ON CONFLICT(username) DO UPDATE SET name = excluded.name, role = excluded.role, password_hash = excluded.password_hash, is_active = 'true', updated_at = CURRENT_TIMESTAMP;`);
  }

  return `${statements.join('\n')}\n`;
}

function canRun(command, args = ['--version']) {
  const result = spawnSync(commandName(command), args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function commandName(command) {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

function getWranglerCommand() {
  if (canRun('pnpm', ['--version'])) {
    return { command: 'pnpm', args: ['exec', 'wrangler'] };
  }

  if (canRun('npx', ['--version'])) {
    return { command: 'npx', args: ['wrangler'] };
  }

  return { command: 'wrangler', args: [] };
}

function runWranglerD1Execute({ database, remote, filePath }) {
  const wrangler = getWranglerCommand();
  const args = [...wrangler.args, 'd1', 'execute', database, '--file', filePath];

  if (remote) {
    args.push('--remote');
  }

  const result = spawnSync(commandName(wrangler.command), args, { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed with exit code ${result.status}.`);
  }
}

const options = parseArgs(process.argv.slice(2));
const text = decodeCsvFile(options.input).replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter((line) => line.trim());

if (lines.length < 2) {
  throw new Error('CSV is empty or missing a header.');
}

const separator = lines[0].includes(';') ? ';' : ',';
const headers = parseCsvLine(lines[0], separator).map((header) => header.trim().toLowerCase());
const indexes = {
  login: headers.findIndex((header) => ['login', 'username', 'email', 'nazwa_uzytkownika'].includes(header)),
  name: headers.findIndex((header) => ['nazwa', 'name', 'imieinazwisko', 'firma', 'nazwa_firmy'].includes(header)),
  password: headers.findIndex((header) => ['haslo', 'password', 'pass', 'hasło'].includes(header)),
  role: headers.findIndex((header) => ['rola', 'role'].includes(header)),
};

if (indexes.login < 0 || indexes.name < 0 || indexes.password < 0) {
  throw new Error('CSV must contain login, nazwa, and haslo columns.');
}

let created = 0;
let skipped = 0;
const samples = [];
const users = [];
const seenUsernames = new Set();

for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
  const row = parseCsvLine(lines[rowIndex], separator).map((cell) => normalizeImportedText(cell));

  if (row.length <= Math.max(indexes.login, indexes.name, indexes.password)) {
    skipped += 1;
    continue;
  }

  const username = (row[indexes.login] ?? '').trim();
  const name = (row[indexes.name] ?? '').trim();
  const password = (row[indexes.password] ?? '').trim();
  const role = (row[indexes.role] ?? 'member').trim().toLowerCase() === 'admin' ? 'admin' : 'member';

  if (!username || !name || !password) {
    skipped += 1;
    continue;
  }

  const usernameKey = username.toLowerCase();

  if (seenUsernames.has(usernameKey)) {
    skipped += 1;
    continue;
  }

  seenUsernames.add(usernameKey);
  users.push({
    id: `member-${Date.now()}-${rowIndex}-${crypto.randomUUID().slice(0, 8)}`,
    username,
    name,
    role,
    passwordHash: hashPassword(password),
  });
  created += 1;

  if (samples.length < 5) {
    samples.push({ username, name, role });
  }
}

const sql = buildImportSql(users);
const sqlPath = options.output || path.join(os.tmpdir(), `krd-ig-member-import-${Date.now()}.sql`);
fs.writeFileSync(sqlPath, sql, 'utf8');

if (!options.dryRun) {
  runWranglerD1Execute({ database: options.database, remote: options.remote, filePath: sqlPath });
}

console.log(JSON.stringify({
  created,
  skipped,
  totalRows: lines.length - 1,
  samples,
  encoding: 'utf-8 / windows-1250 / utf-16 auto-detected',
  file: path.basename(options.input),
  database: options.database,
  target: options.dryRun ? 'dry-run' : options.remote ? 'cloudflare-remote' : 'wrangler-local',
  sqlFile: sqlPath,
}, null, 2));
