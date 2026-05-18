# ADR 001: Dual-protocol measurements and protocol configuration

**Date:** 2026-05-18  
**Status:** Accepted  
**PR:** 321

## Context

Giga Meter must ingest connectivity measurements from more than one provider. M-Lab NDT
already uses a legacy `POST /api/v1/measurements` envelope. Cloudflare exposes a different
camelCase payload with richer quality signals inside `results`.

Clients and admin tooling also need to know **which provider to run** and **delay between
tests** per deployment context (school or country), without hard-coding defaults in the app.

## Decision

### 1. Protocol-specific upload (phase 1: Cloudflare)

- Add `POST /api/v1/measurements/:protocol` with native provider body validation.
- Implement **Cloudflare only** in phase 1; treat `mlab` as reserved on this route (400).
- Map Cloudflare payloads to the existing `AddMeasurementDto` and reuse
  `createMeasurement()` so persistence stays single-path.
- Keep legacy M-Lab on `POST /api/v1/measurements` unchanged.

### 2. Persisted discriminator and derived quality columns

- Add `measurements.protocol` (`mlab` | `cloudflare`), default `mlab`, indexed.
- Add nullable quality columns populated on write for Cloudflare:
  `download_latency`, `upload_latency`, `download_jitter`, `upload_jitter`, `jitter`,
  `packet_loss`, `network_quality_score`.
- Retain full `results` JSON for audit and analytics.
- Extract metrics in `measurement-quality-metrics.ts` with tolerant parsing; malformed
  partial payloads must **not** fail inserts (nulls instead).
- `network_quality_score` = average of available Cloudflare score points
  (streaming, gaming, rtc).
- List endpoints accept optional `protocol` filter.

### 3. Protocol configuration resolution

- New tables `country_protocol_config` and `school_protocol_config`.
- Resolution precedence: **school → country → default** (`mlab`, `betweenTestsDelaySec: 0`).
- A school row applies only when `measurement_provider` or `between_tests_delay_sec` is
  non-null (empty rows do not shadow country config).
- Invalid stored provider values coerce to `mlab` in the resolver.
- Expose `GET /api/v1/protocol-config/resolve` and admin upsert/delete per country/school.

## Consequences

**Pros**

- Cloudflare rollout without breaking M-Lab clients.
- Filter and sort by provider without JSON parsing at read time.
- Centralized runtime config for multi-provider UX.
- One persistence pipeline for all providers that use the protocol route.

**Cons**

- Two upload URLs until M-Lab moves to `:protocol` (phase 2).
- Quality columns require maintenance when Cloudflare `results` shape changes.
- Historical rows stay `mlab` with null quality columns unless backfilled later.
- School/country config invalid values fail silently to default in resolve.

## Alternatives considered

- **Single POST with body `Protocol` field:** rejected for phase 1; forces client envelope
  unification before provider mapping was proven.
- **Infer provider from `results` at query time:** rejected; brittle and not index-friendly.
- **Drop `results` after extraction:** rejected; audit and backfill depend on raw payloads.
- **Country-only config (no school override):** rejected; product requires per-school overrides.
- **Fail inserts on malformed Cloudflare metrics:** rejected; upload success outweighs
  incomplete analytics.

## Related documentation

- PR record: `/prs/321-cloudflare-measurements-protocol.md`
- Migrations: `20260506140000_protocol_config_tables`,
  `20260512160000_add_measurement_protocol_quality_metrics`
