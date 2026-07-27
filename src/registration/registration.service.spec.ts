import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FacilityTypeService } from '../facility-type/facility-type.service';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationService } from './registration.service';

const mockFacilityTypeSchool = { id: 1, name: 'school', code: 'school' } as any;
const mockFacilityTypeHealth = { id: 2, name: 'health', code: 'health' } as any;

const mockHealthFacility = {
  id: BigInt(4001),
  health_id_giga: 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  deleted: null,
} as any;

const mockSchool = {
  id: BigInt(1234),
  giga_id_school: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  deleted: null,
} as any;

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prisma: PrismaService;
  let facilityTypeService: FacilityTypeService;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        PrismaService,
        {
          provide: FacilityTypeService,
          useValue: {
            getByCode: jest.fn(),
          },
        },
        {
          provide: HealthService,
          useValue: {
            findActiveById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    prisma = module.get<PrismaService>(PrismaService);
    facilityTypeService = module.get<FacilityTypeService>(FacilityTypeService);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects when neither giga id is provided', async () => {
    await expect(
      service.createRegistration({ country_code: 'KE' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when both giga ids are provided', async () => {
    await expect(
      service.createRegistration({
        giga_id_school: mockSchool.giga_id_school,
        giga_id_health: mockHealthFacility.health_id_giga,
        country_code: 'KE',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when facility_type row is missing', async () => {
    jest.spyOn(facilityTypeService, 'getByCode').mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_health: mockHealthFacility.health_id_giga,
        country_code: 'KE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when health facility is not found', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeHealth);
    jest.spyOn(healthService, 'findActiveById').mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_health: mockHealthFacility.health_id_giga,
        country_code: 'KE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when school is not found', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_school: mockSchool.giga_id_school,
        country_code: 'KE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when country is not whitelisted for the facility type', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeHealth);
    jest
      .spyOn(healthService, 'findActiveById')
      .mockResolvedValue(mockHealthFacility);
    jest
      .spyOn(prisma.country_facility_type_whitelist, 'findFirst')
      .mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_health: mockHealthFacility.health_id_giga,
        country_code: 'NG',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a health registration', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeHealth);
    jest
      .spyOn(healthService, 'findActiveById')
      .mockResolvedValue(mockHealthFacility);
    jest
      .spyOn(prisma.country_facility_type_whitelist, 'findFirst')
      .mockResolvedValue({ id: 1 } as any);
    jest.spyOn(prisma.registration, 'create').mockResolvedValue({
      id: BigInt(1001),
    } as any);

    const result = await service.createRegistration({
      giga_id_health: mockHealthFacility.health_id_giga,
      country_code: 'KE',
      installation_id: 'install-1',
    });

    expect(result).toEqual({
      giga_id: mockHealthFacility.health_id_giga,
      registration_id: '1001',
      facility_type: 'health',
    });
    expect(prisma.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          facility_type_id: mockFacilityTypeHealth.id,
          health_id: mockHealthFacility.id,
          school_id: null,
          giga_id_health: mockHealthFacility.health_id_giga,
          giga_id_school: null,
        }),
      }),
    );
  });

  it('creates a school registration', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(mockSchool);
    jest
      .spyOn(prisma.country_facility_type_whitelist, 'findFirst')
      .mockResolvedValue({ id: 2 } as any);
    jest.spyOn(prisma.registration, 'create').mockResolvedValue({
      id: BigInt(2002),
    } as any);

    const result = await service.createRegistration({
      giga_id_school: mockSchool.giga_id_school,
      country_code: 'KE',
    });

    expect(result).toEqual({
      giga_id: mockSchool.giga_id_school,
      registration_id: '2002',
      facility_type: 'school',
    });
    expect(prisma.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          facility_type_id: mockFacilityTypeSchool.id,
          school_id: mockSchool.id,
          health_id: null,
          giga_id_school: mockSchool.giga_id_school,
          giga_id_health: null,
        }),
      }),
    );
  });
});

