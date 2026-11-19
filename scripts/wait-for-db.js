#!/usr/bin/env node
// Blocks until the docker-compose `postgres` service can actually accept a
// connection, or exits non-zero after a timeout. No extra dependencies —
// shells out to `docker compose`, so run this after `docker compose up -d`
// (see README's Local Database (Docker) section for the full sequence).
//
// Docker's own healthcheck isn't quite enough on its own: on first init,
// postgres starts once to run any init scripts, then shuts down and
// restarts for real. That temporary first server also answers
// `pg_isready`, so the healthcheck can briefly report "healthy" right
// before the restart drops the connection. This does a real `pg_isready`
// exec through the *current* container, and additionally requires a few
// consecutive successes so a check landing in that narrow restart window
// doesn't get treated as "ready" too.

const { execSync } = require('child_process');

const SERVICE = 'postgres';
const PG_USER = process.env.POSTGRES_USER || 'test';
const PG_DB = process.env.POSTGRES_DB || 'pcdc';
const TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const REQUIRED_CONSECUTIVE = 3;

function isReady() {
  try {
    execSync(
      `docker compose exec -T ${SERVICE} pg_isready -U ${PG_USER} -d ${PG_DB}`,
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  process.stdout.write('Waiting for postgres to accept connections...');

  let consecutive = 0;
  while (Date.now() < deadline) {
    if (isReady()) {
      consecutive += 1;
      if (consecutive >= REQUIRED_CONSECUTIVE) {
        console.log(' done.');
        return;
      }
    } else {
      consecutive = 0;
    }
    process.stdout.write('.');
    await sleep(POLL_INTERVAL_MS);
  }

  console.error(
    `\npostgres did not become ready within ${TIMEOUT_MS / 1000}s. ` +
      'Run `docker compose logs postgres` to see what went wrong.',
  );
  process.exit(1);
}

main();
