# PR 321: Update measurement handling for Cloudflare protocol

**Status:** Ready for review  
**Branch:** `feat/cloudflare-measurements-v2` → `develop` (target TBD)  
**Commits:** `7e41360` (feature), `82cf5cf` (drop legacy `country_config`), `a3195bd` (docs) — branch tip `a3195bd`  
**Author:** Victor J. Lopez Roque

## Context

Giga Meter must support **multiple measurement providers** (M-Lab NDT and Cloudflare) as part of the dual-protocol rollout. The Daily Check app and admin tooling need:

1. A **protocol-specific upload path** for Cloudflare’s native payload shape.
2. **Queryable protocol discrimination** and derived quality metrics on `measurements` without parsing JSON on every read.
3. **Runtime protocol configuration** per country/school so clients know which provider to run and how long to wait between tests.

M-Lab must remain on the legacy `POST /api/v1/measurements` contract without breaking existing clients.

## Scope

### Modules / areas

| Area | Changes |
| --- | --- |
| `src/measurement/` | Cloudflare DTOs, mapper, quality extraction, query validation, `POST :protocol`, list filters by `protocol` |
| `src/protocol-config/` | New module: resolve + admin CRUD for country/school config |
| `src/country-config/` | **Removed** — legacy CRUD module; superseded by `protocol-config` |
| `src/public/` | Expose protocol-related fields on public measurement responses |
| `src/app.module.ts` | Register `ProtocolConfigController` / `ProtocolConfigService`; unregister `CountryConfigModule` |
| `src/prisma/` | Schema + migrations + optional local seed (`seed.ts`, `local-dev-seed.sql`) |
| `src/common/mock-objects.ts` | Test fixtures for new shapes |

### Database

**Migrations:**

- `20260506140000_protocol_config_tables` — `country_protocol_config`, `school_protocol_config` (FK to `country.code`, unique per country/school).
- `20260512160000_add_measurement_protocol_quality_metrics` — `measurements.protocol` (default `mlab`), nullable quality columns, index on `protocol`.
- `20260518164253_remove_old_country_config` — drops legacy `country_config` table and `MeasurementProvider` enum (replaced by protocol-config tables).

**Schema highlights:**

- `measurements.protocol`: `mlab` \| `cloudflare`, default `mlab`, backfill for existing rows.
- Quality columns: `download_latency`, `upload_latency`, `download_jitter`, `upload_jitter`, `jitter`, `packet_loss`, `network_quality_score` (nullable; populated for Cloudflare on write).

### API

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/measurements/:protocol` | Phase 1: `cloudflare` only; `mlab` reserved → 400 “not implemented” |
| `POST` | `/api/v1/measurements` | Unchanged legacy M-Lab path |
| `GET` | `/api/v1/measurements`, `/v2`, etc. | Optional `protocol=mlab\|cloudflare` query filter |
| `GET` | `/api/v1/protocol-config/resolve` | School → country → default resolution |
| `PUT` / `DELETE` | `/api/v1/protocol-config/country/:countryCode` | Admin upsert/delete |
| `PUT` / `DELETE` | `/api/v1/protocol-config/school/:gigaIdSchool` | Admin upsert/delete |

**Removed (breaking for any caller still on legacy config API):**

| Method | Path | Replacement |
| --- | --- | --- |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/country-config` and `/api/v1/country-config/:code` | `protocol-config` resolve + country/school admin routes |

## Summary of changes

- Added typed **Cloudflare measurement DTO** and **mapper** → internal `AddMeasurementDto` for shared `createMeasurement()` persistence.
- Implemented **`measurement-quality-metrics.ts`**: extracts latency, jitter, packet loss, and `network_quality_score` (average of streaming/gaming/rtc score points) from Cloudflare `results`; malformed JSON does not fail inserts (nulls + tolerant parsing).
- Extended **measurement list/create** paths with `protocol` discriminator and validation (`measurement-query-validation.ts`, `measurement-upload-protocol.ts`).
- Introduced **`protocol-config` module** with precedence: school override (only if at least one field set) → country → default (`mlab`, `0` sec delay).
- Wired module in `AppModule`; updated public API DTOs/services for new fields.
- **Removed legacy `country-config` module** (`CountryConfig` Prisma model, `MeasurementProvider` enum, `/api/v1/country-config/*`). Runtime config is exclusively via `protocol-config`.
- Added unit tests: mapper, quality metrics, controller protocol route, service, protocol-config service, ping-aggregation/scheduler/public spec adjustments.

