# ADR 002: Backend hands out M-Lab priority lookup tokens

**Date:** 2026-11-24  
**Status:** Proposed  
**PR:** —

## Context

Before each ndt7 speed test the Giga Meter Windows app asks M-Lab's Locate service
for a server. The public lookup (`/v2/nearest/ndt/ndt7`) is rate limited per client IP,
and schools where many PCs share one connection, running scheduled tests, can reach
that limit: Locate then answers `429 Too many periodic requests` and the test fails.

M-Lab offers registered client integrations a priority lookup
(`/v2/priority/nearest/ndt/ndt7`) with higher limits. Access is a JWT sent as
`Authorization: Bearer`, obtained by exchanging the integration's API key at M-Lab's
token exchange (`POST /v0/token/integration`, `{ "api_key": … }` → `{ "token": … }`).
The token expires 20 seconds after it is issued. The API key must not ship inside the
app, where anyone can read it.

## Decision

- `GET /api/v1/mlab/locate-token` (app API key, throttled) exchanges `MLAB_API_KEY` for
  a token on every request and returns `{ token, locate_url }` in the usual
  `{ success, data, timestamp, message }` envelope. Nothing is cached: tokens are too
  short-lived.
- Configured by environment only: `MLAB_API_KEY` (unset: `token` is null),
  `MLAB_TOKEN_EXCHANGE_URL` (default: M-Lab production exchange), `MLAB_LOCATE_URL`
  (optional lookup URL for the app to call instead of M-Lab's default priority endpoint).
- Any exchange failure (bad key, timeout after 3 s, no token in the reply) returns nulls
  with 200, and only the HTTP status is logged; the axios error carries the key.
- The app (from 2.0.4) asks right before each test's server lookup, and falls back to
  the public lookup on any failure here or at M-Lab. It sends `giga_id_school`, unused
  for now, so access can later be turned on for some schools first.

## Consequences

- Switching the app to the priority lookup, and back, is a backend configuration
  change; no app release.
- One call to M-Lab's token exchange per speed test while `MLAB_API_KEY` is set.
- The app records which lookup each test used in `server_info.LocateTier`
  (`priority` / `public`) and, when the priority one was offered but not used, why in
  `server_info.PriorityLocateError`. A token M-Lab refuses shows there as
  `refused or unreachable`, not `HTTP 401`: M-Lab sends that 401 without CORS headers,
  so the app cannot read its status.

## Alternatives considered

- **Token inside the app:** the API key would be public, and changing it would need a
  release.
- **Caching the token:** it lasts 20 seconds, and reuse across clients is not documented
  by M-Lab.
- **Feature flags endpoint:** cached by the app for six hours, far longer than a token
  lives.
