# Current state — giga-meter-backend

_Last reviewed: 2026-08-31_

> **Maintainers:** update this file when merging PRs. Do not store PR narratives here — use `/prs/{number}-{slug}.md`. This file is a link-first index, not a full narrative — see [How to keep this current](#how-to-keep-this-current).

## Stack

- NestJS 10, Prisma 5, PostgreSQL/PostGIS, Redis (cache/throttle)
- Entry: `src/main.ts`, root module: `src/app.module.ts`

## Core modules (high level)

| Module | Role |
| --- | --- |
| `measurement` | Speed/latency uploads (M-Lab legacy + protocol-specific routes) |
| `protocol-config` | Country/school protocol resolution and admin CRUD |
| `school`, `school-master` | Daily Check installations and canonical school data |
| `country` | Country metadata and API segmentation |
| `auth` | API keys, device tokens, HMAC |
| `connectivity`, `ping-aggregation` | Router ping snapshots and aggregation |
| `public` | Public/category-filtered read APIs |
| `scheduler` | Cron jobs (`@nestjs/schedule`) |

## Measurements & protocols

See [ADR 001](./adr/001-dual-protocol-measurements-and-config.md) for design rationale (PR 321).

- Legacy M-Lab path: existing measurement create/list flows; `protocol` defaults to `mlab`.
- Cloudflare path: `POST /api/v1/measurements/:protocol` with mapping in `cloudflare-measurement.mapper.ts`; quality fields extracted in `measurement-quality-metrics.ts`.
- `measurements` table includes `protocol` and nullable quality columns; full `results` JSON retained.

## Protocol configuration

Documented in [ADR 001](./adr/001-dual-protocol-measurements-and-config.md).

- Tables: `country_protocol_config`, `school_protocol_config` (see migrations under `src/prisma/migrations/`).
- Resolution: school override → country → default (`protocol-config.service.ts`).
- Endpoints: `GET /api/v1/protocol-config/resolve`; admin `PUT`/`DELETE` on country and school paths (`protocol-config.controller.ts`).
- **Legacy removed:** `country_config` table, `MeasurementProvider` enum, and `/api/v1/country-config/*` (Nest module deleted). Do not add a `country-config` module — use `protocol-config` only.

## Local data

- Migrations: `npx prisma migrate deploy` / `migrate dev`
- `docker-compose.yml` at repo root spins up local Postgres + Redis: `docker compose up -d`, then `node scripts/wait-for-db.js && npx prisma migrate dev && npx prisma db seed` (see README's Local Database (Docker) section for the full sequence — no `npm run db:*` shortcuts, run these directly). Postgres is a custom build (`docker/postgres.Dockerfile`, `FROM postgres:15` + the `postgis` extension package) — matches staging's actual server (confirmed via a staging `pg_dump` header: PostgreSQL 15.16 with `postgis`); the plain `postgres:15` image has no PostGIS extension files and can't run the `school_geopoint_geographqy` migration. See [ADR 002](./adr/002-local-dev-db-tooling.md).
- Seeding is wired: `package.json`'s `prisma.seed` runs `src/prisma/seed.ts`, which applies `src/prisma/scripts/country-insert-script.sql` and `local-dev-seed.sql` (countries, a master `school` row, and `dailycheckapp_school` test installations — one active, one deactivated, for testing both paths). `prisma migrate dev`'s own auto-seed did not reliably fire in testing — always run `npx prisma db seed` explicitly as its own step after migrating. All seed SQL upserts (`ON CONFLICT`), safe to re-run.
- `USE_AUTH="false"` now grants full local access, including write endpoints (`POST`/`PUT`) — `auth.guard.ts`/`category.guard.ts` treat a disabled-auth caller as fully trusted (`category: giga_meter`) rather than falling through to the read-only `PUBLIC` default. Scoped strictly to `!useAuth`, same trust boundary `AuthGuard` already used to skip token validation entirely — does not change behavior when `USE_AUTH="true"` (real category-based access control, matching production, still applies). See [ADR 002](./adr/002-local-dev-db-tooling.md).

## TODO (populate as needed)

- Full route list: add `docs/API_ROUTES.md`
- Env vars: add `docs/ENV_VARS.md`

## How to keep this current

- **Link-first:** keep this file as a concise index; link to ADRs, [CHANGELOG.md](./CHANGELOG.md), or `/prs/` instead of duplicating detail here.
- **Size cap:** if a section needs more than ~5 bullets, move the detail into a dedicated ADR or doc and link it.
- **TTL:** if `Last reviewed` is older than 14 days, treat this file as stale and re-verify against the code.
- **PR gate:** PRs changing architecture, API, or schema must bump `Last reviewed` and the relevant bullet, or state "no current-state impact".