describe('RegistrationService — v2 recovery & lifecycle', () => {
  let service: RegistrationService;
  let prisma: PrismaService;

  const mockRegistration = {
    id: BigInt(987654),
    installation_id: 'inst-1',
    device_hardware_id: 'hw-1',
    giga_id_school: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
    giga_id_health: null,
    user_id: 'legacy-browser-9',
    is_active: true,
    is_blocked: false,
    facility_type: { id: 1, name: 'school', code: 'school' },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        PrismaService,
        { provide: FacilityTypeService, useValue: { getByCode: jest.fn() } },
        { provide: HealthService, useValue: { findActiveById: jest.fn() } },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findExisting', () => {
    it('rejects when no identifier is provided', async () => {
      await expect(service.findExisting({})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves by installation_id first', async () => {
      const findFirst = jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValue(mockRegistration);

      const result = await service.findExisting({
        installation_id: 'inst-1',
        giga_id: 'other-giga',
      });

      expect(result).toEqual({
        registration_id: '987654',
        facility_type: 'school',
        giga_id: mockRegistration.giga_id_school,
        is_active: true,
        is_blocked: false,
      });
      expect(findFirst).toHaveBeenCalledTimes(1);
      expect(findFirst.mock.calls[0][0].where).toEqual({
        installation_id: 'inst-1',
      });
    });

    it('falls through the chain to giga_id + browser_id (oldest vintage)', async () => {
      const findFirst = jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRegistration);

      const result = await service.findExisting({
        device_hardware_id: 'hw-x',
        giga_id: mockRegistration.giga_id_school,
        browser_id: 'legacy-browser-9',
      });

      expect(result.registration_id).toBe('987654');
      expect(findFirst).toHaveBeenCalledTimes(2);
      expect(findFirst.mock.calls[1][0].where).toEqual({
        OR: [
          { giga_id_school: mockRegistration.giga_id_school },
          { giga_id_health: mockRegistration.giga_id_school },
        ],
        user_id: 'legacy-browser-9',
      });
    });

    it('404s when nothing matches', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      await expect(
        service.findExisting({ installation_id: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatus', () => {
    it('rejects without installation_id', async () => {
      await expect(service.getStatus('')).rejects.toThrow(BadRequestException);
    });

    it('reports exists=false for unknown installation', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      expect(await service.getStatus('unknown')).toEqual({
        exists: false,
        is_active: null,
        is_blocked: null,
      });
    });

    it('reports status of the latest registration', async () => {
      jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValue({ ...mockRegistration, is_active: false });
      expect(await service.getStatus('inst-1')).toEqual({
        exists: true,
        is_active: false,
        is_blocked: false,
      });
    });
  });

  describe('deactivate', () => {
    it('rejects when no identifier is provided', async () => {
      await expect(service.deactivate({})).rejects.toThrow(BadRequestException);
    });

    it('404s when nothing matches', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      await expect(
        service.deactivate({ installation_id: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('prefers registration_id and sets is_active=false', async () => {
      jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValue(mockRegistration);
      const update = jest
        .spyOn(prisma.registration, 'update')
        .mockResolvedValue({ ...mockRegistration, is_active: false });

      const result = await service.deactivate({
        registration_id: '987654',
        installation_id: 'inst-1',
      });

      expect(result).toEqual({ success: true });
      expect(
        (prisma.registration.findFirst as jest.Mock).mock.calls[0][0].where,
      ).toEqual({ id: BigInt(987654) });
      expect(update).toHaveBeenCalledWith({
        where: { id: mockRegistration.id },
        data: { is_active: false },
      });
    });
  });
});

describe('RegistrationService — legacy backfill & ingest self-heal', () => {
  let service: RegistrationService;
  let prisma: PrismaService;
  let facilityTypeService: FacilityTypeService;
  let healthService: HealthService;

  const mockLegacyRow = {
    id: BigInt(11),
    giga_id_school: 'giga-legacy-1',
    user_id: 'legacy-browser-9',
    device_hardware_id: 'hw-legacy',
    mac_address: 'AA:BB',
    os: 'Windows',
    app_version: '1.9.0',
    ip_address: '1.2.3.4',
    network_information: null,
    windows_username: null,
    installed_path: null,
    wifi_connections: null,
    country_code: 'KE',
    is_blocked: false,
    is_active: true,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        PrismaService,
        { provide: FacilityTypeService, useValue: { getByCode: jest.fn() } },
        { provide: HealthService, useValue: { findActiveById: jest.fn() } },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    prisma = module.get<PrismaService>(PrismaService);
    facilityTypeService = module.get<FacilityTypeService>(FacilityTypeService);
    healthService = module.get<HealthService>(HealthService);

    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue({ id: 1, name: 'school', code: 'school' } as any);
  });

  describe('findExisting — legacy fallback', () => {
    it('materializes a registration from a dailycheckapp_school row', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockLegacyRow);
      jest
        .spyOn(prisma.school, 'findFirst')
        .mockResolvedValue({ id: BigInt(500) } as any);
      const create = jest
        .spyOn(prisma.registration, 'create')
        .mockResolvedValue({
          id: BigInt(9001),
          giga_id_school: mockLegacyRow.giga_id_school,
          giga_id_health: null,
          is_active: true,
          is_blocked: false,
          facility_type: { code: 'school' },
        } as any);

      const result = await service.findExisting({
        installation_id: 'inst-new',
        giga_id: mockLegacyRow.giga_id_school,
        browser_id: mockLegacyRow.user_id,
      });

      expect(result.registration_id).toBe('9001');
      expect(result.facility_type).toBe('school');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            giga_id_school: mockLegacyRow.giga_id_school,
            user_id: mockLegacyRow.user_id,
            device_hardware_id: mockLegacyRow.device_hardware_id,
            school_id: BigInt(500),
            installation_id: 'inst-new',
            is_active: true,
            is_blocked: false,
          }),
        }),
      );
    });

    it('is idempotent — reuses an already-materialized registration', async () => {
      const materialized = {
        id: BigInt(9002),
        giga_id_school: mockLegacyRow.giga_id_school,
        giga_id_health: null,
        is_active: true,
        is_blocked: false,
        facility_type: { code: 'school' },
      } as any;
      // chain misses, idempotency lookup hits
      jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(materialized);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockLegacyRow);
      const create = jest.spyOn(prisma.registration, 'create');

      const result = await service.findExisting({
        giga_id: mockLegacyRow.giga_id_school,
      });

      expect(result.registration_id).toBe('9002');
      expect(create).not.toHaveBeenCalled();
    });

    it('404s for a genuinely never-registered device', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);

      await expect(
        service.findExisting({ installation_id: 'ghost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveForIngest', () => {
    it('resolves through the v2 chain first', async () => {
      jest
        .spyOn(prisma.registration, 'findFirst')
        .mockResolvedValue({ id: BigInt(77) } as any);

      const id = await service.resolveForIngest({
        installation_id: 'inst-1',
        giga_id_school: 'giga-1',
      });
      expect(id).toEqual(BigInt(77));
    });

    it('lazy-creates from a VALID school giga when nothing else matches', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue({
        id: BigInt(500),
        giga_id_school: 'giga-1',
        country_code: 'KE',
      } as any);
      jest
        .spyOn(prisma.registration, 'create')
        .mockResolvedValue({ id: BigInt(9100) } as any);

      const id = await service.resolveForIngest({
        installation_id: 'inst-1',
        giga_id_school: 'giga-1',
      });
      expect(id).toEqual(BigInt(9100));
    });

    it('returns null for an INVALID giga (junk traffic mints nothing)', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(null);
      const create = jest.spyOn(prisma.registration, 'create');

      const id = await service.resolveForIngest({
        giga_id_school: 'giga-fake',
      });
      expect(id).toBeNull();
      expect(create).not.toHaveBeenCalled();
    });

    it('lazy-creates from a valid health giga', async () => {
      jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(facilityTypeService, 'getByCode')
        .mockResolvedValue({ id: 2, name: 'health', code: 'health' } as any);
      jest.spyOn(healthService, 'findActiveById').mockResolvedValue({
        id: BigInt(4001),
        health_id_giga: 'hf-1',
        country_code: 'KE',
      } as any);
      jest
        .spyOn(prisma.registration, 'create')
        .mockResolvedValue({ id: BigInt(9200) } as any);

      const id = await service.resolveForIngest({ giga_id_health: 'hf-1' });
      expect(id).toEqual(BigInt(9200));
    });

    it('never throws — returns null on unexpected errors', async () => {
      jest
        .spyOn(prisma.registration, 'findFirst')
        .mockRejectedValue(new Error('db down'));
      const id = await service.resolveForIngest({
        installation_id: 'inst-1',
        giga_id_school: 'giga-1',
      });
      expect(id).toBeNull();
    });
  });
});
