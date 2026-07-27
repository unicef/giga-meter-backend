-- The health seed inserted facility_type codes as 'SCHL'/'HLTH', but the
-- whole codebase and the v2 API contract key on code = 'school'/'health'
-- (FacilityTypeService.getByCode, facility_type in JSON payloads).
-- Normalize existing rows and make the seed self-sufficient for fresh DBs.

UPDATE "facility_type" SET "code" = 'school' WHERE "code" = 'SCHL';
UPDATE "facility_type" SET "code" = 'health' WHERE "code" = 'HLTH';

INSERT INTO "facility_type" ("name", "code")
VALUES ('school', 'school')
ON CONFLICT DO NOTHING;

INSERT INTO "facility_type" ("name", "code")
VALUES ('health', 'health')
ON CONFLICT DO NOTHING;
