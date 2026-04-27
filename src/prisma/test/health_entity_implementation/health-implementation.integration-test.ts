import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ensurePrismaScriptFixtures } from './health-impl-seed-data';

describe('Health Entity V1 migration integration tests', () => {
  const prisma = new PrismaClient();
  const countryCode = 'ES';
  const created = {
    registrations: [] as bigint[],
    schools: [] as bigint[],
    healths: [] as bigint[],
    schoolRegistrations: [] as bigint[],
    dailycheckSchools: [] as bigint[],
    schoolGigaIds: [] as string[],
    healthGigaIds: [] as string[],
  };

  const unique = (label: string): string =>
    `it-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const gigaIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const gigaId = (): string => randomUUID().toLowerCase();
  const assertGigaIdFormat = (value: string): void => {
    expect(value).toMatch(gigaIdRegex);
  };

  let schoolEntityTypeId: number;
  let healthEntityTypeId: number;

  const ensureEntityTypeWhitelisted = async (
    code: string,
    entityTypeId: number,
  ): Promise<void> => {
    const whitelistEntry = await prisma.country_entity_type_whitelist.findUnique({
      where: {
        country_code_entity_type_id: {
          country_code: code,
          entity_type_id: entityTypeId,
        },
      },
    });

    if (!whitelistEntry) {
      throw new Error(
        `Country ${code} is not whitelisted for entity_type_id ${entityTypeId}`,
      );
    }
  };

  beforeAll(async () => {
    await prisma.$connect();
    await ensurePrismaScriptFixtures(prisma);

    const [schoolType, healthType, country] = await Promise.all([
      prisma.entity_type.findUnique({ where: { name: 'school' } }),
      prisma.entity_type.findUnique({ where: { name: 'health' } }),
      prisma.country.findUnique({ where: { code: countryCode } }),
    ]);

    if (!schoolType || !healthType) {
      throw new Error('Missing entity_type seed rows (school/health).');
    }
    if (!country) {
      throw new Error(`Missing country row for code=${countryCode}.`);
    }

    schoolEntityTypeId = schoolType.id;
    healthEntityTypeId = healthType.id;
  });

  afterAll(async () => {
    await prisma.measurements.deleteMany({
      where: {
        OR: [
          { registration_id: { in: created.registrations } },
          { giga_id_school: { in: created.schoolGigaIds } },
          { giga_id_health: { in: created.healthGigaIds } },
        ],
      },
    });

    await prisma.connectivity_ping_checks.deleteMany({
      where: {
        OR: [
          { registration_id: { in: created.registrations } },
          { giga_id_school: { in: created.schoolGigaIds } },
          { giga_id_health: { in: created.healthGigaIds } },
        ],
      },
    });

    await prisma.registration.deleteMany({
      where: { id: { in: created.registrations } },
    });

    await prisma.master_sync_health_static.deleteMany({
      where: { health_id: { in: created.healths } },
    });

    await prisma.health.deleteMany({
      where: { id: { in: created.healths } },
    });

    await prisma.school_new_registration.deleteMany({
      where: { id: { in: created.schoolRegistrations } },
    });

    await prisma.dailycheckapp_school.deleteMany({
      where: { id: { in: created.dailycheckSchools } },
    });

    await prisma.school.deleteMany({
      where: { id: { in: created.schools } },
    });

    await prisma.$disconnect();
  });

  it('registers a school through new flow using registration table', async () => {
    const externalId = unique('school-ext');
    const gigaIdSchool = gigaId();
    // const installationId = unique('install-school');
    assertGigaIdFormat(gigaIdSchool);
    created.schoolGigaIds.push(gigaIdSchool);

    const schoolNewReg = await prisma.school_new_registration.create({
      data: {
        school_id: externalId,
        school_name: 'Elementary School',
        country_iso3_code: 'ESP',
        latitude: 40.4168,
        longitude: -3.7038,
        address: { country: 'Spain', city: 'Madrid' },
        education_level: 'Primary',
        contact_name: 'Elementary Contact',
        contact_email: 'elementary-school@example.com',
        giga_id_school: gigaIdSchool,
        verification_status: 'PENDING',
        created: new Date(),
        modified: new Date(),
      },
    });
    created.schoolRegistrations.push(schoolNewReg.id);

    const school = await prisma.school.create({
      data: {
        external_id: externalId,
        name: 'Elementary School',
        country_code: countryCode,
        giga_id_school: gigaIdSchool,
      },
    });
    created.schools.push(school.id);

    await prisma.country_entity_type_whitelist.deleteMany({
      where: {
        country_code: countryCode,
        entity_type_id: schoolEntityTypeId,
      },
    });

    await expect(
      ensureEntityTypeWhitelisted(countryCode, schoolEntityTypeId),
    ).rejects.toThrow(
      `Country ${countryCode} is not whitelisted for entity_type_id ${schoolEntityTypeId}`,
    );

    await prisma.country_entity_type_whitelist.upsert({
      where: {
        country_code_entity_type_id: {
          country_code: countryCode,
          entity_type_id: schoolEntityTypeId,
        },
      },
      update: {},
      create: {
        country_code: countryCode,
        entity_type_id: schoolEntityTypeId,
      },
    });

    await expect(
      ensureEntityTypeWhitelisted(countryCode, schoolEntityTypeId),
    ).resolves.not.toThrow();

    const registration = await prisma.registration.create({
      data: {
        entity_type_id: schoolEntityTypeId,
        // installation_id: installationId,
        school_id: school.id,
        giga_id_school: gigaIdSchool,
        country_code: countryCode,
        os: 'android',
        app_version: '2.0.0-test',
        is_active: true,
      },
    });
    created.registrations.push(registration.id);

    expect(registration.school_id).toEqual(school.id);
    expect(registration.health_id).toBeNull();
  });

  it('creates a new health center and registers it', async () => {
    const gigaIdHealth = gigaId();
    // const installationId = unique('install-health');
    assertGigaIdFormat(gigaIdHealth);
    created.healthGigaIds.push(gigaIdHealth);

    await prisma.country_entity_type_whitelist.deleteMany({
      where: {
        country_code: countryCode,
        entity_type_id: healthEntityTypeId,
      },
    });

    await expect(
      ensureEntityTypeWhitelisted(countryCode, healthEntityTypeId),
    ).rejects.toThrow(
      `Country ${countryCode} is not whitelisted for entity_type_id ${healthEntityTypeId}`,
    );

    await prisma.country_entity_type_whitelist.upsert({
      where: {
        country_code_entity_type_id: {
          country_code: countryCode,
          entity_type_id: healthEntityTypeId,
        },
      },
      update: {},
      create: {
        country_code: countryCode,
        entity_type_id: healthEntityTypeId,
      },
    });

    await expect(
      ensureEntityTypeWhitelisted(countryCode, healthEntityTypeId),
    ).resolves.not.toThrow();

    const health = await prisma.health.create({
      data: {
        health_id_giga: gigaIdHealth,
        facility_name: 'Integration Health Center',
        facility_data_source: 'integration-test',
        signature: unique('health-signature'),
        latitude: 41.3874,
        longitude: 2.1686,
        country_code: countryCode,
      },
    });
    created.healths.push(health.id);

    const healthStatic = await prisma.master_sync_health_static.create({
      data: {
        created: new Date(),
        modified: new Date(),
        health_id: health.id,
        version: 1,
      },
    });

    const updatedHealth = await prisma.health.update({
      where: { id: health.id },
      data: { last_health_static_id: healthStatic.id },
    });

    const registration = await prisma.registration.create({
      data: {
        entity_type_id: healthEntityTypeId,
        // installation_id: installationId,
        health_id: health.id,
        giga_id_health: gigaIdHealth,
        country_code: countryCode,
        os: 'windows',
        app_version: '2.0.0-test',
        is_active: true,
      },
    });
    created.registrations.push(registration.id);

    expect(updatedHealth.last_health_static_id).toEqual(healthStatic.id);
    expect(registration.health_id).toEqual(health.id);
    expect(registration.school_id).toBeNull();
  });

  it('submits measurements for both school and health registrations', async () => {
    const schoolGigaId = gigaId();
    const healthGigaId = gigaId();
    assertGigaIdFormat(schoolGigaId);
    assertGigaIdFormat(healthGigaId);
    created.schoolGigaIds.push(schoolGigaId);
    created.healthGigaIds.push(healthGigaId);

    const school = await prisma.school.create({
      data: {
        external_id: unique('school-measure-ext'),
        name: 'Measurement School',
        country_code: countryCode,
        giga_id_school: schoolGigaId,
      },
    });
    created.schools.push(school.id);

    const health = await prisma.health.create({
      data: {
        health_id_giga: healthGigaId,
        facility_name: 'Measurement Health',
        facility_data_source: 'integration-test',
        signature: unique('measure-signature'),
        latitude: 39.4699,
        longitude: -0.3763,
        country_code: countryCode,
      },
    });
    created.healths.push(health.id);

    const [schoolRegistration, healthRegistration] = await Promise.all([
      prisma.registration.create({
        data: {
          entity_type_id: schoolEntityTypeId,
          installation_id: unique('install-school-measure'),
          school_id: school.id,
          giga_id_school: school.giga_id_school!,
          country_code: countryCode,
        },
      }),
      prisma.registration.create({
        data: {
          entity_type_id: healthEntityTypeId,
          installation_id: unique('install-health-measure'),
          health_id: health.id,
          giga_id_health: health.health_id_giga,
          country_code: countryCode,
        },
      }),
    ]);
    created.registrations.push(schoolRegistration.id, healthRegistration.id);

    const [schoolMeasurement, healthMeasurement] = await Promise.all([
      prisma.measurements.create({
        data: {
          timestamp: new Date(),
          school_id: 'legacy-school-field-value',
          giga_id_school: school.giga_id_school,
          country_code: countryCode,
          source: 'MLab',
          entity_type_id: schoolEntityTypeId,
          registration_id: schoolRegistration.id,
          download: 14.5,
          upload: 7.1,
          latency: BigInt(30),
        },
      }),
      prisma.measurements.create({
        data: {
          timestamp: new Date(),
          school_id: null,
          giga_id_health: health.health_id_giga,
          country_code: countryCode,
          source: 'MLab',
          entity_type_id: healthEntityTypeId,
          registration_id: healthRegistration.id,
          download: 9.3,
          upload: 4.2,
          latency: BigInt(44),
        },
      }),
    ]);

    const [schoolPing, healthPing] = await Promise.all([
      prisma.connectivity_ping_checks.create({
        data: {
          timestamp: new Date(),
          giga_id_school: school.giga_id_school,
          app_local_uuid: unique('school-ping'),
          isConnected: true,
          latency: 25.4,
          entity_type_id: schoolEntityTypeId,
          registration_id: schoolRegistration.id,
        },
      }),
      prisma.connectivity_ping_checks.create({
        data: {
          timestamp: new Date(),
          giga_id_school: null,
          giga_id_health: health.health_id_giga,
          app_local_uuid: unique('health-ping'),
          isConnected: true,
          latency: 31.9,
          entity_type_id: healthEntityTypeId,
          registration_id: healthRegistration.id,
        },
      }),
    ]);

    expect(schoolMeasurement.registration_id).toEqual(schoolRegistration.id);
    expect(healthMeasurement.school_id).toBeNull();
    expect(healthMeasurement.giga_id_health).toEqual(health.health_id_giga);
    expect(schoolPing.registration_id).toEqual(schoolRegistration.id);
    expect(healthPing.giga_id_school).toBeNull();
  });

  it('submits measurement for a legacy dailycheckapp school via registration', async () => {
    const gigaIdSchool = gigaId();
    assertGigaIdFormat(gigaIdSchool);
    created.schoolGigaIds.push(gigaIdSchool);

    const school = await prisma.school.create({
      data: {
        external_id: unique('legacy-school-ext'),
        name: 'Legacy School',
        country_code: countryCode,
        giga_id_school: gigaIdSchool,
      },
    });
    created.schools.push(school.id);

    const dailyCheck = await prisma.dailycheckapp_school.create({
      data: {
        giga_id_school: gigaIdSchool,
        country_code: countryCode,
        os: 'windows',
        app_version: '1.0.8',
        device_hardware_id: unique('legacy-device'),
      },
    });
    created.dailycheckSchools.push(dailyCheck.id);

    await ensureEntityTypeWhitelisted(countryCode, schoolEntityTypeId).catch(
      async () => {
        await prisma.country_entity_type_whitelist.upsert({
          where: {
            country_code_entity_type_id: {
              country_code: countryCode,
              entity_type_id: schoolEntityTypeId,
            },
          },
          update: {},
          create: {
            country_code: countryCode,
            entity_type_id: schoolEntityTypeId,
          },
        });
      },
    );

    const registration = await prisma.registration.create({
      data: {
        entity_type_id: schoolEntityTypeId,
        installation_id: unique('legacy-install'),
        school_id: school.id,
        giga_id_school: gigaIdSchool,
        country_code: countryCode,
        device_hardware_id: dailyCheck.device_hardware_id,
        os: dailyCheck.os ?? 'unknown',
        app_version: dailyCheck.app_version ?? 'legacy',
        is_active: true,
      },
    });
    created.registrations.push(registration.id);

    const measurement = await prisma.measurements.create({
      data: {
        timestamp: new Date(),
        school_id: gigaIdSchool,
        giga_id_school: gigaIdSchool,
        country_code: countryCode,
        source: 'MLab',
        entity_type_id: schoolEntityTypeId,
        registration_id: registration.id,
        download: 8.9,
        upload: 3.2,
        latency: BigInt(61),
      },
    });

    expect(measurement.registration_id).toEqual(registration.id);
    expect(measurement.giga_id_school).toEqual(gigaIdSchool);
  });

  it('fails creating registration with non-existent entity_type_id', async () => {
    await expect(
      prisma.registration.create({
        data: {
          entity_type_id: -999999,
          installation_id: unique('bad-entity-type'),
          country_code: countryCode,
        },
      }),
    ).rejects.toHaveProperty('code', 'P2003');
  });

  it('fails creating measurement with non-existent registration_id', async () => {
    const schoolGigaId = gigaId();
    created.schoolGigaIds.push(schoolGigaId);
    assertGigaIdFormat(schoolGigaId);

    await expect(
      prisma.measurements.create({
        data: {
          timestamp: new Date(),
          school_id: 'fk-failure-school-id',
          giga_id_school: schoolGigaId,
          country_code: countryCode,
          source: 'MLab',
          entity_type_id: schoolEntityTypeId,
          registration_id: BigInt(-999999),
          download: 7.7,
          upload: 2.2,
          latency: BigInt(40),
        },
      }),
    ).rejects.toHaveProperty('code', 'P2003');
  });

  it('explicitly allows health measurement with school_id set to null', async () => {
    const healthGigaId = gigaId();
    created.healthGigaIds.push(healthGigaId);
    assertGigaIdFormat(healthGigaId);

    const health = await prisma.health.create({
      data: {
        health_id_giga: healthGigaId,
        facility_name: 'Null school_id health measurement facility',
        facility_data_source: 'integration-test',
        signature: unique('null-school-health-signature'),
        latitude: 43.263,
        longitude: -2.935,
        country_code: countryCode,
      },
    });
    created.healths.push(health.id);

    const registration = await prisma.registration.create({
      data: {
        entity_type_id: healthEntityTypeId,
        installation_id: unique('health-null-school-install'),
        health_id: health.id,
        giga_id_health: health.health_id_giga,
        country_code: countryCode,
      },
    });
    created.registrations.push(registration.id);

    const measurement = await prisma.measurements.create({
      data: {
        timestamp: new Date(),
        school_id: null,
        giga_id_health: health.health_id_giga,
        country_code: countryCode,
        source: 'MLab',
        entity_type_id: healthEntityTypeId,
        registration_id: registration.id,
        download: 10.5,
        upload: 5.1,
        latency: BigInt(38),
      },
    });

    expect(measurement.school_id).toBeNull();
    expect(measurement.giga_id_health).toEqual(health.health_id_giga);
  });
});
