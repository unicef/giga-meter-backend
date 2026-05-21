INSERT INTO "entity_type" ("name", "code")
VALUES ('school', 'SCHL')
ON CONFLICT DO NOTHING;

INSERT INTO "entity_type" ("name", "code")
VALUES ('health', 'HLTH')
ON CONFLICT DO NOTHING;
