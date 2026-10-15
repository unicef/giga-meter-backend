import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConnectivityService } from './connectivity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectivityDto } from './connectivity.dto';
import { FacilityTypeService } from '../facility-type/facility-type.service';
import { RegistrationService } from '../registration/registration.service';

import { v1SchoolScope } from '../common/facility-scope';

const giga_id_school = '4c6ca5b2-eaea-3a3e-8087-a4f61dda7664';

const record = (app_local_uuid: string): CreateConnectivityDto => ({
  app_local_uuid,
  browserId: '5f370811-748f-4e4c-9b64-20d81470c977',
  errorMessage: null,
  isConnected: true,
  latency: null,
  timestamp: new Date('2026-03-06T06:35:03.628Z'),
  giga_id_school,
});

const duplicateError = () =>
  new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`app_local_uuid`)',
    {
      code: 'P2002',
      clientVersion: '5.14.0',
      meta: { target: ['app_local_uuid'] },
    },
  );

describe('ConnectivityService', () => {
  let service: ConnectivityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityService,
        PrismaService,
        { provide: FacilityTypeService, useValue: { getByCode: jest.fn() } },
        { provide: RegistrationService, useValue: { resolveForIngest: jest.fn() } },
      ],
    }).compile();

    service = module.get<ConnectivityService>(ConnectivityService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  const schoolExists = (exists: boolean) =>
    jest
      .spyOn(prisma.dailycheckapp_school, 'findFirst')
      .mockResolvedValue(exists ? ({ giga_id_school } as any) : null);

  describe('createMany', () => {
    it('rejects a batch for a school that does not exist', async () => {
      schoolExists(false);

      await expect(
        service.createMany([record('a')], giga_id_school),
      ).rejects.toThrow(new BadRequestException('School does not exist'));
    });

    it('matches the normalized school id and stores it lowercase', async () => {
      schoolExists(true);
      const createMany = jest
        .spyOn(prisma.connectivity_ping_checks, 'createMany')
        .mockResolvedValue({ count: 1 });

      await service.createMany([record('a')], ' TZ-TEST-88001 ');

      expect(prisma.dailycheckapp_school.findFirst).toHaveBeenCalledWith({
        where: { giga_id_school: 'tz-test-88001' },
        select: { id: true },
      });
      expect(createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
          data: [expect.objectContaining({ giga_id_school: 'tz-test-88001' })],
        }),
      );
    });

    it('looks up percent and underscore as literal characters', async () => {
      const findFirst = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);

      await expect(service.createMany([record('a')], '%_\\')).rejects.toThrow(
        new BadRequestException('School does not exist'),
      );

      expect(findFirst).toHaveBeenCalledWith({
        where: { giga_id_school: '%_\\' },
        select: { id: true },
      });
    });

    it('skips records the client already delivered', async () => {
      schoolExists(true);
      const createMany = jest
        .spyOn(prisma.connectivity_ping_checks, 'createMany')
        .mockResolvedValue({ count: 1 });

      const records = [record('a'), record('b')];
      await expect(
        service.createMany(records, giga_id_school),
      ).resolves.toEqual(records);

      expect(createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('surfaces a storage failure instead of blaming the school', async () => {
      schoolExists(true);
      const failure = new Error('connection terminated');
      jest
        .spyOn(prisma.connectivity_ping_checks, 'createMany')
        .mockRejectedValue(failure);

      await expect(
        service.createMany([record('a')], giga_id_school),
      ).rejects.toThrow(failure);
    });
  });

  describe('create', () => {
    it('stores a single check under the lowercase school id', async () => {
      schoolExists(true);
      const create = jest
        .spyOn(prisma.connectivity_ping_checks, 'create')
        .mockResolvedValue({} as any);

      const single = record('a');
      single.giga_id_school = 'TZ-TEST-88001';
      await service.create(single);

      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ giga_id_school: 'tz-test-88001' }),
      });
    });

    it('treats a re-sent record as stored', async () => {
      schoolExists(true);
      jest
        .spyOn(prisma.connectivity_ping_checks, 'create')
        .mockRejectedValue(duplicateError());

      const single = record('a');
      await expect(service.create(single)).resolves.toEqual(single);
    });

    it('surfaces a storage failure instead of blaming the school', async () => {
      schoolExists(true);
      const failure = new Error('connection terminated');
      jest
        .spyOn(prisma.connectivity_ping_checks, 'create')
        .mockRejectedValue(failure);

      await expect(service.create(record('a'))).rejects.toThrow(failure);
    });
  });

  describe('v1 reads', () => {
    it('only return school checks', async () => {
      const findMany = jest
        .spyOn(prisma.connectivity_ping_checks, 'findMany')
        .mockResolvedValue([]);
      const findFirst = jest
        .spyOn(prisma.connectivity_ping_checks, 'findFirst')
        .mockResolvedValue(null);

      await service.findAll({ giga_id_school } as any);
      await service.findOne(7);

      expect(findMany.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ AND: [v1SchoolScope()] }),
      );
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 7, AND: [v1SchoolScope()] },
      });
    });

    it('return the v1 shape, without the facility columns', async () => {
      const row = {
        id: 1,
        giga_id_school,
        app_local_uuid: 'a',
        facility_type_id: 1,
        registration_id: BigInt(42),
        giga_id_health: null,
      };
      jest
        .spyOn(prisma.connectivity_ping_checks, 'findMany')
        .mockResolvedValue([row] as any);
      jest
        .spyOn(prisma.connectivity_ping_checks, 'findFirst')
        .mockResolvedValue(row as any);

      const list = await service.findAll({ giga_id_school } as any);
      const one = await service.findOne(1);

      for (const record of [list.records[0], one]) {
        expect(record).toEqual({ id: 1, giga_id_school, app_local_uuid: 'a' });
        expect(() => JSON.stringify(record)).not.toThrow();
      }
    });
  });
});
