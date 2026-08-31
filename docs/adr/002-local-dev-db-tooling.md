# ADR 002: Local dev DB spinup and seeding

**Date:** 2026-08-31
**Status:** Accepted
**Branch:** feature/local-db-dev-tooling

## Context

Getting a working local database was fully manual: bring your own Postgres 15+, run
`prisma generate`/`migrate dev`, and hope you knew which tables needed test data by hand.
The repo's own seed script (`src/prisma/seed.ts` + `src/prisma/scripts/*.sql`) existed but
wasn't wired into `package.json`'s `prisma.seed`, so `migrate dev`/`db seed` had nothing to
run. The seed also only covered `dailycheckapp_country` and `school` (master reference
data) — not `dailycheckapp_school`, the table the schools API actually reads and writes, so
even a fully-seeded DB had nothing to exercise `GET`/`checkExistingInstallation`/
`checkDeviceStatus`/`deactivate` against.

A prior attempt at this existed as an open WIP PR (#151, `feature/update-local-env-and-docs`,
targeting `main`, `CONFLICTING`) that also modified `auth.guard.ts`/`category.guard.ts` to
bypass category restrictions when auth is disabled. This branch does not adopt that PR
(different base, unresolved conflicts), but does independently arrive at the same guard fix
— see Decision 3, added after live testing showed the gap it fixes was real, not
theoretical.

## Decision

### 1. `docker-compose.yml` + `docker/postgres.Dockerfile`

- Postgres is a custom build (`FROM postgres:15` + `postgresql-15-postgis-3`), not a plain
  `postgres:15` image or a third-party postgis image. Confirmed via a staging `pg_dump`
  header (`PGDMP` archive) that the actual staging database runs PostgreSQL **15.16** with
  `postgis`, `pg_buffercache`, and `pg_stat_statements` extensions installed. The Prisma
  schema's `extensions = [postgis]` and `school.geopoint` field require it; a fresh
  `migrate dev` hard-fails with `extension "postgis" is not available` against a plain
  `postgres:15` image (confirmed empirically, not just in theory).
- Redis included in the same file (`redis:7-alpine`) since the app requires `REDIS_URL` to
  run at all (cache-manager-redis-store), not just to run tests.
- Ports default to 5432/6379 (matching `.env.example`), overridable via
  `POSTGRES_PORT`/`REDIS_PORT` env vars for developers with a port conflict.
- Named volume for data persistence across `docker compose down` (not `down -v`).

### 2. Seeding wired explicitly, not left to `migrate dev`'s implicit auto-seed

- Added `"prisma": {"seed": "ts-node -r tsconfig-paths/register src/prisma/seed.ts"}` to
  `package.json`.
- `prisma migrate dev`'s built-in "seed after applying new migrations" behavior did **not**
  fire reliably in testing (confirmed: a full `migrate dev` run against a fresh DB applied
  every migration but inserted no seed rows; running `prisma db seed` immediately after did).
  Rather than depend on that, always run `npx prisma db seed` as its own explicit step after
  migrating (documented as a plain command sequence in the README — no `npm run db:*`
  convenience scripts; those were tried and then deliberately removed in favor of running
  `docker compose`/`prisma` commands directly).
- Extended `src/prisma/scripts/local-dev-seed.sql` with two `dailycheckapp_school` rows
  (fixed ids 90001/90002, one `is_active: true` and one `false`) tied to the existing seeded
  Spain master school, so both the "active installation" and "deactivated device" code paths
  have real data to test against locally. All seed SQL upserts on conflict — safe to re-run.

### 3. `USE_AUTH=false` now grants full local access — via code, not seeded data

- First pass on this branch left `auth.guard.ts`/`category.guard.ts` untouched entirely: with
  `USE_AUTH` disabled, `AuthGuard` already skips token validation, but never sets
  `request.category`, so `CategoryGuard` fell through to the `DEFAULT_CATEGORY` (`PUBLIC`,
  read-only). Live testing (attempting a `POST` locally) confirmed this is a real, not
  theoretical, gap: `USE_AUTH=false` only ever produced unauthenticated **read** access —
  every write endpoint 403'd (`Category 'PUBLIC' does not have access to POST ...`)
  regardless of request content.
