# Health Entity V1 — Migration Status

> Tracks which items from the design doc (`health-entity-v1-prisma-migration.md`) have been addressed by the three Prisma migrations applied in this branch.

---

## Migrations Applied

| # | Migration | What it does |
|---|---|---|
| Phase 1 | `20260518232740_add_health_entity_tables` | Creates all 6 new tables with indexes and FKs. Adds back-relations to `country` and `school`. |
| Phase 2 | `20260521120332_add_health_columns_to_existing_tables` | Adds `entity_type_id`, `registration_id`, `giga_id_health` to `measurements` and `connectivity_ping_checks` with indexes and FKs. |
| Phase 3 | `20260521124932_add_health_make_school_id_giga_id_nullable` | Makes `measurements.school_id` and `connectivity_ping_checks.giga_id_school` nullable. |
| Phase 4 | `20260624120000_rename_entity_type_to_facility_type` | Renames `entity_type` → `facility_type`, `entity_type_id` → `facility_type_id`, `country_entity_type_whitelist` → `country_facility_type_whitelist`. |

---

## New Models (6) — all Phase 1

| Model | Table | Status |
|---|---|---|
| `facility_type` | `facility_type` | ✅ Created (renamed from `entity_type` in Phase 4) |
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
| Seed `entity_type` rows: `{ name: "school" }`, `{ name: "health" }` | ⚠️ **NOT IN MIGRATION** | Design doc requires this in the same migration. Needs a separate seed script or added to Phase 1 SQL manually. |
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

### 4. Seed data gap
The design doc checklist requires `entity_type` seed rows (`school`, `health`) to be inserted in the same migration as the table creation. This was not included in Phase 1. The seed data must be applied before any application code attempts to resolve entity types by name. **Action required before going live.**

---

## What Is Not Covered by These Migrations

| Item | Notes |
|---|---|
| `dailycheckapp_school` → `registration` data migration | Python script, separate task |
| `entity_type` seed data | Must be added to Phase 1 SQL or run as a standalone script |
| Application logic changes (endpoints, services) | Outside scope of schema migrations |
| `master_sync_intermediate` / `master_sync_intermediate_health` country FK standardisation | Deferred to V2 per design doc |
