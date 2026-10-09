-- Store every giga id in the same trimmed lowercase form the API now
-- writes and looks up. Only rows that are not already in that form are
-- rewritten. connectivity_ping_checks is large, so the WHERE clause skips
-- ids that are already lowercase.
--
-- school_protocol_config is unique on giga_id_school. When two casings
-- collapse to one id, the older row is kept.
--
-- Daily aggregates that collapse onto the same school, device, and day are
-- summed into the oldest row. The extras are deleted so one school does not
-- keep two partial uptime rows.

UPDATE "dailycheckapp_school"
SET "giga_id_school" = lower(btrim("giga_id_school"))
WHERE "giga_id_school" IS NOT NULL
  AND "giga_id_school" IS DISTINCT FROM lower(btrim("giga_id_school"));

UPDATE "school"
SET "giga_id_school" = lower(btrim("giga_id_school"))
WHERE "giga_id_school" IS NOT NULL
  AND "giga_id_school" IS DISTINCT FROM lower(btrim("giga_id_school"));

UPDATE "school_new_registration"
SET "giga_id_school" = lower(btrim("giga_id_school"))
WHERE "giga_id_school" IS DISTINCT FROM lower(btrim("giga_id_school"));

UPDATE "giga_id_school_mapping_fix"
SET "giga_id_school_wrong" = lower(btrim("giga_id_school_wrong")),
    "giga_id_school_correct" = lower(btrim("giga_id_school_correct"))
WHERE "giga_id_school_wrong" IS DISTINCT FROM lower(btrim("giga_id_school_wrong"))
   OR "giga_id_school_correct" IS DISTINCT FROM lower(btrim("giga_id_school_correct"));

DELETE FROM "school_protocol_config" AS extra
USING "school_protocol_config" AS keep
WHERE lower(btrim(extra."giga_id_school")) = lower(btrim(keep."giga_id_school"))
  AND extra.id > keep.id;

UPDATE "school_protocol_config"
SET "giga_id_school" = lower(btrim("giga_id_school"))
WHERE "giga_id_school" IS DISTINCT FROM lower(btrim("giga_id_school"));

UPDATE "connectivity_ping_checks"
SET "giga_id_school" = lower(btrim("giga_id_school"))
WHERE "giga_id_school" IS DISTINCT FROM lower(btrim("giga_id_school"));

WITH ranked AS (
  SELECT
    id,
    lower(btrim(giga_id_school)) AS giga_norm,
    SUM(is_connected_true) OVER w AS sum_true,
    SUM(is_connected_all) OVER w AS sum_all,
    SUM(COALESCE(unloaded_latency_avg, 0) * is_connected_all) OVER w AS weighted_latency,
    SUM(
      CASE
        WHEN unloaded_latency_avg IS NULL THEN 0
        ELSE is_connected_all
      END
    ) OVER w AS latency_weight,
    COUNT(*) OVER w AS copies,
    ROW_NUMBER() OVER (
      PARTITION BY timestamp_date, lower(btrim(giga_id_school)), browser_id
      ORDER BY id
    ) AS rn
  FROM "connectivity_ping_checks_daily_aggr"
  WINDOW w AS (
    PARTITION BY timestamp_date, lower(btrim(giga_id_school)), browser_id
  )
)
UPDATE "connectivity_ping_checks_daily_aggr" AS dest
SET
  "giga_id_school" = ranked.giga_norm,
  "is_connected_true" = ranked.sum_true::integer,
  "is_connected_all" = ranked.sum_all::integer,
  "uptime" = CASE
    WHEN ranked.sum_all = 0 THEN 0
    ELSE (ranked.sum_true::double precision / ranked.sum_all) * 100
  END,
  "unloaded_latency_avg" = (
    ranked.weighted_latency / NULLIF(ranked.latency_weight, 0)
  )::double precision
FROM ranked
WHERE dest.id = ranked.id
  AND ranked.rn = 1
  AND (
    ranked.copies > 1
    OR dest."giga_id_school" IS DISTINCT FROM ranked.giga_norm
  );

DELETE FROM "connectivity_ping_checks_daily_aggr" AS dest
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY timestamp_date, giga_id_school, browser_id
        ORDER BY id
      ) AS rn
    FROM "connectivity_ping_checks_daily_aggr"
  ) AS numbered
  WHERE numbered.rn > 1
) AS extra
WHERE dest.id = extra.id;
