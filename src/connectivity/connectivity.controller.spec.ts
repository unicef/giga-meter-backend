import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityController } from './connectivity.controller';
import { ConnectivityService } from './connectivity.service';
import { ConnectivityDto, GetConnectivityRecordsDto } from './connectivity.dto';
import { BadRequestException } from '@nestjs/common';

jest.mock('src/auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => true),
}));

describe('ConnectivityController', () => {
  let controller: ConnectivityController;
  let service: ConnectivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectivityController],
      providers: [
        {
          provide: ConnectivityService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConnectivityController>(ConnectivityController);
    service = module.get<ConnectivityService>(ConnectivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new connectivity check', async () => {
      const dto: ConnectivityDto = {
        id: 1,
        timestamp: new Date(),
        is_connected: true,
        response_time: BigInt(50),
        target_host: 'google.com',
        packet_sent: BigInt(10),
        packet_received: BigInt(10),
        error_message: '',
        giga_id_school: '123',
      };
      jest.spyOn(service, 'create').mockResolvedValue(dto);

      const result = await controller.create(dto);

      expect(result).toEqual(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should throw a BadRequestException if an error occurs', async () => {
      const dto: ConnectivityDto = {
        id: 1,
        timestamp: new Date(),
        is_connected: true,
        response_time: BigInt(100),
        target_host: 'google.com',
        packet_sent: BigInt(10),
        packet_received: BigInt(10),
        error_message: '',
        giga_id_school: '123',
      };
      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new BadRequestException('Error'));

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all connectivity checks for a specific school', async () => {
      const query: GetConnectivityRecordsDto = {
        page: 1,
        size: 10,
        giga_id_school: '123',
      };
      const result: (ConnectivityDto & {
        created_at: Date;
      })[] = [
        {
          id: 1,
          timestamp: new Date(),
          is_connected: true,
          response_time: BigInt(100),
          target_host: 'google.com',
          packet_sent: BigInt(10),
          packet_received: BigInt(10),
          error_message: '',
          giga_id_school: '123',
          created_at: new Date(),
        },
        {
          id: 2,
          timestamp: new Date(),
          is_connected: true,
          response_time: BigInt(100),
          target_host: 'google.com',
          packet_sent: BigInt(10),
          packet_received: BigInt(10),
          error_message: '',
          giga_id_school: '123',
          created_at: new Date(),
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      const response = await controller.findAll(query);

      expect(response).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(query.giga_id_school);
    });

    it('should throw a BadRequestException if an error occurs', async () => {
      const query: GetConnectivityRecordsDto = {
        page: 1,
        size: 10,
        giga_id_school: '123',
      };
      jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new BadRequestException('Error'));

      await expect(controller.findAll(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.findAll).toHaveBeenCalledWith(query.giga_id_school);
    });
  });

  describe('findOne', () => {
    it('should return a connectivity check by id', async () => {
      const id = '1';
      const result: ConnectivityDto & {
        created_at: Date;
      } = {
        id: 1,
        timestamp: new Date(),
        is_connected: true,
        response_time: BigInt(100),
        target_host: 'google.com',
        packet_sent: BigInt(10),
        packet_received: BigInt(10),
        error_message: '',
        giga_id_school: '123',
        created_at: new Date(),
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      const response = await controller.findOne(id);

      expect(response).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw a BadRequestException if an error occurs', async () => {
      const id = '1';
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new BadRequestException('Error'));

      await expect(controller.findOne(id)).rejects.toThrow(BadRequestException);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });
});
