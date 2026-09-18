import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConnectivityService } from './connectivity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectivityDto } from './connectivity.dto';

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
      providers: [ConnectivityService, PrismaService],
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
});
