import { Test, TestingModule } from '@nestjs/testing';
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
            schoolProtocolConfig: { findUnique: jest.fn() },
            countryProtocolConfig: { findUnique: jest.fn() },
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

  it('returns default when no rows', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue(null);

    await expect(service.resolve('g1', 'ZZ')).resolves.toEqual({
      measurementProvider: 'mlab',
      betweenTestsDelaySec: 0,
      configSource: 'default',
    });
  });

  it('uses country when present', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      country_code: 'BR',
      measurement_provider: 'cloudflare',
      between_tests_delay_sec: 10,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve(undefined, 'BR')).resolves.toEqual({
      measurementProvider: 'cloudflare',
      betweenTestsDelaySec: 10,
      configSource: 'country',
    });
  });

  it('school overrides country', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_provider: 'both',
      between_tests_delay_sec: 5,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_provider: 'mlab',
      between_tests_delay_sec: 99,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProvider: 'both',
      betweenTestsDelaySec: 5,
      configSource: 'school',
    });
  });

  it('school row with only delay override inherits provider from country', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_provider: null,
      between_tests_delay_sec: 7,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_provider: 'cloudflare',
      between_tests_delay_sec: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProvider: 'cloudflare',
      betweenTestsDelaySec: 7,
      configSource: 'school',
    });
  });

  it('ignores school row when all override columns are null', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      giga_id_school: 'sch1',
      measurement_provider: null,
      between_tests_delay_sec: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 2,
      country_code: 'BR',
      measurement_provider: 'cloudflare',
      between_tests_delay_sec: 2,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve('sch1', 'BR')).resolves.toEqual({
      measurementProvider: 'cloudflare',
      betweenTestsDelaySec: 2,
      configSource: 'country',
    });
  });

  it('coerces invalid DB provider to mlab', async () => {
    jest.spyOn(prisma.schoolProtocolConfig, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.countryProtocolConfig, 'findUnique').mockResolvedValue({
      id: 1,
      country_code: 'BR',
      measurement_provider: 'unknown-provider',
      between_tests_delay_sec: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(service.resolve(undefined, 'BR')).resolves.toMatchObject({
      measurementProvider: 'mlab',
      configSource: 'country',
    });
  });
});
