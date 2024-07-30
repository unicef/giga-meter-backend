import { Test, TestingModule } from '@nestjs/testing';
import { CountryController } from './country.controller';
import { CountryService } from './country.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { mockCountryDto } from '../common/mock-objects';

describe('CountryController', () => {
  let controller: CountryController;
  let service: CountryService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [CountryService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<CountryController>(CountryController);
    service = app.get<CountryService>(CountryService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetCountries', () => {
    it('should get countries', async () => {
      jest.spyOn(service, 'countries').mockResolvedValue(mockCountryDto);

      const response = await controller.getCountries();
      expect(response.data).toStrictEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'countries').mockResolvedValue([]);

      const response = await controller.getCountries();
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'countries')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getCountries()).rejects.toThrow('Database error');
    });
  });

  describe('GetCountryByCode', () => {
    it('should get country', async () => {
      jest.spyOn(service, 'countriesByCode').mockResolvedValue(mockCountryDto);

      const response = await controller.getCountriesByCode('IN', true);
      expect(response.data).toStrictEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'countriesByCode').mockResolvedValue([]);

      const response = await controller.getCountriesByCode('IN', true);
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'countriesByCode')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getCountriesByCode('IN', true)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetCountryByCodeIso3', () => {
    it('should get country', async () => {
      jest
        .spyOn(service, 'countriesByCodeIso3')
        .mockResolvedValue(mockCountryDto);

      const response = await controller.getCountriesByCodeIso3('IND', true);
      expect(response.data).toStrictEqual(mockCountryDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'countriesByCodeIso3').mockResolvedValue([]);

      const response = await controller.getCountriesByCodeIso3('IND', true);
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'countriesByCodeIso3')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.getCountriesByCodeIso3('IND', true),
      ).rejects.toThrow('Database error');
    });
  });

  describe('CreateCountry', () => {
    it('should create country', async () => {
      jest.spyOn(service, 'createCountry').mockResolvedValue('1');

      const response = await controller.createCountry(mockCountryDto[0]);
      expect(response.data).toStrictEqual('1');
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'createCountry')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.createCountry(mockCountryDto[0])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('DeleteCountry', () => {
    it('should delete country', async () => {
      jest.spyOn(service, 'deleteCountry').mockResolvedValue();

      const response = await controller.deleteCountry('IN');
      expect(response.data).toStrictEqual('country with code: IN deleted');
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'deleteCountry')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.deleteCountry('IN')).rejects.toThrow(
        'Database error',
      );
    });
  });
});
