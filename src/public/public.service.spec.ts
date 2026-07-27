import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PublicService', () => {
  let service: PublicService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      registration: { findMany: jest.fn().mockResolvedValue([]) },
      dailycheckapp_country: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('health', () => {
    const registrationRow = {
      id: BigInt(7),
      user_id: 'user-1',
      giga_id_health: 'hlt-1',
      mac_address: 'AA:BB',
      os: 'windows',
      app_version: '2.0.3',
      created: '2026-07-01',
      network_information: '{}',
      ip_address: '1.2.3.4',
      country_code: 'BR',
      is_blocked: false,
      created_at: new Date('2026-07-01T00:00:00.000Z'),
      device_hardware_id: 'hw-1',
      is_active: true,
      windows_username: 'user',
      installed_path: 'C:\\giga',
      wifi_connections: [{ ssid: 'net' }],
    };

    it('returns only health-type registrations that carry a giga id', async () => {
      prisma.registration.findMany.mockResolvedValue([registrationRow]);

      const result = await service.health(0, 10, undefined, undefined, false, [
        'BR',
      ]);

      expect(prisma.registration.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          facility_type: { code: 'health' },
          giga_id_health: { not: null },
          country_code: { in: ['BR'] },
        },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual([
        {
          id: '7',
          user_id: 'user-1',
          giga_id_health: 'hlt-1',
          mac_address: 'AA:BB',
          os: 'windows',
          app_version: '2.0.3',
          created: '2026-07-01',
          network_information: '{}',
          ip_address: '1.2.3.4',
          country_code: 'BR',
          is_blocked: false,
          created_at: registrationRow.created_at,
          device_hardware_id: 'hw-1',
          is_active: true,
          windows_username: 'user',
          installed_path: 'C:\\giga',
          wifi_connections: [{ ssid: 'net' }],
        },
      ]);
    });

    it('filters by a single giga_id_health when provided', async () => {
      await service.health(0, 10, 'hlt-1', undefined, true, undefined);

      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ giga_id_health: 'hlt-1' }),
        }),
      );
    });

    it('drops the country filter for callers with write access', async () => {
      await service.health(0, 10, undefined, undefined, true, ['BR']);

      const call = prisma.registration.findMany.mock.calls[0][0];
      expect(call.where.country_code).toBeUndefined();
    });

    it('resolves country_iso3_code to the country code filter', async () => {
      prisma.dailycheckapp_country.findFirst.mockResolvedValue({ code: 'BR' });

      await service.health(0, 10, undefined, 'BRA', false, ['BR']);

      const call = prisma.registration.findMany.mock.calls[0][0];
      expect(call.where.country_code).toEqual({ in: ['BR'] });
    });

    it('returns an empty list when the caller cannot access the country', async () => {
      prisma.dailycheckapp_country.findFirst.mockResolvedValue({ code: 'BR' });

      const result = await service.health(0, 10, undefined, 'BRA', false, [
        'ES',
      ]);

      expect(result).toEqual([]);
      expect(prisma.registration.findMany).not.toHaveBeenCalled();
    });
  });
});
