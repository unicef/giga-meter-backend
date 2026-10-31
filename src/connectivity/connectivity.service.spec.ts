import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
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

    describe('without a school id', () => {
      const browserId = record('a').browserId;

      const deviceRegisteredTo = (...schools: (string | null)[]) =>
        jest
          .spyOn(prisma.dailycheckapp_school, 'findMany')
          .mockResolvedValue(
            schools.map((school) => ({ giga_id_school: school })) as any,
          );

      it.each(['undefined', 'null', '', ' Undefined '])(
        'stores the batch under the school its device is registered to (%p)',
        async (missingId) => {
          schoolExists(true);
          deviceRegisteredTo(giga_id_school);
          jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
          const createMany = jest
            .spyOn(prisma.connectivity_ping_checks, 'createMany')
            .mockResolvedValue({ count: 2 });

          const records = [record('a'), record('b')];
          await expect(service.createMany(records, missingId)).resolves.toEqual(
            records,
          );

          expect(prisma.dailycheckapp_school.findMany).toHaveBeenCalledWith({
            where: { user_id: browserId },
            select: { giga_id_school: true },
          });
          expect(createMany).toHaveBeenCalledWith({
            data: [
              expect.objectContaining({ app_local_uuid: 'a', giga_id_school }),
              expect.objectContaining({ app_local_uuid: 'b', giga_id_school }),
            ],
            skipDuplicates: true,
          });
        },
      );

      const DAY = 24 * 60 * 60 * 1000;
      const takenDaysAgo = (days: number) => (r: CreateConnectivityDto) => ({
        ...r,
        timestamp: new Date(Date.now() - days * DAY),
      });
      const recent = takenDaysAgo(1);
      const old = takenDaysAgo(31);

      it('rejects a recent batch whose device is not registered', async () => {
        schoolExists(true);
        deviceRegisteredTo();

        await expect(
          service.createMany([recent(record('a'))], 'undefined'),
        ).rejects.toThrow(new BadRequestException('School does not exist'));
      });

      it('rejects a recent batch whose device is registered to two schools', async () => {
        schoolExists(true);
        deviceRegisteredTo(giga_id_school, 'another-school');

        await expect(
          service.createMany([recent(record('a'))], 'undefined'),
        ).rejects.toThrow(new BadRequestException('School does not exist'));
      });

      it('rejects a recent batch from more than one device without looking them up', async () => {
        schoolExists(true);
        const findMany = deviceRegisteredTo(giga_id_school);
        const other = { ...record('b'), browserId: 'another-device' };

        await expect(
          service.createMany([record('a'), other].map(recent), 'undefined'),
        ).rejects.toThrow(new BadRequestException('School does not exist'));
        expect(findMany).not.toHaveBeenCalled();
      });

      it('rejects a recent batch with no browserId without looking it up', async () => {
        schoolExists(true);
        const findMany = deviceRegisteredTo(giga_id_school);

        await expect(
          service.createMany(
            [recent({ ...record('a'), browserId: null })],
            'undefined',
          ),
        ).rejects.toThrow(new BadRequestException('School does not exist'));
        expect(findMany).not.toHaveBeenCalled();
      });

      it('rejects an empty batch', async () => {
        schoolExists(true);

        await expect(service.createMany([], 'undefined')).rejects.toThrow(
          new BadRequestException('School does not exist'),
        );
      });

      describe('older than the app keeps queued pings', () => {
        let warn: jest.SpyInstance;
        let createMany: jest.SpyInstance;

        beforeEach(() => {
          schoolExists(true);
          warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
          createMany = jest
            .spyOn(prisma.connectivity_ping_checks, 'createMany')
            .mockResolvedValue({ count: 0 });
        });

        it.each([
          ['is not registered', [record('a')], []],
          [
            'is registered to two schools',
            [record('a')],
            [giga_id_school, 'x'],
          ],
          [
            'cannot be told apart',
            [record('a'), { ...record('b'), browserId: 'another-device' }],
            [giga_id_school],
          ],
          ['has no browserId', [{ ...record('a'), browserId: null }], []],
        ])(
          'accepts and drops a batch whose device %s',
          async (_, records, schools) => {
            deviceRegisteredTo(...schools);
            const batch = records.map(old);

            await expect(
              service.createMany(batch, 'undefined'),
            ).resolves.toEqual(batch);

            expect(createMany).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining(
                `Dropped ${batch.length} connectivity checks`,
              ),
            );
          },
        );

        it('still stores the batch when its device has one school', async () => {
          deviceRegisteredTo(giga_id_school);

          await service.createMany([old(record('a'))], 'undefined');

          expect(createMany).toHaveBeenCalledWith(
            expect.objectContaining({
              data: [expect.objectContaining({ giga_id_school })],
            }),
          );
        });

        it('rejects the batch if any ping is still within that time', async () => {
          deviceRegisteredTo();

          await expect(
            service.createMany(
              [old(record('a')), recent(record('b'))],
              'undefined',
            ),
          ).rejects.toThrow(new BadRequestException('School does not exist'));
        });

        it('rejects the batch if any ping has no timestamp', async () => {
          deviceRegisteredTo();

          await expect(
            service.createMany(
              [old(record('a')), { ...record('b'), timestamp: null }],
              'undefined',
            ),
          ).rejects.toThrow(new BadRequestException('School does not exist'));
        });
      });
    });

    it('rejects an unknown given school id without looking up the device, even for old pings', async () => {
      schoolExists(false);
      const findMany = jest.spyOn(prisma.dailycheckapp_school, 'findMany');

      await expect(
        service.createMany([record('a')], giga_id_school),
      ).rejects.toThrow(new BadRequestException('School does not exist'));
      expect(findMany).not.toHaveBeenCalled();
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
