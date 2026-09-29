-- Converts LastClientMeasurement.ElapsedTime from milliseconds to seconds in
-- stored ndt7 results.
--
-- ElapsedTime is in seconds for the desktop client, the web app, and the
-- Android app from the Go ndt7 client onwards. Earlier Android builds stored
-- milliseconds. New rows are normalized on ingest (see
-- src/measurement/measurement-elapsed-time.ts); this script fixes rows that
-- were stored before that.
--
-- An ndt7 direction lasts about 10 seconds and never close to 100, so a value
-- above 100 can only be milliseconds. A converted value falls below 100, so
-- running the script twice changes nothing the second time.
--
-- This is not a migration and does not run on deploy. Run step 1 to see how
-- many rows change, then step 2.

-- Step 1: rows that will change.
SELECT 'measurements' AS table_name, direction, count(*) AS rows_to_convert
FROM measurements
CROSS JOIN (VALUES ('NDTResult.S2C'), ('NDTResult.C2S')) AS d(direction)
WHERE CASE
        WHEN jsonb_typeof(results -> direction -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> direction -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END
GROUP BY direction
UNION ALL
SELECT 'measurements_failed', direction, count(*)
FROM measurements_failed
CROSS JOIN (VALUES ('NDTResult.S2C'), ('NDTResult.C2S')) AS d(direction)
WHERE CASE
        WHEN jsonb_typeof(results -> direction -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> direction -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END
GROUP BY direction;

-- Step 2: convert.
BEGIN;

UPDATE measurements
SET results = jsonb_set(
  results,
  '{NDTResult.S2C,LastClientMeasurement,ElapsedTime}',
  to_jsonb((results -> 'NDTResult.S2C' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision / 1000)
)
WHERE CASE
        WHEN jsonb_typeof(results -> 'NDTResult.S2C' -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> 'NDTResult.S2C' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END;

UPDATE measurements
SET results = jsonb_set(
  results,
  '{NDTResult.C2S,LastClientMeasurement,ElapsedTime}',
  to_jsonb((results -> 'NDTResult.C2S' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision / 1000)
)
WHERE CASE
        WHEN jsonb_typeof(results -> 'NDTResult.C2S' -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> 'NDTResult.C2S' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END;

UPDATE measurements_failed
SET results = jsonb_set(
  results,
  '{NDTResult.S2C,LastClientMeasurement,ElapsedTime}',
  to_jsonb((results -> 'NDTResult.S2C' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision / 1000)
)
WHERE CASE
        WHEN jsonb_typeof(results -> 'NDTResult.S2C' -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> 'NDTResult.S2C' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END;

UPDATE measurements_failed
SET results = jsonb_set(
  results,
  '{NDTResult.C2S,LastClientMeasurement,ElapsedTime}',
  to_jsonb((results -> 'NDTResult.C2S' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision / 1000)
)
WHERE CASE
        WHEN jsonb_typeof(results -> 'NDTResult.C2S' -> 'LastClientMeasurement' -> 'ElapsedTime') = 'number'
        THEN (results -> 'NDTResult.C2S' -> 'LastClientMeasurement' ->> 'ElapsedTime')::double precision > 100
        ELSE false
      END;

COMMIT;
