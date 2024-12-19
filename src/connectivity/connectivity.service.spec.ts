import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityService } from './connectivity.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ConnectivityDto } from './connectivity.dto';
import { existSchool } from 'src/utility/utility';

jest.mock('src/utility/utility', () => ({
  existSchool: jest.fn(),
}));

describe('ConnectivityService', () => {
  let service: ConnectivityService;
  let prismaService: PrismaService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityService,
        {
          provide: PrismaService,
          useValue: {
            connectivity_ping_checks: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConnectivityService>(ConnectivityService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw BadRequestException if school does not exist', async () => {
      (existSchool as jest.Mock).mockResolvedValue(false);

      const dto: ConnectivityDto = {
        id: 1,
        timestamp: new Date(),
        is_connected: true,
        response_time: BigInt(100),
        target_host: 'localhost',
        packet_sent: BigInt(10),
        packet_received: BigInt(10),
        error_message: '',
        giga_id_school: '123',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(existSchool).toHaveBeenCalledWith(prismaService, '123');
    });

    it('should create a new connectivity record', async () => {
      const dto: ConnectivityDto = {
        id: 1,
        timestamp: new Date(),
        is_connected: true,
        response_time: BigInt(100),
        target_host: 'localhost',
        packet_sent: BigInt(10),
        packet_received: BigInt(10),
        error_message: '',
        giga_id_school: '123',
      };
      (existSchool as jest.Mock).mockResolvedValue(true);
      (
        prismaService.connectivity_ping_checks.create as jest.Mock
      ).mockResolvedValue(dto);

      const result = await service.create(dto);

      expect(result).toEqual(dto);
      expect(
        prismaService.connectivity_ping_checks.create,
      ).toHaveBeenCalledWith({ data: { ...dto } });
    });
  });

  describe('findAll', () => {
    it('should return an array of connectivity records', async () => {
      const mockData = [{ id: 1, giga_id_school: '123' }];
      (
        prismaService.connectivity_ping_checks.findMany as jest.Mock
      ).mockResolvedValue(mockData);

      const result = await service.findAll('123');

      expect(result).toEqual(mockData);
      expect(
        prismaService.connectivity_ping_checks.findMany,
      ).toHaveBeenCalledWith({ where: { giga_id_school: '123' } });
    });

    it('should throw BadRequestException if no connectivity checks are found', async () => {
      (
        prismaService.connectivity_ping_checks.findMany as jest.Mock
      ).mockResolvedValue([]);

      await expect(service.findAll('123')).resolves.toEqual([]);
      expect(
        prismaService.connectivity_ping_checks.findMany,
      ).toHaveBeenCalledWith({ where: { giga_id_school: '123' } });
    });
  });

  describe('findOne', () => {
    it('should return a single connectivity record by id', async () => {
      const mockData = { id: 1, giga_id_school: '123' };
      (
        prismaService.connectivity_ping_checks.findUnique as jest.Mock
      ).mockResolvedValue(mockData);

      const result = await service.findOne(1);

      expect(result).toEqual(mockData);
      expect(
        prismaService.connectivity_ping_checks.findUnique,
      ).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null if no connectivity record is found', async () => {
      (
        prismaService.connectivity_ping_checks.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.findOne(1);

      expect(result).toBeNull();
      expect(
        prismaService.connectivity_ping_checks.findUnique,
      ).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
