import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

const mockHealthRow = {
  id: BigInt(4001),
  health_id_giga: 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  facility_name: 'Nairobi Level 4 Health Centre',
  facility_level: 'Level 4',
  facility_type_govt: 'Dispensary',
  facility_ownership_govt: 'Public',
  latitude: -1.2918,
  longitude: 36.8217,
  country_code: 'KE',
  admin1: 'Nairobi',
  admin2: 'Westlands',
  is_facility_open: true,
  connectivity: 'Yes',
  electricity_availability: 'Yes',
  dhis2_id: 'DHIS2-KE-40001',
  num_staff: 12,
  pop_within_5km: 34200,
  deleted: null,
} as any;

describe('HealthService', () => {
  let service: HealthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, PrismaService],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns mapped list items', async () => {
      jest.spyOn(prisma.health, 'findMany').mockResolvedValue([mockHealthRow]);

      const result = await service.findAll(0, 10, 'facility_name');

      expect(result).toEqual([
        {
          id: '4001',
          health_id_giga: mockHealthRow.health_id_giga,
          facility_name: mockHealthRow.facility_name,
          facility_level: mockHealthRow.facility_level,
          facility_type_govt: mockHealthRow.facility_type_govt,
          facility_ownership_govt: mockHealthRow.facility_ownership_govt,
          latitude: mockHealthRow.latitude,
          longitude: mockHealthRow.longitude,
          country_code: mockHealthRow.country_code,
          admin1: mockHealthRow.admin1,
          admin2: mockHealthRow.admin2,
          is_facility_open: mockHealthRow.is_facility_open,
          connectivity: mockHealthRow.connectivity,
          electricity_availability: mockHealthRow.electricity_availability,
        },
      ]);
    });

    it('filters by country_code when provided', async () => {
      const findMany = jest
        .spyOn(prisma.health, 'findMany')
        .mockResolvedValue([mockHealthRow]);

      await service.findAll(0, 10, 'facility_name', 'KE');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ country_code: 'KE', deleted: null }),
        }),
      );
    });

    it('restricts to allowed countries when write_access is false', async () => {
      const findMany = jest
        .spyOn(prisma.health, 'findMany')
        .mockResolvedValue([]);

      await service.findAll(0, 10, 'facility_name', undefined, false, [
        'KE',
        'ZA',
      ]);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country_code: { in: ['KE', 'ZA'] },
            deleted: null,
          }),
        }),
      );
    });
  });

  describe('findByGigaId', () => {
    it('returns detail dto for an active facility', async () => {
      jest.spyOn(prisma.health, 'findFirst').mockResolvedValue(mockHealthRow);

      const result = await service.findByGigaId(mockHealthRow.health_id_giga);

      expect(result).toMatchObject({
        id: '4001',
        health_id_giga: mockHealthRow.health_id_giga,
        dhis2_id: mockHealthRow.dhis2_id,
        num_staff: mockHealthRow.num_staff,
        pop_within_5km: mockHealthRow.pop_within_5km,
      });
    });

    it('throws NotFoundException when facility is missing', async () => {
      jest.spyOn(prisma.health, 'findFirst').mockResolvedValue(null);

      await expect(
        service.findByGigaId('does-not-exist'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActiveById', () => {
    it('returns the health row when found', async () => {
      jest.spyOn(prisma.health, 'findFirst').mockResolvedValue(mockHealthRow);

      await expect(
        service.findActiveById(mockHealthRow.health_id_giga),
      ).resolves.toEqual(mockHealthRow);
    });

    it('returns null when not found', async () => {
      jest.spyOn(prisma.health, 'findFirst').mockResolvedValue(null);

      await expect(service.findActiveById('missing')).resolves.toBeNull();
    });
  });
});
