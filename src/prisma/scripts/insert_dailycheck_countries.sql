INSERT INTO public.dailycheckapp_country (
    id,
    code,
    code_iso3,
    name,
    country_id,
    created_at
) VALUES 
    ('13', 'AI', 'AIA', 'Anguilla', '222', NULL),
    ('16', 'AG', 'ATG', 'Antigua and Barbuda', '238', NULL),
    ('11', 'BB', 'BRB', 'Barbados', '134', NULL),
    ('23', 'BZ', 'BLZ', 'Belize', '191', NULL),
    ('30', 'BA', 'BIH', 'Bosnia and Herzegovina', '200', '2024-10-24T12:54:57.588Z'),
    ('4', 'BW', 'BWA', 'Botswana', '201', NULL),
    ('32', 'BR', 'BRA', 'Brazil', '144', '2025-04-03T08:54:54.393Z'),
    ('12', 'VG', 'VGB', 'British Virgin Islands', '332', NULL),
    ('24', 'FR', 'FRN', 'France', '250', '2024-08-27T15:52:18.409Z'),
    ('9', 'GD', 'GRD', 'Grenada', '258', NULL),
    ('34', 'ES', 'ESP', 'Spain', '216', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
SET 
    code = EXCLUDED.code,
    code_iso3 = EXCLUDED.code_iso3,
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    created_at = EXCLUDED.created_at;