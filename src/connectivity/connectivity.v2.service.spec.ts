import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FacilityTypeService } from 'src/facility-type/facility-type.service';
import { RegistrationService } from 'src/registration/registration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConnectivityService } from './connectivity.service';

const mockFacilityTypeSchool = { id: 1, name: 'school', code: 'school' } as any;

const baseRecord = {
  timestamp: new Date('2026-07-01T10:00:00Z'),
  isConnected: true,
  app_local_uuid: 'uuid-1',
  latency: 42,
};

describe('ConnectivityService — createManyV2', () => {
  let service: ConnectivityService;
  let prisma: PrismaService;
  let facilityTypeService: FacilityTypeService;
  let registrationService: RegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityService,
        PrismaService,
        { provide: FacilityTypeService, useValue: { getByCode: jest.fn() } },
        {
          provide: RegistrationService,
          useValue: { resolveForIngest: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ConnectivityService>(ConnectivityService);
    prisma = module.get<PrismaService>(PrismaService);
    facilityTypeService = module.get<FacilityTypeService>(FacilityTypeService);
    registrationService = module.get<RegistrationService>(RegistrationService);
  });

  it('rejects an unknown facility_type', async () => {
    jest.spyOn(facilityTypeService, 'getByCode').mockResolvedValue(null);
    await expect(
      service.createManyV2({
        facility_type: 'school',
        records: [baseRecord],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when the provided registration does not exist', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    jest.spyOn(prisma.registration, 'findFirst').mockResolvedValue(null);

    await expect(
      service.createManyV2({
        facility_type: 'school',
        registration_id: '77',
        records: [baseRecord],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a blocked registration', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    jest
      .spyOn(prisma.registration, 'findFirst')
      .mockResolvedValue({ id: BigInt(77), is_blocked: true } as any);

    await expect(
      service.createManyV2({
        facility_type: 'school',
        registration_id: '77',
        records: [baseRecord],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when no identifier at all is provided', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    (registrationService.resolveForIngest as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createManyV2({
        facility_type: 'school',
        records: [baseRecord],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('self-heals the registration via resolveForIngest when registration_id is missing', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    (registrationService.resolveForIngest as jest.Mock).mockResolvedValue(
      BigInt(88),
    );
    const createMany = jest
      .spyOn(prisma.connectivity_ping_checks, 'createMany')
      .mockResolvedValue({ count: 1 } as any);

    const result = await service.createManyV2({
      facility_type: 'school',
      installation_id: 'inst-9',
      giga_id_school: 'giga-1',
      records: [baseRecord],
    } as any);

    expect(result).toEqual({ success: true, accepted: 1 });
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            app_local_uuid: 'uuid-1',
            giga_id_school: 'giga-1',
            giga_id_health: null,
            facility_type_id: mockFacilityTypeSchool.id,
            registration_id: BigInt(88),
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it('stores records with a valid registration and skips duplicates', async () => {
    jest
      .spyOn(facilityTypeService, 'getByCode')
      .mockResolvedValue(mockFacilityTypeSchool);
    jest
      .spyOn(prisma.registration, 'findFirst')
      .mockResolvedValue({ id: BigInt(77), is_blocked: false } as any);
    jest
      .spyOn(prisma.connectivity_ping_checks, 'createMany')
      .mockResolvedValue({ count: 2 } as any);

    const result = await service.createManyV2({
      facility_type: 'school',
      registration_id: '77',
      giga_id_school: 'giga-1',
      records: [baseRecord, { ...baseRecord, app_local_uuid: 'uuid-2' }],
    } as any);

    expect(result).toEqual({ success: true, accepted: 2 });
  });
});
