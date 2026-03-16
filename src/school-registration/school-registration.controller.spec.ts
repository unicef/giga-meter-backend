import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { SchoolRegistrationController } from './school-registration.controller';
import { SchoolRegistrationService } from './school-registration.service';
import { CreateSchoolRegistrationDto } from './school-registration.dto';

describe('SchoolRegistrationController', () => {
  let controller: SchoolRegistrationController;
  let service: SchoolRegistrationService;
  let validationPipe: ValidationPipe;

  const validPayload = {
    school_id: 'SCH-1',
    school_name: 'Alpha School',
    latitude: 12.34,
    longitude: 56.78,
    address_line1: 'Address 1',
    address_line2: 'Address 2',
    city: 'Pune',
    state: 'Maharashtra',
    postal_code: '411001',
    contact_name: 'Jane Doe',
    contact_email: 'jane@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolRegistrationController],
      providers: [
        {
          provide: SchoolRegistrationService,
          useValue: {
            createRegistration: jest.fn(),
            rejectRegistration: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SchoolRegistrationController>(
      SchoolRegistrationController,
    );
    service = module.get<SchoolRegistrationService>(SchoolRegistrationService);
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  it('should create a registration', async () => {
    jest.spyOn(service, 'createRegistration').mockResolvedValue({
      id: '1',
      giga_id_school: 'b8e7d315-08f9-4665-9173-0d465744e4fe',
      verification_status: 'DISPATCHED',
      deleted: false,
    });

    const dto = (await validationPipe.transform(validPayload, {
      type: 'body',
      metatype: CreateSchoolRegistrationDto,
    })) as CreateSchoolRegistrationDto;

    const response = await controller.createRegistration(dto);

    expect(response.data).toEqual({
      id: '1',
      giga_id_school: 'b8e7d315-08f9-4665-9173-0d465744e4fe',
      verification_status: 'DISPATCHED',
      deleted: false,
    });
  });

  it('should reject invalid email', async () => {
    await expect(
      validationPipe.transform(
        {
          ...validPayload,
          contact_email: 'bad-email',
        },
        {
          type: 'body',
          metatype: CreateSchoolRegistrationDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('should reject giga_id_school from frontend payload', async () => {
    await expect(
      validationPipe.transform(
        {
          ...validPayload,
          giga_id_school: 'not-allowed',
        },
        {
          type: 'body',
          metatype: CreateSchoolRegistrationDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('should reject invalid latitude', async () => {
    await expect(
      validationPipe.transform(
        {
          ...validPayload,
          latitude: 123,
        },
        {
          type: 'body',
          metatype: CreateSchoolRegistrationDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('should reject invalid longitude', async () => {
    await expect(
      validationPipe.transform(
        {
          ...validPayload,
          longitude: 190,
        },
        {
          type: 'body',
          metatype: CreateSchoolRegistrationDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('should reject empty required strings', async () => {
    await expect(
      validationPipe.transform(
        {
          ...validPayload,
          school_name: '',
        },
        {
          type: 'body',
          metatype: CreateSchoolRegistrationDto,
        },
      ),
    ).rejects.toThrow();
  });
});
