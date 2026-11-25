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

## Device ID (TECH-8828)

- Each registration in `dailycheckapp_school` stores the firmware UUID (`device_hardware_id`), `baseboard_serial`, `disk_serial` and `machine_guid`, with the server-given `device_id` and `device_id_flags` (`school/device-id.service.ts`).
- A new PC's `device_id` is a hash (v5 UUID) of those values. Shared values are left out, and the Windows install ID is used only when no hardware value counts. Later registrations keep the ID while no more values changed than still match. When most of them change, it is a new PC and gets the hash of its new values.
- A value on two or more PCs is shared and doesn't count (`<field>_shared`). A hash that is already another PC's ID gives a random ID, flagged `duplicate_values`. Other flags: `<field>_changed`, `conflict`, `nothing_readable`, `device_id_failed`.

## Registrations (app instances)

- Each row in `dailycheckapp_school` is one app instance: the app installed under one Windows user, for one registration. The app generates `app_instance_id` (unique) and sends `registration_source`: `manual` when the user picked the school, `auto` when the app registered by itself at the school of the PC's existing registration (`school/school.service.ts`).
- `POST /api/v1/dailycheckapp_schools` with an `app_instance_id` returns that instance's row if it exists (409 if it's at another school), otherwise stores a new row, even when the PC already has one at the school. Without one (older apps), same school + same `device_hardware_id` + active returns the existing row, as before.
- `GET checkExistingInstallation/:device_hardware_id` returns the newest active registration, and nothing when the hardware ID is active at two or more schools.

## M-Lab priority server lookup

See [ADR 002](./adr/002-mlab-priority-locate-token.md).

- `GET /api/v1/mlab/locate-token` (app key): exchanges `MLAB_API_KEY` at M-Lab for a 20 s token on each call; nulls when unset or on any failure, and the app then uses the public lookup.
- Env: `MLAB_API_KEY`, `MLAB_TOKEN_EXCHANGE_URL` (default M-Lab production), `MLAB_LOCATE_URL` (optional).

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