- **Decision:** `CategoryGuard` now checks the identical `USE_AUTH !== 'true'` condition
  `AuthGuard` already uses, and when true, sets `request.category = 'giga_meter'` (broad
  access per its static config) instead of falling through to `PUBLIC`. `AuthGuard`
  additionally sets `request.has_write_access = true` in the same branch, so downstream
  logic that reads that flag (e.g. `schools()`'s country filtering) also sees a trusted
  caller. Both log a loud `console.warn` when this branch fires, so an unexpected activation
  is never silent.
- **Why this is safe, not a new risk:** the fix reuses the *exact same* trust boundary
  `AuthGuard` already relies on to skip auth entirely — it does not introduce a new flag or
  a new way to bypass anything. If `USE_AUTH` is ever unset/misconfigured in a real
  deployment (a pre-existing risk: `process.env.USE_AUTH === 'true'` means an unset var
  already evaluates to "auth disabled" today, independent of this change), `AuthGuard` has
  already granted full access before `CategoryGuard` is even reached — this fix does not
  widen that blast radius, it just makes the category layer consistent with a decision the
  auth layer already made.
- **Considered and rejected:** seeding `category_config` DB rows to grant `PUBLIC` broader
  access. Rejected because it would change `PUBLIC`'s *real* permissions in whatever
  environment reads that table (not scoped to "local only" the way a `USE_AUTH` check is),
  and because a caller that never authenticated at all has no principled reason to be treated
  as `PUBLIC`-but-more — `giga_meter`-when-untrusted is a clearer signal than a widened
  `PUBLIC`.

## Consequences

**Pros**

- A short, documented command sequence (`docker compose up -d` → `wait-for-db.js` →
  `migrate dev` → `db seed`) gets a new developer from zero to a fully migrated, seeded,
  PostGIS-capable local DB, verified end-to-end.
- Seed data matches staging's actual extension/version footprint, not a best-guess.
- `USE_AUTH=false` now gives genuinely full local testing (read + write) with zero setup on
  the Giga Maps side, matching what that flag already implied but didn't fully deliver.
- The guard fix reuses an existing, already-understood trust boundary rather than adding a
  new one — no new env var, no new bypass mechanism to reason about.

**Cons**

- Building the custom Postgres image (`docker compose build`) is a one-time cost new
  contributors pay that a plain `image:` pull wouldn't have.
- `docker-compose.yml`'s default ports (5432/6379) will conflict with any other local
  Postgres/Redis already running on those ports; must override via env vars.
- `CategoryGuard`/`AuthGuard` now carry local-dev-specific branches (`!useAuth`) that don't
  exist in a purely production-shaped codebase — a future reader needs to understand this is
  intentionally scoped to disabled auth, not a general-purpose bypass.

## Alternatives considered

- **`postgis/postgis` official image:** rejected — no arm64 manifest at all (any tag),
  meaning full QEMU emulation on Apple Silicon; also not actually "postgres:15."
- **`imresamu/postgis` community image:** verified working, genuinely multi-arch, but still
  not literally `postgres:15` and introduces a third-party image dependency for something a
  ~15-line Dockerfile solves directly against the official image.
- **Plain `postgres:15`, document the PostGIS gap:** rejected — leaves `migrate dev` broken
  out of the box for anyone who hits the `school_geopoint_geographqy` migration, which is
  every fresh setup.
- **Seed `category_config` to grant `PUBLIC` write access locally:** rejected — see
  Decision 3.
- **Leave `auth.guard.ts`/`category.guard.ts` untouched:** the first pass on this branch did
  exactly this; reversed after live testing showed `USE_AUTH=false` didn't actually enable
  local write-endpoint testing, which is the entire point of that flag existing.
- **Adopt/rebase PR #151:** considered; declined in favor of a fresh implementation based on
  current `staging` (PR #151 targets `main`, which has diverged significantly, and is
  `CONFLICTING`) — though this branch arrives at the same guard fix PR #151 attempted,
  independently verified against current `staging`'s guard code.

## Related documentation

- `docker-compose.yml`, `docker/postgres.Dockerfile`, `scripts/wait-for-db.js`
- `src/prisma/scripts/local-dev-seed.sql`, `package.json` (`prisma.seed`, `db:*` scripts)
- `src/auth/auth.guard.ts`, `src/common/category.guard.ts` (and their `.spec.ts` files) — the
  `!useAuth` local-trusted-caller branch described in Decision 3
- PR #151 (`feature/update-local-env-and-docs`, targets `main`, WIP) — prior attempt at this,
  not adopted as a branch, but its guard-fix idea independently re-verified and applied here.
