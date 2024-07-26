import { Test, TestingModule } from '@nestjs/testing';
import { CountryService } from './country.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockCountryDto, mockCountryModel } from '../common/mock-objects';
import { toBigInt } from 'src/common/common.utils';

describe('CountryService', () => {
  let service: CountryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryService, PrismaService],
    }).compile();

    service = module.get<CountryService>(CountryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Countries', () => {
    it('should return countries', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue(mockCountryModel);

      const countries = await service.countries({});
      expect(countries).toEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue([]);

      const countries = await service.countries({});
      expect(countries).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.countries({})).rejects.toThrow('Database error');
    });
  });

  describe('CountriesByCode', () => {
    it('should return countries', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue(mockCountryModel);

      const countries = await service.countriesByCode('IN');
      expect(countries).toEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue([]);

      const countries = await service.countriesByCode('IN');
      expect(countries).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.countriesByCode('IN')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CountriesByCodeIso3', () => {
    it('should return countries', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue(mockCountryModel);

      const countries = await service.countriesByCode('IND');
      expect(countries).toEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockResolvedValue([]);

      const countries = await service.countriesByCode('IND');
      expect(countries).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.countriesByCode('IND')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CreateCountry', () => {
    it('should create country', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'create')
        .mockResolvedValue(mockCountryModel[0]);

      const countryId = await service.createCountry(mockCountryDto[0]);
      expect(countryId).toEqual(mockCountryModel[0].id.toString());
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createCountry(mockCountryDto[0])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('DeleteCountry', () => {
    it('should delete country', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'delete')
        .mockResolvedValue(mockCountryModel[0]);

      expect(await service.deleteCountry('IN')).toBe(undefined);
    });

    it('should handle country not found', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirstOrThrow')
        .mockRejectedValue(new Error('Country not found'));

      await expect(service.deleteCountry('IN')).rejects.toThrow(
        'Country not found',
      );
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'delete')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCountry('IN')).rejects.toThrow(
        'Database error',
      );
    });
  });
});
