import { PrismaClient } from '@prisma/client';

export async function ensurePrismaScriptFixtures(
  prisma: PrismaClient,
): Promise<void> {
  // Ensure required entity types exist for V1 flows.
  const schoolEntityTypeCreateData: { name: string; code: string } = {
    name: 'school',
    code: 'SCH',
  };
  const schoolEntityType = await prisma.entity_type.upsert({
    where: { name: 'school' },
    update: {},
    create: schoolEntityTypeCreateData,
  });

  const healthEntityTypeCreateData: { name: string; code: string } = {
    name: 'health',
    code: 'HLTH',
  };
  const healthEntityType = await prisma.entity_type.upsert({
    where: { name: 'health' },
    update: {},
    create: healthEntityTypeCreateData,
  });

  // Insert country row for Spain
  await prisma.country.upsert({
    where: { code: 'ES' },
    update: {
      name: 'Spain',
      iso3_format: 'ESP',
      is_active: true,
    },
    create: {
      id: BigInt(216),
      name: 'Spain',
      code: 'ES',
      iso3_format: 'ESP',
      is_active: true,
    },
  });

  // Baseline whitelist for seeded country + entity types.
  await prisma.country_entity_type_whitelist.upsert({
    where: {
      country_code_entity_type_id: {
        country_code: 'ES',
        entity_type_id: schoolEntityType.id,
      },
    },
    update: {},
    create: {
      country_code: 'ES',
      entity_type_id: schoolEntityType.id,
    },
  });

  await prisma.country_entity_type_whitelist.upsert({
    where: {
      country_code_entity_type_id: {
        country_code: 'ES',
        entity_type_id: healthEntityType.id,
      },
    },
    update: {},
    create: {
      country_code: 'ES',
      entity_type_id: healthEntityType.id,
    },
  });

  // Insert dailycheckapp_country row for Spain
  await prisma.dailycheckapp_country.upsert({
    where: { id: BigInt(34) },
    update: {
      code: 'ES',
      code_iso3: 'ESP',
      name: 'Spain',
      country_id: '216',
      created_at: new Date(),
    },
    create: {
      id: BigInt(34),
      code: 'ES',
      code_iso3: 'ESP',
      name: 'Spain',
      country_id: '216',
      created_at: new Date(),
    },
  });

  // Insert test school for Spain
  const existingSchool = await prisma.school.findFirst({
    where: { giga_id_school: '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05' },
    select: { id: true },
  });

  if (!existingSchool) {
    await prisma.school.create({
      data: {
        id: BigInt(14),
        external_id: 'SpainTestSchool1',
        name: 'Spain test school 1',
        country_id: 216,
        country_code: 'ES',
        address: 'Spain',
        giga_id_school: '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05',
      },
    });
  }

  // Keep BIGSERIAL sequence aligned after explicit id inserts (e.g. id=14 seed row).
  // Otherwise later prisma.school.create() may collide on an existing id.
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"school"', 'id'),
      COALESCE((SELECT MAX(id) FROM "school"), 1),
      true
    );
  `);
}
