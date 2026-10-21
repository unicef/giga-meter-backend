# Health Entity V1 — Migration Status

> Tracks which items from the design doc (`health-entity-v1-prisma-migration.md`) have been addressed by the health Prisma migration.

---

## Migrations Applied

All of the health schema ships in one migration, `20261014114248_add_health_facilities`. Every statement in it
is guarded (`IF NOT EXISTS`, or a `pg_constraint` check for foreign keys), so it is a
no-op for whatever already exists and can run on a database that already has part or
all of this schema.

| Part | What it does |
|---|---|
| Phase 1 | Creates all 6 new tables with indexes and FKs. Adds back-relations to `country` and `school`. |
| Phase 2 | Adds `facility_type_id`, `registration_id`, `giga_id_health` to `measurements` and `connectivity_ping_checks` with indexes and FKs. |
| Phase 3 | Makes `measurements.school_id` and `connectivity_ping_checks.giga_id_school` nullable. |
| Phase 4 | Uses the `facility_type` naming from the start (`facility_type`, `facility_type_id`, `country_facility_type_whitelist`). |
| Phase 5 | Adds `country.latest_health_master_data_version` for health master CDC (parallel to school watermark). See [health-master-data-sync-support.md](./health-master-data-sync-support.md). |

---

## New Models (6) — all Phase 1

| Model | Table | Status |
|---|---|---|
| `facility_type` | `facility_type` | ✅ Created |
| `health` | `health` | ✅ Created — all columns, indexes, FKs including circular FK with `master_sync_health_static` |
| `registration` | `registration` | ✅ Created — FKs to `facility_type`, `school`, `health` |
| `country_facility_type_whitelist` | `country_facility_type_whitelist` | ✅ Created (renamed from `country_entity_type_whitelist` in Phase 4) |
| `master_sync_health_static` | `master_sync_health_static` | ✅ Created — circular FK with `health` handled correctly |
| `master_sync_intermediate_health` | `master_sync_intermediate_health` | ✅ Created — FK to `country.id` |

---

## Modified Models (4)

| Model | Change | Phase | Status |
|---|---|---|---|
| `school` | `+ registrations registration[]` back-relation | 1 | ✅ Done |
| `country` | `+ healths health[]` | 1 | ✅ Done |
| `country` | `+ master_sync_intermediate_health master_sync_intermediate_health[]` | 1 | ✅ Done |
| `country` | `+ whitelist_entries country_entity_type_whitelist[]` | 1 | ✅ Done |
| `country` | `+ latest_health_master_data_version Int?` | 5 | ✅ Done |
| `measurements` | `+ entity_type_id Int?` | 2 | ✅ Done |
| `measurements` | `+ registration_id BigInt?` | 2 | ✅ Done |
| `measurements` | `+ giga_id_health String?` | 2 | ✅ Done |
| `measurements` | `school_id` made nullable | 3 | ✅ Done |
| `connectivity_ping_checks` | `+ entity_type_id Int?` | 2 | ✅ Done |
| `connectivity_ping_checks` | `+ registration_id BigInt?` | 2 | ✅ Done |
| `connectivity_ping_checks` | `+ giga_id_health String?` | 2 | ✅ Done |
| `connectivity_ping_checks` | `giga_id_school` made nullable | 3 | ✅ Done — see note below |

---

## Migration Checklist vs Design Doc

| Item | Status | Notes |
|---|---|---|
| Seed `entity_type` / `facility_type` rows: `{ name: "school" }`, `{ name: "health" }` | ✅ Done later | Seeded with codes `school`/`health` in `20261014114248_add_health_facilities`, which also normalises rows left with the older `SCHL`/`HLTH` codes. |
| `country.latest_health_master_data_version` for master sync watermark | ✅ Phase 5 | Required by giga-maps health master CDC jobs (must not reuse school watermark). |
| Make `measurements.school_id` nullable | ✅ Phase 3 | |
| Write `registration` population script from `dailycheckapp_school` | ⏳ Out of scope for migrations | Separate Python script task — not a Prisma migration concern. |
| Add `entity_type_id` back-fill on migrated `registration` rows | ⏳ Out of scope for migrations | Part of the population script above. |
| Confirm `registration.country_code` FK to `country.code` | ✅ Decided: no FK | `country_code` is a plain string column on `registration` — no referential constraint added, consistent with design doc decision. |
| Resolve `country_entity_type_whitelist` — use `country.code` not `country.id` | ✅ Done | Our implementation uses `country_code VARCHAR` with FK to `country.code`. Design doc marks v1 target as `country.code`. |
| Confirm `entity_type.code` is needed | ✅ Done | `code VARCHAR UNIQUE` included in Phase 1 `CREATE TABLE`. Both `name` and `code` are present. |

---

## Notes & Deviations from Design Doc

### 1. `connectivity_ping_checks.giga_id_school` made nullable (Phase 3)
The design doc states *"No NOT NULL blockers found"* for `connectivity_ping_checks`, implying `giga_id_school` should remain NOT NULL. Phase 3 makes it nullable — this is a **confirmed, intentional extension** beyond the design doc. Health ping checks have no school ID, so the column must be nullable to accept them. The backend refactor plan enforces that at least one of `giga_id_school` or `giga_id_health` is non-null at the application layer before a ping check is written.

### 2. `entity_type.code` column
The design doc originally described `code` as a future addition (*"add a code varchar(50) UNIQUE column at that point"*) but the checklist marks it as resolved with *"keep both"*. Phase 1 includes `code` in the `CREATE TABLE` definition so no follow-up migration is needed.

### 3. `country_entity_type_whitelist` uses `country.code` not `country.id`
The design doc and checklist confirm `country.code` is the correct V1 target. Our implementation is aligned. The design doc notes `master_sync_intermediate` and `master_sync_intermediate_health` still use `country.id` — those are marked as V2 updates and are not changed here.

### 4. Seed data gap (resolved)
The design doc checklist required `entity_type` seed rows in Phase 1. They are seeded in `20261014114248_add_health_facilities` with the codes `school`/`health`. No further seed migration is required for V1 facility types.

### 5. Health master CDC watermark (Phase 5)
School master sync uses `country.latest_school_master_data_version`. Health master sync needs a **separate** column so the two pipelines do not overwrite each other. Phase 5 adds `latest_health_master_data_version`. Application writers are giga-maps Celery jobs, not Nest request handlers.

---

## What Is Not Covered by These Migrations

| Item | Notes |
|---|---|
| `dailycheckapp_school` → `registration` data migration | Python script, separate task |
| Delta Sharing load / promote / delete pipeline for health | Owned by **giga-maps-backend** (`proco.giga_meter`), not Nest |
| Application logic changes (endpoints, services) | Outside scope of schema migrations (health APIs tracked elsewhere) |
| `master_sync_intermediate` / `master_sync_intermediate_health` country FK standardisation | Deferred to V2 per design doc |
