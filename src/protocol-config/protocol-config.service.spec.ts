import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SpeedTestProtocol } from '@prisma/client';
import { ProtocolConfigService } from './protocol-config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProtocolConfigService', () => {
  let service: ProtocolConfigService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProtocolConfigService,
        {
          provide: PrismaService,
          useValue: {
            schoolProtocolConfig: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            countryProtocolConfig: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            country: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ProtocolConfigService>(ProtocolConfigService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns default (mlab) when no rows', async () => {
    jest
      .spyOn(prisma.schoolProtocolConfig, 'findUnique')
      .mockResolvedValue(null);
    jest
      .spyOn(prisma.countryProtocolConfig, 'findUnique')
      .mockResolvedValue(null);

    await expect(service.resolve('g1', 'ZZ')).resolves.toEqual({
      measurementProviders: ['mlab'],
      betweenTestsDelaySec: 0,
      configSource: 'default',
    });
  });

  it('uses country when present', async () => {
    jest
      .spyOn(prisma.schoolProtocolConfig, 'findUnique')
      .mockResolvedValue(null);
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      country_code: 'BR',
      measurement_providers: ['cloudflare'],
      between_tests_delay_sec: 10,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve(undefined, 'BR')).resolves.toEqual({
      measurementProviders: ['cloudflare'],
      betweenTestsDelaySec: 10,
      configSource: 'country',
    });
  });

  it('school overrides country (dual provider array)', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_providers: ['mlab', 'cloudflare'],
      between_tests_delay_sec: 5,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_providers: ['mlab'],
      between_tests_delay_sec: 99,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProviders: ['mlab', 'cloudflare'],
      betweenTestsDelaySec: 5,
      configSource: 'school',
    });
  });

  it('school row with only delay override inherits providers from country', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_providers: [],
      between_tests_delay_sec: 7,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_providers: ['cloudflare'],
      between_tests_delay_sec: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProviders: ['cloudflare'],
      betweenTestsDelaySec: 7,
      configSource: 'school',
    });
  });

  it('ignores school row when providers empty and delay null', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_providers: [],
      between_tests_delay_sec: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_providers: ['cloudflare'],
      between_tests_delay_sec: 2,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProviders: ['cloudflare'],
      betweenTestsDelaySec: 2,
      configSource: 'country',
    });
  });

  it('coerces invalid DB providers to mlab default in country context', async () => {
    jest
      .spyOn(prisma.schoolProtocolConfig, 'findUnique')
      .mockResolvedValue(null);
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      country_code: 'BR',
      measurement_providers: ['unknown-provider'],
      between_tests_delay_sec: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve(undefined, 'BR')).resolves.toMatchObject({
      measurementProviders: ['mlab'],
      configSource: 'country',
    });
  });

  it('upserts country config when country exists', async () => {
    const createdAt = new Date('2026-05-12T10:00:00.000Z');
    const updatedAt = new Date('2026-05-12T10:00:00.000Z');
    jest.spyOn(prisma.country, 'findUnique').mockResolvedValue({
      id: BigInt(1),
      code: 'ES',
      name: 'Spain',
      created_at: createdAt,
      iso3_format: 'ESP',
      latest_school_master_data_version: 1,
      speed_test_protocol: SpeedTestProtocol.NDT7,
      is_active: true,
    });
    jest.spyOn(prisma.countryProtocolConfig, 'upsert').mockResolvedValue({
      id: 1,
      country_code: 'ES',
      measurement_providers: ['mlab', 'cloudflare'],
      between_tests_delay_sec: 5,
      created_at: createdAt,
      updated_at: updatedAt,
    });

    await expect(
      service.upsertCountry('ES', {
        measurementProviders: ['mlab', 'cloudflare'],
        betweenTestsDelaySec: 5,
      }),
    ).resolves.toEqual({
      countryCode: 'ES',
      measurementProviders: ['mlab', 'cloudflare'],
      betweenTestsDelaySec: 5,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('throws NotFoundException when upserting country for unknown country', async () => {
    jest.spyOn(prisma.country, 'findUnique').mockResolvedValue(null);

    await expect(
      service.upsertCountry('ZZ', {
        measurementProviders: ['mlab'],
        betweenTestsDelaySec: 0,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when deleting missing country config', async () => {
    jest.spyOn(prisma.countryProtocolConfig, 'deleteMany').mockResolvedValue({
      count: 0,
    });

    await expect(service.deleteCountry('ES')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('upserts school config with provider override', async () => {
    const createdAt = new Date('2026-05-12T10:00:00.000Z');
    const updatedAt = new Date('2026-05-12T10:00:00.000Z');
    jest.spyOn(prisma.schoolProtocolConfig, 'upsert').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_providers: ['cloudflare'],
      between_tests_delay_sec: null,
      created_at: createdAt,
      updated_at: updatedAt,
    });

    await expect(
      service.upsertSchool('sch1', { measurementProviders: ['cloudflare'] }),
    ).resolves.toEqual({
      gigaIdSchool: 'sch1',
      measurementProviders: ['cloudflare'],
      betweenTestsDelaySec: null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('clears school provider override with empty array', async () => {
    const createdAt = new Date('2026-05-12T10:00:00.000Z');
    const updatedAt = new Date('2026-05-12T10:00:00.000Z');
    const upsertSpy = jest
      .spyOn(prisma.schoolProtocolConfig, 'upsert')
      .mockResolvedValue({
        id: 1,
        giga_id_school: 'sch1',
        measurement_providers: [],
        between_tests_delay_sec: null,
        created_at: createdAt,
        updated_at: updatedAt,
      });

    await expect(
      service.upsertSchool('sch1', { measurementProviders: [] }),
    ).resolves.toEqual({
      gigaIdSchool: 'sch1',
      measurementProviders: [],
      betweenTestsDelaySec: null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ measurement_providers: [] }),
      }),
    );
  });

  it('throws BadRequestException when school upsert has no fields', async () => {
    await expect(service.upsertSchool('sch1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when deleting missing school config', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'deleteMany').mockResolvedValue({
      count: 0,
    });

    await expect(service.deleteSchool('sch1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