**Note:** Commit `7e41360` does **not** modify `package.json` / `package-lock.json` (dependency bump was reverted before amend). Commit message still mentions schedule/cron — ignore for dependency audit.

## Technical decisions

### Decision 1: Protocol route only for Cloudflare (phase 1)

- **Chosen:** `POST /api/v1/measurements/cloudflare` with native camelCase body; `mlab` listed as reserved, returns 400 if called on protocol route.
- **Alternatives considered:** Single POST with body `Protocol` discriminator; immediate `mlab` on protocol route.
- **Rationale:** Proven mapping without forcing client envelope unification; legacy M-Lab clients unchanged.
- **Trade-offs:** Two upload URLs until phase 2 adds `mlab` on `:protocol`.

### Decision 2: Explicit columns + retained `results` JSON

- **Chosen:** Persist `protocol` and nullable quality columns on write; keep full provider `results` blob.
- **Alternatives considered:** Infer protocol from JSON at query time only; drop raw JSON after extraction.
- **Rationale:** Index-friendly filtering/sorting; audit and backfill remain possible.
- **Trade-offs:** Extraction logic must stay aligned with Cloudflare schema evolution; historical rows keep `mlab` default with null quality columns.

### Decision 3: Protocol config resolution precedence

- **Chosen:** `school_protocol_config` → `country_protocol_config` → default (`mlab`, `betweenTestsDelaySec: 0`); school row applies only when `measurement_provider` or `between_tests_delay_sec` is non-null.
- **Alternatives considered:** Country-only config; merge partial school fields with country defaults field-by-field.
- **Rationale:** Matches product rule “school overrides country”; avoids empty school rows shadowing country config.
- **Trade-offs:** Invalid stored provider strings coerce to `mlab` silently in resolver.

### Decision 4: Quality extraction is best-effort

- **Chosen:** `firstFiniteNumber` / nested key fallbacks for packet loss; skip invalid values; never throw on partial `results`.
- **Rationale:** Upload success is more important than perfect analytics on edge payloads.
- **Trade-offs:** Some metrics may be null even when present under unexpected key shapes.

### Decision 5: Retire `country-config` in favor of `protocol-config`

- **Chosen:** Drop `country_config` table, `MeasurementProvider` enum, Nest `country-config` module, and `/api/v1/country-config/*` in the same rollout as protocol-config.
- **Alternatives considered:** Keep `country-config` as a compatibility shim mapping to `measurementProvider` only; dual-write during transition.
- **Rationale:** `country_protocol_config` / `school_protocol_config` are the single source of truth; no in-repo consumers of the legacy API; avoids two admin surfaces and a dead Prisma model after migration.
- **Trade-offs:** External callers (if any) on `/api/v1/country-config` must migrate to `GET /api/v1/protocol-config/resolve` and admin upsert routes.

## Out of scope / deferred

- `POST /api/v1/measurements/mlab` on protocol route (reserved, not implemented).
- Offline IndexedDB retry for Cloudflare uploads (frontend / Daily Check app).
- Backfill of quality columns from legacy `results` JSON.
- `package.json` prisma seed script / `db:seed` npm script (reverted; seed still runnable via `npx ts-node src/prisma/seed.ts` if needed locally).

## Validation

- [x] `npm run test -- --testPathPattern="measurement|protocol-config|cloudflare"` — 4 suites passed, 56 tests passed; 2 suites failed in local env (`Users` missing from `@prisma/client` — run `npx prisma generate` before full suite; 1 pre-existing `createMultipleMeasurement` assertion failure).
- [x] `npm run build` — passes after `country-config` removal.
- [x] Manual: `POST /api/v1/measurements/cloudflare` with fixture payload; `GET /api/v1/protocol-config/resolve?gigaIdSchool=...`
- [x] Confirm `/api/v1/country-config` no longer registered (404 or absent from Swagger).

## Documentation updated

- [x] `/docs/CURRENT_STATE.md` — measurements, protocol-config; legacy `country-config` removed
- [x] `/docs/adr/001-dual-protocol-measurements-and-config.md` — retirement of `country_config`
- [x] `/docs/CHANGELOG.md`
- [x] `/prs/321-cloudflare-measurements-protocol.md` — this record (legacy API removal)

## Links

- GitHub PR: https://github.com/unicef/giga-meter-backend/pull/321
- ADR: `/docs/adr/001-dual-protocol-measurements-and-config.md`
