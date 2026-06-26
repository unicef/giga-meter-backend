import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NearestFacilityService } from './nearest-facility.service';

describe('NearestFacilityService', () => {
  let service: NearestFacilityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NearestFacilityService, PrismaService],
    }).compile();

    service = module.get<NearestFacilityService>(NearestFacilityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the nearest health facility', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
      {
        id: '4001',
        name: 'Nairobi Level 4 Health Centre',
        health_id_giga: 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
        country_code: 'KE',
        latitude: -1.2918,
        longitude: 36.8217,
        distance_meters: 42.567,
      },
    ]);

    const result = await service.findNearest(-1.2921, 36.8219, 'health');

    expect(result).toEqual({
      id: '4001',
      name: 'Nairobi Level 4 Health Centre',
      giga_id: 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
      facility_type: 'health',
      latitude: -1.2918,
      longitude: 36.8217,
      country_code: 'KE',
      distance_meters: 42.57,
    });
  });

  it('returns the nearest school', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
      {
        id: '1234',
        name: 'Sample School',
        giga_id_school: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
        address: '123 Main St',
        country_code: 'KE',
        latitude: -1.29,
        longitude: 36.82,
        distance_meters: 15.1,
      },
    ]);

    const result = await service.findNearest(-1.2921, 36.8219, 'school');

    expect(result).toEqual({
      id: '1234',
      name: 'Sample School',
      giga_id: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
      facility_type: 'school',
      latitude: -1.29,
      longitude: 36.82,
      country_code: 'KE',
      address: '123 Main St',
      distance_meters: 15.1,
    });
  });

  it('throws NotFoundException when no health facility is within range', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

    await expect(
      service.findNearest(-1.2921, 36.8219, 'health'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when no school is within range', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

    await expect(
      service.findNearest(-1.2921, 36.8219, 'school'),
    ).rejects.toThrow(NotFoundException);
  });
});
