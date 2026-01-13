import { Test, TestingModule } from '@nestjs/testing';
import { NearestSchoolController } from './nearest-school.controller';
import { NearestSchoolService } from './nearest-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { CategoryConfigProvider } from '../common/category-config.provider';
import { mockCategoryConfigProvider } from '../common/mock-objects';
import { FindNearestSchoolDto, NearestSchoolResponseDto } from './nearest-school.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { validate } from 'class-validator';

describe('NearestSchoolController', () => {
  let controller: NearestSchoolController;
  let service: NearestSchoolService;
  let prismaService: PrismaService;

  // Mock schools data - some within 1km, some outside
  const mockSchoolsFromDb = [
    {
      id: '1',
      name: 'Closest School',
      giga_id_school: 'giga-id-1',
      address: '100 Main St',
      country_code: 'US',
      latitude: 40.7130,
      longitude: -74.0062,
      distance_meters: 150.25, // Within 1km - closest
    },
    {
      id: '2',
      name: 'Nearby School',
      giga_id_school: 'giga-id-2',
      address: '200 Main St',
      country_code: 'US',
      latitude: 40.7140,
      longitude: -74.0065,
      distance_meters: 350.50, // Within 1km - but farther than school 1
    },
    {
      id: '3',
      name: 'Far School',
      giga_id_school: 'giga-id-3',
      address: '500 Main St',
      country_code: 'US',
      latitude: 40.7200,
      longitude: -74.0100,
      distance_meters: 1200.75, // Outside 1km - should be filtered by ST_DWithin
    },
    {
      id: '4',
      name: 'Another Close School',
      giga_id_school: 'giga-id-4',
      address: '300 Main St',
      country_code: 'CA',
      latitude: 40.7125,
      longitude: -74.0058,
      distance_meters: 450.00, // Within 1km - but farther than school 1
    },
  ];

  const mockNearestSchoolResponse: NearestSchoolResponseDto = {
    id: '1',
    name: 'Closest School',
    giga_id_school: 'giga-id-1',
    address: '100 Main St',
    country_code: 'US',
    latitude: 40.7130,
    longitude: -74.0062,
    distance_meters: 150.25,
  };

  const mockNearestSchoolResponseMinimal: NearestSchoolResponseDto = {
    id: '4',
    name: 'Another Close School',
    giga_id_school: 'giga-id-4',
    address: '300 Main St',
    country_code: 'CA',
    latitude: 40.7125,
    longitude: -74.0058,
    distance_meters: 450.00,
  };

  const mockFindNearestSchoolDto: FindNearestSchoolDto = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [NearestSchoolController],
      providers: [
        NearestSchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
      imports: [HttpModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: () => Promise.resolve(true),
      })
      .compile();

    controller = app.get<NearestSchoolController>(NearestSchoolController);
    service = app.get<NearestSchoolService>(NearestSchoolService);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findNearestSchool', () => {
    it('should return nearest school with full data', async () => {
      jest
        .spyOn(service, 'findNearestSchool')
        .mockResolvedValue(mockNearestSchoolResponse);

      const response = await controller.findNearestSchool(mockFindNearestSchoolDto);

      expect(response.success).toBe(true);
      expect(response.data).toStrictEqual(mockNearestSchoolResponse);
      expect(response.data.id).toBe('1');
      expect(response.data.name).toBe('Closest School');
      expect(response.data.distance_meters).toBe(150.25);
      expect(response.message).toBe('success');
      expect(response.timestamp).toBeDefined();
    });

    it('should return nearest school with all required fields', async () => {
      jest
        .spyOn(service, 'findNearestSchool')
        .mockResolvedValue(mockNearestSchoolResponseMinimal);

      const response = await controller.findNearestSchool(mockFindNearestSchoolDto);

      expect(response.success).toBe(true);
      expect(response.data).toStrictEqual(mockNearestSchoolResponseMinimal);
      expect(response.data.id).toBe('4');
      expect(response.data.name).toBe('Another Close School');
      expect(response.data.giga_id_school).toBe('giga-id-4');
      expect(response.data.address).toBe('300 Main St');
      expect(response.data.country_code).toBe('CA');
      expect(response.data.latitude).toBe(40.7125);
      expect(response.data.longitude).toBe(-74.0058);
      expect(response.data.distance_meters).toBe(450.00);
    });

    it('should handle NotFoundException when no school found', async () => {
      jest
        .spyOn(service, 'findNearestSchool')
        .mockRejectedValue(
          new NotFoundException('No school found within 1000 meters of the provided location'),
        );

      await expect(
        controller.findNearestSchool(mockFindNearestSchoolDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(service, 'findNearestSchool')
        .mockRejectedValue(new Error('Database connection error'));

      await expect(
        controller.findNearestSchool(mockFindNearestSchoolDto),
      ).rejects.toThrow('Database connection error');
    });

    it('should call service with correct coordinates', async () => {
      const findSpy = jest
        .spyOn(service, 'findNearestSchool')
        .mockResolvedValue(mockNearestSchoolResponse);

      await controller.findNearestSchool(mockFindNearestSchoolDto);

      expect(findSpy).toHaveBeenCalledWith(
        mockFindNearestSchoolDto.latitude,
        mockFindNearestSchoolDto.longitude,
      );
    });

    it('should return nearest school from multiple schools within 1km', async () => {
      // Mock Prisma to return schools within 1km (schools 1, 2, 4 - school 3 is outside)
      // The query should return only the closest one (school 1)
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue([mockSchoolsFromDb[0]]); // Only closest school returned

      const result = await service.findNearestSchool(
        mockFindNearestSchoolDto.latitude,
        mockFindNearestSchoolDto.longitude,
      );

      expect(result.id).toBe('1');
      expect(result.name).toBe('Closest School');
      expect(result.distance_meters).toBe(150.25);
      expect(result.distance_meters).toBeLessThan(1000); // Within 1km
    });

    it('should filter out schools outside 1km', async () => {
      // Mock Prisma to return empty array (ST_DWithin filters out school 3)
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      await expect(
        service.findNearestSchool(
          mockFindNearestSchoolDto.latitude,
          mockFindNearestSchoolDto.longitude,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Input Validation', () => {
    describe('Valid Input', () => {
      it('should accept valid coordinates', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 40.7128;
        dto.longitude = -74.0060;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should accept coordinates at boundary values', async () => {
        const dto1 = new FindNearestSchoolDto();
        dto1.latitude = 90;
        dto1.longitude = 180;
        const errors1 = await validate(dto1);
        expect(errors1.length).toBe(0);

        const dto2 = new FindNearestSchoolDto();
        dto2.latitude = -90;
        dto2.longitude = -180;
        const errors2 = await validate(dto2);
        expect(errors2.length).toBe(0);
      });
    });

    describe('Invalid Latitude', () => {
      it('should reject latitude greater than 90', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 91;
        dto.longitude = -74.0060;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('latitude');
        expect(errors[0].constraints).toHaveProperty('max');
      });

      it('should reject latitude less than -90', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = -91;
        dto.longitude = -74.0060;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('latitude');
        expect(errors[0].constraints).toHaveProperty('min');
      });

      it('should reject missing latitude', async () => {
        const dto = new FindNearestSchoolDto();
        dto.longitude = -74.0060;
        // latitude is undefined

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('latitude');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject non-numeric latitude', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 'invalid' as any;
        dto.longitude = -74.0060;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('latitude');
        expect(errors[0].constraints).toHaveProperty('isNumber');
      });
    });

    describe('Invalid Longitude', () => {
      it('should reject longitude greater than 180', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 40.7128;
        dto.longitude = 181;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('longitude');
        expect(errors[0].constraints).toHaveProperty('max');
      });

      it('should reject longitude less than -180', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 40.7128;
        dto.longitude = -181;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('longitude');
        expect(errors[0].constraints).toHaveProperty('min');
      });

      it('should reject missing longitude', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 40.7128;
        // longitude is undefined

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('longitude');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject non-numeric longitude', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 40.7128;
        dto.longitude = 'invalid' as any;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('longitude');
        expect(errors[0].constraints).toHaveProperty('isNumber');
      });
    });

    describe('Multiple Validation Errors', () => {
      it('should reject when both latitude and longitude are invalid', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 100;
        dto.longitude = 200;

        const errors = await validate(dto);
        expect(errors.length).toBe(2);
        expect(errors.some((e) => e.property === 'latitude')).toBe(true);
        expect(errors.some((e) => e.property === 'longitude')).toBe(true);
      });

      it('should reject when both latitude and longitude are missing', async () => {
        const dto = new FindNearestSchoolDto();
        // both are undefined

        const errors = await validate(dto);
        expect(errors.length).toBe(2);
        expect(errors.some((e) => e.property === 'latitude')).toBe(true);
        expect(errors.some((e) => e.property === 'longitude')).toBe(true);
      });

      it('should reject when both latitude and longitude are non-numeric', async () => {
        const dto = new FindNearestSchoolDto();
        dto.latitude = 'not a number' as any;
        dto.longitude = 'also not a number' as any;

        const errors = await validate(dto);
        expect(errors.length).toBe(2);
        expect(errors.some((e) => e.property === 'latitude')).toBe(true);
        expect(errors.some((e) => e.property === 'longitude')).toBe(true);
      });
    });


//    TODO: Update backend config to reject extra properties
//     describe('Extra Properties Rejection', () => {
//       it('should reject request with lat instead of latitude', async () => {
//         const dto = new FindNearestSchoolDto();
//         (dto as any).lat = 40.7128;
//         (dto as any).longitude = -74.0060;

//         const errors = await validate(dto);
//         expect(errors.length).toBeGreaterThan(0);
//         expect(errors.some((e) => e.property === 'latitude')).toBe(true);
//       });

//       it('should reject request with lng instead of longitude', async () => {
//         const dto = new FindNearestSchoolDto();
//         dto.latitude = 40.7128;
//         (dto as any).lng = -74.0060;

//         const errors = await validate(dto);
//         expect(errors.length).toBeGreaterThan(0);
//         expect(errors.some((e) => e.property === 'longitude')).toBe(true);
//       });

//       it('should reject request with extra properties', async () => {
//         const dto = new FindNearestSchoolDto();
//         dto.latitude = 40.7128;
//         dto.longitude = -74.0060;
//         (dto as any).extraField = 'should be rejected';

//         const errors = await validate(dto);
//         // With ValidationPipe whitelist, extra properties should be stripped
//         // But in direct validation, we can check that the DTO only has expected properties
//         expect((dto as any).extraField).toBeDefined(); // Direct validation doesn't strip, but ValidationPipe will
//       });
//     });
   });
});

