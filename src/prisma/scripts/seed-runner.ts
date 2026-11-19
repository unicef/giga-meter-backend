/**
 * Seed runner — applies raw .sql seed scripts to the database pointed at by
 * DATABASE_URL in the backend `.env`.
 *
 * By default it applies the Spain / Project Connect manual-test seed
 * (`seed-spain-project-connect.sql`). Pass one or more .sql file names (or
 * paths) as CLI arguments to run a different, ordered set instead.
 *
 * Usage:
 *   npx ts-node --transpile-only src/prisma/scripts/seed-runner.ts
 *   npx ts-node --transpile-only src/prisma/scripts/seed-runner.ts seed-health-entity-v1.sql
 *   npm run seed:spain
 *
 * Notes:
 *   * DATABASE_URL is read from the environment first, then from
 *     `giga-meter-backend/.env` (env var wins — override for one-off runs
 *     with `DATABASE_URL=... npx ts-node ...`).
 *   * Each .sql file manages its own transaction (BEGIN/COMMIT). A failure
 *     aborts that file and stops the run with a non-zero exit code.
 *   * `--transpile-only` is recommended because `pg` ships no type
 *     declarations; it keeps ts-node from failing on the missing types.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, isAbsolute, basename } from 'path';
import { config as loadEnv } from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('pg');

const SCRIPTS_DIR = __dirname;
const BACKEND_ROOT = resolve(__dirname, '../../..');

// Default seed set for manually testing the Project Connect flows with Spain.
const DEFAULT_SQL_FILES = ['seed-spain-project-connect.sql'];

/** Hide the password when echoing the connection target. */
function maskDbUrl(url: string): string {
  return url.replace(/(:\/\/[^:/@]+:)[^@]*@/, '$1****@');
}

/** Resolve a CLI-provided name/path to an existing .sql file. */
function resolveSqlPath(nameOrPath: string): string {
  const candidate = isAbsolute(nameOrPath)
    ? nameOrPath
    : resolve(SCRIPTS_DIR, nameOrPath);
  if (!existsSync(candidate)) {
    throw new Error(`SQL file not found: ${nameOrPath} (looked at ${candidate})`);
  }
  return candidate;
}

async function main(): Promise<void> {
  // Load .env from the backend root (does not override an already-set env var).
  loadEnv({ path: resolve(BACKEND_ROOT, '.env') });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Define it in giga-meter-backend/.env or the environment.',
    );
  }

  const fileArgs = process.argv.slice(2);
  const sqlFiles = (fileArgs.length ? fileArgs : DEFAULT_SQL_FILES).map(
    resolveSqlPath,
  );

  console.log(`→ Target DB : ${maskDbUrl(databaseUrl)}`);
  console.log(`→ SQL files : ${sqlFiles.map((f) => basename(f)).join(', ')}`);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of sqlFiles) {
      const label = basename(file);
      const sql = readFileSync(file, 'utf8');
      console.log(`\n── Applying ${label} ─────────────────────────────`);

      // Multiple statements in one string → node-postgres returns an array
      // of result objects (one per statement); a single statement returns one.
      const raw = await client.query(sql);
      const results = Array.isArray(raw) ? raw : [raw];

      // Echo the rows of any SELECT that returned data (e.g. the trailing
      // verification query in the seed scripts).
      for (const res of results) {
        if (res && res.command === 'SELECT' && res.rows && res.rows.length) {
          console.table(res.rows);
        }
      }
      console.log(`✔ ${label} applied`);
    }

    console.log('\n✅ All SQL seed scripts applied successfully.');
  } catch (err: any) {
    console.error(
      `\n❌ Seeding failed: ${err?.message ?? err}` +
        (err?.detail ? `\n   detail: ${err.detail}` : '') +
        (err?.hint ? `\n   hint: ${err.hint}` : ''),
    );
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err?.message ?? err}`);
  process.exit(1);
});
