-- Convert measurement_provider (single string, incl. legacy 'both') into
-- measurement_providers (string[]). Data-preserving: ADD -> backfill -> DROP in one
-- migration so Prisma does not emit a destructive DROP+ADD.
--
-- NOTE: the new columns are intentionally created WITHOUT NOT NULL / DEFAULT, to match
-- exactly how Prisma renders a `String[] @db.VarChar(32)` field (see precedent
-- `category_config.allowedCountries TEXT[]`). Adding constraints here would make the
-- next `prisma migrate dev --create-only` emit a non-empty drift migration.
-- Semantics: empty array ([]) / NULL means "inherit from country / default"; the
-- service (coerceProviders) normalizes both to []. The universal default is ['mlab'].

-- country_protocol_config: 'both'->['mlab','cloudflare'], else single-element array,
-- unknown/invalid -> ['mlab'] (mirrors coerceProviders fallback).
ALTER TABLE "country_protocol_config" ADD COLUMN "measurement_providers" VARCHAR(32)[];

UPDATE "country_protocol_config"
SET "measurement_providers" =
  CASE lower(trim("measurement_provider"))
    WHEN 'both'       THEN ARRAY['mlab', 'cloudflare']::VARCHAR(32)[]
    WHEN 'cloudflare' THEN ARRAY['cloudflare']::VARCHAR(32)[]
    WHEN 'mlab'       THEN ARRAY['mlab']::VARCHAR(32)[]
    ELSE ARRAY['mlab']::VARCHAR(32)[]
  END;

ALTER TABLE "country_protocol_config" DROP COLUMN "measurement_provider";

-- school_protocol_config: NULL (inherits) -> [] ; same mapping otherwise.
ALTER TABLE "school_protocol_config" ADD COLUMN "measurement_providers" VARCHAR(32)[];

UPDATE "school_protocol_config"
SET "measurement_providers" =
  CASE
    WHEN "measurement_provider" IS NULL THEN ARRAY[]::VARCHAR(32)[]
    ELSE
      CASE lower(trim("measurement_provider"))
        WHEN 'both'       THEN ARRAY['mlab', 'cloudflare']::VARCHAR(32)[]
        WHEN 'cloudflare' THEN ARRAY['cloudflare']::VARCHAR(32)[]
        WHEN 'mlab'       THEN ARRAY['mlab']::VARCHAR(32)[]
        ELSE ARRAY['mlab']::VARCHAR(32)[]
      END
  END;

ALTER TABLE "school_protocol_config" DROP COLUMN "measurement_provider";
