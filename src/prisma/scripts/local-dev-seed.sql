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

INSERT INTO public.school (
    id,
    external_id,
    name,
    country_id,
    country_code,
    address,
    giga_id_school
) VALUES (
    14,
    'SpainTestSchool1',
    'Spain test school 1',
    216,
    'ES',
    'Spain',
    '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05'
);

-- dailycheckapp_school is the table the schools API (GET/POST /api/v1/dailycheckapp_schools,
-- checkExistingInstallation, checkDeviceStatus, deactivate) actually reads and writes.
-- The Spain master record above only backs resolveIsVerified()/master-data joins; without a
-- row here there is no installation to fetch, check, or deactivate locally. Fixed ids are used
-- (mac_address/device_hardware_id have no unique constraint on this schema to upsert on).
INSERT INTO public.dailycheckapp_school (
    id,
    user_id,
    giga_id_school,
    mac_address,
    device_hardware_id,
    os,
    app_version,
    created,
    network_information,
    ip_address,
    country_code,
    is_blocked,
    notify,
    is_active
) VALUES
    (
        90001,
        'test-user-001',
        '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05',
        'AA:BB:CC:DD:EE:01',
        'test-hardware-id-001',
        'Windows',
        '1.0.0',
        '2026-01-01T00:00:00.000Z',
        'wifi',
        '127.0.0.1',
        'ES',
        false,
        false,
        true
    ),
    (
        90002,
        'test-user-002',
        '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05',
        'AA:BB:CC:DD:EE:02',
        'test-hardware-id-002',
        'Windows',
        '1.0.0',
        '2026-01-01T00:00:00.000Z',
        'wifi',
        '127.0.0.1',
        'ES',
        false,
        false,
        false
    )
ON CONFLICT (id) DO UPDATE
SET
    user_id = EXCLUDED.user_id,
    giga_id_school = EXCLUDED.giga_id_school,
    mac_address = EXCLUDED.mac_address,
    device_hardware_id = EXCLUDED.device_hardware_id,
    os = EXCLUDED.os,
    app_version = EXCLUDED.app_version,
    created = EXCLUDED.created,
    network_information = EXCLUDED.network_information,
    ip_address = EXCLUDED.ip_address,
    country_code = EXCLUDED.country_code,
    is_blocked = EXCLUDED.is_blocked,
    notify = EXCLUDED.notify,
    is_active = EXCLUDED.is_active;
