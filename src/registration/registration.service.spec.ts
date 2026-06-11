import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityTypeService } from '../entity-type/entity-type.service';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationService } from './registration.service';

const mockEntityTypeSchool = { id: 1, name: 'school', code: 'school' } as any;
const mockEntityTypeHealth = { id: 2, name: 'health', code: 'health' } as any;

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
  let entityTypeService: EntityTypeService;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        PrismaService,
        {
          provide: EntityTypeService,
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
    entityTypeService = module.get<EntityTypeService>(EntityTypeService);
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

  it('rejects when entity_type row is missing', async () => {
    jest.spyOn(entityTypeService, 'getByCode').mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_health: mockHealthFacility.health_id_giga,
        country_code: 'KE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when health facility is not found', async () => {
    jest
      .spyOn(entityTypeService, 'getByCode')
      .mockResolvedValue(mockEntityTypeHealth);
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
      .spyOn(entityTypeService, 'getByCode')
      .mockResolvedValue(mockEntityTypeSchool);
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(null);

    await expect(
      service.createRegistration({
        giga_id_school: mockSchool.giga_id_school,
        country_code: 'KE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when country is not whitelisted for the entity type', async () => {
    jest
      .spyOn(entityTypeService, 'getByCode')
      .mockResolvedValue(mockEntityTypeHealth);
    jest
      .spyOn(healthService, 'findActiveById')
      .mockResolvedValue(mockHealthFacility);
    jest
      .spyOn(prisma.country_entity_type_whitelist, 'findFirst')
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
      .spyOn(entityTypeService, 'getByCode')
      .mockResolvedValue(mockEntityTypeHealth);
    jest
      .spyOn(healthService, 'findActiveById')
      .mockResolvedValue(mockHealthFacility);
    jest
      .spyOn(prisma.country_entity_type_whitelist, 'findFirst')
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
      entity_type: 'health',
    });
    expect(prisma.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity_type_id: mockEntityTypeHealth.id,
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
      .spyOn(entityTypeService, 'getByCode')
      .mockResolvedValue(mockEntityTypeSchool);
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(mockSchool);
    jest
      .spyOn(prisma.country_entity_type_whitelist, 'findFirst')
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
      entity_type: 'school',
    });
    expect(prisma.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity_type_id: mockEntityTypeSchool.id,
          school_id: mockSchool.id,
          health_id: null,
          giga_id_school: mockSchool.giga_id_school,
          giga_id_health: null,
        }),
      }),
    );
  });
});
