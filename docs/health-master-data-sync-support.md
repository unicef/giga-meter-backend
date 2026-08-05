# Health Master Data Sync — Giga Meter Backend Support

> **Who does what:** The **pull / stage / promote** jobs live in **giga-maps-backend**
> (`proco/giga_meter/tasks.py`). This NestJS service **owns the database schema**
> those jobs write into, and the **APIs that read** `health` once data exists.
>
> Related giga-maps docs (if you have that repo locally):
> `proco/giga_meter/docs/health-master-sync-overview.md`

---

## Why Giga Meter Backend needs any change

School master sync already reads/writes:

| Concern | Table / column |
| -------- | -------------- |
| Staging | `master_sync_intermediate` |
| Live facility | `school` |
| History snapshot | `master_sync_school_static` |
| “How far did we sync?” | `country.latest_school_master_data_version` |

Health facilities need the same shape. Most of that schema was added in Health Entity V1
(`health`, `master_sync_intermediate_health`, `master_sync_health_static`).  

The gap: **no health CDC watermark** on `country`, so a health sync job cannot track
Delta table versions **without colliding with the school watermark**.

---

## What was already done (no further Nest work for master tables)

| Piece | Status |
| ----- | ------ |
| `health` table | Done (Phase 1 health migrations) |
| `master_sync_health_static` | Done |
| `master_sync_intermediate_health` | Done |
| Circular FK `health.last_health_static_id` | Done |
| `facility_type` seeds (`school` / `health`) | Done + codes normalized (`school`/`health`) |
| Health registration / measurement APIs | Done (read `health`; write registration/measurements) |

Nest does **not** implement Delta Sharing master pull. That is intentional: school master
sync is owned by giga-maps Celery.

---

## Changes applied for health master sync support

### 1. `country.latest_health_master_data_version` (this work)

| Item | Detail |
| ---- | ------ |
| Prisma | `country.latest_health_master_data_version Int?` |
| Migration | `20260805180000_add_country_latest_health_master_data_version` |
| Purpose | Per-country incremental version of the health master feed (same role as `latest_school_master_data_version` for schools) |
| Writer | giga-maps-backend health master sync (not Nest API handlers) |
| Reader | That same sync job on the next run |

### 2. Test fixtures

- Country mocks that construct full Prisma `country` rows must include the new field
  (nullable is fine).

---

## What Giga Meter Backend still does **not** own

These remain outside this service (or still need product decisions):

| Item | Owner / note |
| ---- | ------------ |
| Delta Sharing health feed config & credentials | Data platform + giga-maps env |
| Celery load → promote → delete chain | **giga-maps-backend** `tasks.py` / utils / models |
| Unmanaged Django models for health tables | **giga-maps-backend** |
| Signature hash rules for `health.signature` | Product + feed owner (promote job or upstream) |
| Field map feed → `health` vs static | Product + maps sync implementers |
| Soft-delete impact on registrations | Product |
| `dailycheckapp_school` → `registration` backfill | Separate migration script (not master sync) |

---

## Deploy notes

1. Apply Prisma migration on the giga-meter DB:

   ```bash
   npx prisma migrate deploy
   ```

2. After migrate, giga-maps health sync can store and advance
   `country.latest_health_master_data_version` without touching school versions.

3. Do not expose this column on public country APIs unless product asks for it — it is
   an internal CDC bookmark.

---

## Apply order (recommended)

1. **This migration** on shared giga-meter Postgres  
2. giga-maps: Django unmanaged models for health tables + `latest_health_master_data_version` on `GigaMeter_Country`  
3. giga-maps: load utils + Celery tasks  
4. Wire feed config and schedule  

Without step 1, the health sync job has no safe place to store “last version pulled per country.”
