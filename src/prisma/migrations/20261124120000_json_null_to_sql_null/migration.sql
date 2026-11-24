-- Prisma writes a JavaScript null in a Json? column as the JSON literal null
-- ('null'::jsonb), not as SQL NULL. Until now the API passed plain nulls for
-- absent Json values (device_context whenever the client sends none,
-- wifi_connections when the client sends null), so those rows passed
-- `WHERE col IS NOT NULL` and any query relying on that filter counted empty
-- records. The API now writes Prisma.DbNull, which stores SQL NULL; this
-- turns the JSON nulls already stored into SQL NULL as well.
--
-- One pass per table: NULLIF leaves every non-null value untouched, and the
-- WHERE clause only rewrites rows holding at least one JSON null.

UPDATE "measurements"
SET "client_info"      = NULLIF("client_info", 'null'::jsonb),
    "server_info"      = NULLIF("server_info", 'null'::jsonb),
    "results"          = NULLIF("results", 'null'::jsonb),
    "wifi_connections" = NULLIF("wifi_connections", 'null'::jsonb),
    "device_context"   = NULLIF("device_context", 'null'::jsonb)
WHERE "client_info" = 'null'::jsonb
   OR "server_info" = 'null'::jsonb
   OR "results" = 'null'::jsonb
   OR "wifi_connections" = 'null'::jsonb
   OR "device_context" = 'null'::jsonb;

UPDATE "measurements_failed"
SET "client_info"    = NULLIF("client_info", 'null'::jsonb),
    "server_info"    = NULLIF("server_info", 'null'::jsonb),
    "results"        = NULLIF("results", 'null'::jsonb),
    "device_context" = NULLIF("device_context", 'null'::jsonb)
WHERE "client_info" = 'null'::jsonb
   OR "server_info" = 'null'::jsonb
   OR "results" = 'null'::jsonb
   OR "device_context" = 'null'::jsonb;

UPDATE "dailycheckapp_school"
SET "wifi_connections" = NULL
WHERE "wifi_connections" = 'null'::jsonb;
