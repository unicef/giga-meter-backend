import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeasurementProvider, Prisma } from '@prisma/client';

import { CountryConfigService } from './country-config.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  countryConfig: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  country: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((operations) =>
    Promise.all(operations),
  ),
};

const baseTimestamp = new Date('2024-01-01T00:00:00.000Z');
const prismaCountryConfig = {
  id: 1,
  countryCode: 'MX',
  measurementProvider: MeasurementProvider.mlab,
  options: { region: 'latam' } as any,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
};

const buildUniqueConstraintError = () => {
  const error = {
    code: 'P2002',
  } as Prisma.PrismaClientKnownRequestError;
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);
  return error;
};

describe('CountryConfigService', () => {
  let service: CountryConfigService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get(CountryConfigService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
  });

  describe('create', () => {
    it('creates a configuration when the country exists', async () => {
      prisma.country.findUnique.mockResolvedValue({ code: 'MX' });
      prisma.countryConfig.create.mockResolvedValue(prismaCountryConfig);

      const result = await service.create({ countryCode: 'mx' });

      expect(prisma.country.findUnique).toHaveBeenCalledWith({ where: { code: 'MX' } });
      expect(prisma.countryConfig.create).toHaveBeenCalledWith({
        data: {
          country: { connect: { code: 'MX' } },
          measurementProvider: MeasurementProvider.mlab,
          options: undefined,
        },
      });
      expect(result).toEqual({
        id: 1,
        countryCode: 'MX',
        measurementProvider: MeasurementProvider.mlab,
        options: { region: 'latam' },
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
      });
    });

    it('throws BadRequestException when Prisma reports duplicate record', async () => {
      prisma.country.findUnique.mockResolvedValue({ code: 'MX' });
      const prismaError = buildUniqueConstraintError();
      prisma.countryConfig.create.mockRejectedValue(prismaError);

      await expect(service.create({ countryCode: 'MX' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated configurations and sanitizes options', async () => {
      const record = { ...prismaCountryConfig, options: 'raw-json' };
      prisma.countryConfig.findMany.mockResolvedValue([record]);
      prisma.countryConfig.count.mockResolvedValue(5);

      const result = await service.findAll({ page: 1, size: 20 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        items: [
          {
            id: 1,
            countryCode: 'MX',
            measurementProvider: MeasurementProvider.mlab,
            options: null,
            createdAt: baseTimestamp,
            updatedAt: baseTimestamp,
          },
        ],
        total: 5,
        page: 1,
        size: 20,
      });
    });
  });

  describe('findOne', () => {
    it('returns a single configuration when found', async () => {
      prisma.countryConfig.findUnique.mockResolvedValue(prismaCountryConfig);

      const result = await service.findOne(1);
      expect(result.countryCode).toBe('MX');
      expect(prisma.countryConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('throws NotFoundException when configuration does not exist', async () => {
      prisma.countryConfig.findUnique.mockResolvedValue(null);

      await expect(service.findOne(42)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates provider and options', async () => {
      prisma.countryConfig.findUnique.mockResolvedValue(prismaCountryConfig);
      const updatedRecord = {
        ...prismaCountryConfig,
        measurementProvider: MeasurementProvider.cloudflare,
        options: { retries: 3 } as any,
      };
      prisma.country.findUnique.mockResolvedValue({ code: 'MX' });
      prisma.countryConfig.update.mockResolvedValue(updatedRecord);

      const result = await service.update(1, {
        countryCode: 'mx',
        measurementProvider: MeasurementProvider.cloudflare,
        options: { retries: 3 },
      });

      expect(prisma.countryConfig.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          measurementProvider: MeasurementProvider.cloudflare,
          options: { retries: 3 },
        }),
      });
      expect(result.measurementProvider).toBe(MeasurementProvider.cloudflare);
      expect(result.options).toEqual({ retries: 3 });
    });

    it('propagates Prisma duplicate errors as BadRequestException', async () => {
      prisma.countryConfig.findUnique.mockResolvedValue(prismaCountryConfig);
      const prismaError = buildUniqueConstraintError();
      prisma.countryConfig.update.mockRejectedValue(prismaError);

      await expect(
        service.update(1, { measurementProvider: MeasurementProvider.cloudflare }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes existing configurations', async () => {
      prisma.countryConfig.findUnique.mockResolvedValue(prismaCountryConfig);
      prisma.countryConfig.delete.mockResolvedValue(prismaCountryConfig);

      const result = await service.remove(1);

      expect(prisma.countryConfig.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.id).toBe(1);
    });
  });
});
