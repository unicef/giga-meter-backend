# Current state — giga-meter-backend

_Last reviewed: 2026-11-25_

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
| `mlab` | Tokens for M-Lab's priority server lookup ([ADR 002](./adr/002-mlab-priority-locate-token.md)) |
| `geolocation` | Authenticated proxies for Google Geolocation and Geocoding |

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

## M-Lab priority server lookup

See [ADR 002](./adr/002-mlab-priority-locate-token.md).

- `GET /api/v1/mlab/locate-token` (app key): exchanges `MLAB_API_KEY` at M-Lab for a 20 s token on each call; nulls when unset or on any failure, and the app then uses the public lookup.
- Env: `MLAB_API_KEY`, `MLAB_TOKEN_EXCHANGE_URL` (default M-Lab production), `MLAB_LOCATE_URL` (optional).

## Geolocation proxy

- `POST /api/v1/geolocation/geolocate` (app key, throttled): body is Google's `considerIp` and `wifiAccessPoints` only (`geolocation.dto.ts`), up to 500 access points.
- Only locatable MACs are used (universally administered unicast, deduplicated); the 50 strongest by `signalStrength` (missing strength last) are sent to Google and form the cache key. Fewer than 2 → 422 without a provider call.
- Answers are cached in Redis by hashed access-point set (`geolocation.cache.ts`), for at most 30 days; a not-found for a day. Provider failures open a circuit breaker (`geolocation.circuit.ts`).
- `GET /api/v1/geolocation/geocode` and `/geocode/flexible` (app key): Geocoding proxy.
- Env: `GOOGLE_GEOLOCATION_API_KEY`, `GEOLOCATION_CACHE_TTL_SECONDS` (optional, capped at 30 days), `GEOLOCATION_CACHE_OVERLAP` (optional).

## Local data

- Migrations: `npx prisma migrate deploy` / `migrate dev`
- Optional seed SQL: `src/prisma/scripts/local-dev-seed.sql` (run via `src/prisma/seed.ts` when configured)

## TODO (populate as needed)

- Full route list: add `docs/API_ROUTES.md`
- Env vars: add `docs/ENV_VARS.md`

## How to keep this current

- **Link-first:** keep this file as a concise index; link to ADRs, [CHANGELOG.md](./CHANGELOG.md), or `/prs/` instead of duplicating detail here.
- **Size cap:** if a section needs more than ~5 bullets, move the detail into a dedicated ADR or doc and link it.
- **TTL:** if `Last reviewed` is older than 14 days, treat this file as stale and re-verify against the code.
- **PR gate:** PRs changing architecture, API, or schema must bump `Last reviewed` and the relevant bullet, or state "no current-state impact".
