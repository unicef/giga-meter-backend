import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolRegistrationService } from './school-registration.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'b8e7d315-08f9-4665-9173-0d465744e4fe'),
}));

describe('SchoolRegistrationService', () => {
  let service: SchoolRegistrationService;
  let prisma: PrismaService;
  let httpService: HttpService;
  const generatedGigaId = 'b8e7d315-08f9-4665-9173-0d465744e4fe';

  const createDto = {
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

  const registrationRecord = {
    id: BigInt(1),
    school_id: createDto.school_id,
    school_name: createDto.school_name,
    latitude: createDto.latitude,
    longitude: createDto.longitude,
    address_line1: createDto.address_line1,
    address_line2: createDto.address_line2,
    city: createDto.city,
    state: createDto.state,
    postal_code: createDto.postal_code,
    contact_name: createDto.contact_name,
    contact_email: createDto.contact_email,
    giga_id_school: generatedGigaId,
    verification_status: 'PENDING',
    verification_requested_at: null,
    verification_error: null,
    created: new Date('2026-03-16T06:00:00.000Z'),
    modified: new Date('2026-03-16T06:00:00.000Z'),
    created_at: new Date('2026-03-16T06:00:00.000Z'),
    deleted: null,
  };

  beforeEach(async () => {
    process.env.GIGA_SYNC_REGISTRATION_URL = 'https://giga-sync.example.com/verify';
    process.env.GIGA_SYNC_AUTH_TOKEN = 'token-123';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolRegistrationService,
        PrismaService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchoolRegistrationService>(SchoolRegistrationService);
    prisma = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    delete process.env.GIGA_SYNC_REGISTRATION_URL;
    delete process.env.GIGA_SYNC_AUTH_TOKEN;
  });

  it('should create a new registration and dispatch it', async () => {
    jest
      .spyOn(prisma.school, 'findFirst')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.school_new_registration, 'create')
      .mockResolvedValue(registrationRecord as any);
    jest
      .spyOn(prisma.school_new_registration, 'update')
      .mockResolvedValue({
        ...registrationRecord,
        verification_status: 'DISPATCHED',
        verification_requested_at: new Date('2026-03-16T06:05:00.000Z'),
      } as any);
    jest
      .spyOn(prisma.school_new_registration, 'findFirstOrThrow')
      .mockResolvedValue({
        ...registrationRecord,
        verification_status: 'DISPATCHED',
      } as any);
    jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { ok: true } }) as any);

    const result = await service.createRegistration(createDto);

    expect(result).toEqual({
      id: '1',
      giga_id_school: generatedGigaId,
      verification_status: 'DISPATCHED',
      deleted: false,
    });
  });

  it('should save registration even when giga_sync dispatch fails', async () => {
    jest
      .spyOn(prisma.school, 'findFirst')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.school_new_registration, 'create')
      .mockResolvedValue(registrationRecord as any);
    jest
      .spyOn(prisma.school_new_registration, 'update')
      .mockResolvedValue({
        ...registrationRecord,
        verification_status: 'FAILED_TO_DISPATCH',
        verification_error: 'dispatch failed',
      } as any);
    jest
      .spyOn(prisma.school_new_registration, 'findFirstOrThrow')
      .mockResolvedValue({
        ...registrationRecord,
        verification_status: 'FAILED_TO_DISPATCH',
      } as any);
    jest.spyOn(httpService, 'post').mockReturnValue(
      throwError(() => ({
        message: 'dispatch failed',
      })) as any,
    );

    const result = await service.createRegistration(createDto);

    expect(result).toEqual({
      id: '1',
      giga_id_school: generatedGigaId,
      verification_status: 'FAILED_TO_DISPATCH',
      deleted: false,
    });
  });

  it('should reject when school_id already exists in school table', async () => {
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValueOnce({
      id: BigInt(10),
    } as any);

    await expect(service.createRegistration(createDto)).rejects.toThrow(
      "school_id 'SCH-1' already exists in school table",
    );
  });

  it('should reject when school_id already exists in school registration table', async () => {
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValueOnce(null);
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValueOnce({
        id: BigInt(11),
      } as any);

    await expect(service.createRegistration(createDto)).rejects.toThrow(
      "school_id 'SCH-1' already exists in school registration table",
    );
  });

  it('should soft delete a registration when rejected', async () => {
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValue(registrationRecord as any);
    jest
      .spyOn(prisma.school_new_registration, 'update')
      .mockResolvedValue({
        ...registrationRecord,
        verification_status: 'REJECTED',
        deleted: new Date('2026-03-16T06:10:00.000Z'),
      } as any);

    const result = await service.rejectRegistration({
      giga_id_school: generatedGigaId,
      is_deleted: true,
    });

    expect(result).toEqual({
      id: '1',
      giga_id_school: generatedGigaId,
      verification_status: 'REJECTED',
      deleted: true,
    });
  });

  it('should no-op when callback says school is not deleted', async () => {
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValue(registrationRecord as any);

    const result = await service.rejectRegistration({
      giga_id_school: generatedGigaId,
      is_deleted: false,
    });

    expect(result).toEqual({
      id: '1',
      giga_id_school: generatedGigaId,
      verification_status: 'PENDING',
      deleted: false,
    });
  });

  it('should be idempotent when repeated rejection arrives after deletion', async () => {
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...registrationRecord,
        verification_status: 'REJECTED',
        deleted: new Date('2026-03-16T06:10:00.000Z'),
      } as any);

    const result = await service.rejectRegistration({
      giga_id_school: generatedGigaId,
      is_deleted: true,
    });

    expect(result).toEqual({
      id: '1',
      giga_id_school: generatedGigaId,
      verification_status: 'REJECTED',
      deleted: true,
    });
  });
});
