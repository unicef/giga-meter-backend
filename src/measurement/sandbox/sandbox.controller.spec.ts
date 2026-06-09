import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../../auth/auth.guard';
import { CategoryConfigProvider } from '../../common/category-config.provider';
import { mockCategoryConfigProvider } from '../../common/mock-objects';
import { MeasurementSandboxController } from './sandbox.controller';
import { MeasurementSandboxService } from './sandbox.service';
import { MeasurementSandboxDto } from './sandbox.dto';

describe('MeasurementSandboxController', () => {
  let controller: MeasurementSandboxController;
  let service: MeasurementSandboxService;

  const sampleHealthRow: MeasurementSandboxDto = {
    timestamp: new Date('2026-04-29T00:00:00Z'),
    browserId: 'fixture-browser-1001',
    download: 8.4,
    upload: 2.3,
    latency: 30,
    entity_type: 'health',
    school_id: null,
    giga_id_school: null,
    giga_id_health: 'h-ke-0001',
    registration_id: '1001',
    country_code: 'KE',
    ip_address: '10.1.0.1',
    app_version: '1.2.3',
    source: 'DailyCheckApp',
    created_at: new Date('2026-04-29T00:01:00Z'),
    device_hardware_id: 'hw-fixture-1001',
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementSandboxController],
      providers: [
        MeasurementSandboxService,
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
      imports: [
        HttpModule,
        ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => Promise.resolve(true) })
      .compile();

    controller = app.get<MeasurementSandboxController>(
      MeasurementSandboxController,
    );
    service = app.get<MeasurementSandboxService>(MeasurementSandboxService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSandboxMeasurementsV2 — happy path', () => {
    it('returns rows from the service', async () => {
      jest
        .spyOn(service, 'measurementsV2Sandbox')
        .mockReturnValue([sampleHealthRow]);

      const response = await controller.getSandboxMeasurementsV2();
      expect(response).toStrictEqual([sampleHealthRow]);
    });

    it('handles empty result set', async () => {
      jest.spyOn(service, 'measurementsV2Sandbox').mockReturnValue([]);

      const response = await controller.getSandboxMeasurementsV2();
      expect(response).toStrictEqual([]);
    });

    it('propagates service errors', async () => {
      jest
        .spyOn(service, 'measurementsV2Sandbox')
        .mockImplementation(() => {
          throw new Error('Sandbox failure');
        });

      await expect(controller.getSandboxMeasurementsV2()).rejects.toThrow(
        'Sandbox failure',
      );
    });
  });

  describe('getSandboxMeasurementsV2 — query forwarding', () => {
    it('passes pagination, ordering, and entity_type through to the service', async () => {
      const spy = jest
        .spyOn(service, 'measurementsV2Sandbox')
        .mockReturnValue([]);

      await controller.getSandboxMeasurementsV2(
        2, // page
        25, // size
        '-created_at',
        'health',
        undefined, // giga_id_school
        'h-ke-0001',
        'KEN',
        'timestamp',
        'gte',
        new Date('2026-04-01T00:00:00Z'),
      );

      expect(spy).toHaveBeenCalledWith({
        skip: 50, // page (2) * size (25)
        take: 25,
        orderBy: '-created_at',
        entity_type: 'health',
        giga_id_school: undefined,
        giga_id_health: 'h-ke-0001',
        country_iso3_code: 'KEN',
        filter_by: 'timestamp',
        filter_condition: 'gte',
        filter_value: new Date('2026-04-01T00:00:00Z'),
      });
    });

    it('applies the v2 defaults (page 0, size 10, -timestamp) when no params are given', async () => {
      const spy = jest
        .spyOn(service, 'measurementsV2Sandbox')
        .mockReturnValue([]);

      await controller.getSandboxMeasurementsV2();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: '-timestamp',
          filter_by: '',
          filter_condition: '',
          filter_value: null,
        }),
      );
    });
  });

  describe('getSandboxMeasurementsV2 — validation', () => {
    const invalidRequest = (
      ...args: Parameters<MeasurementSandboxController['getSandboxMeasurementsV2']>
    ) => controller.getSandboxMeasurementsV2(...args);

    it('rejects an invalid orderBy column', async () => {
      await expect(
        invalidRequest(0, 10, 'random_column'),
      ).rejects.toThrow(HttpException);
      await expect(
        invalidRequest(0, 10, 'random_column'),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('rejects an invalid filterBy column', async () => {
      await expect(
        invalidRequest(
          0,
          10,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'download', // invalid: only timestamp/created_at allowed
          'gt',
          new Date(),
        ),
      ).rejects.toThrow(HttpException);
    });

    it('rejects filterBy without filterCondition', async () => {
      await expect(
        invalidRequest(
          0,
          10,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'timestamp',
          undefined,
          new Date(),
        ),
      ).rejects.toThrow(/filterCondition/);
    });

    it('rejects filterBy + filterCondition without filterValue', async () => {
      await expect(
        invalidRequest(
          0,
          10,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'timestamp',
          'gt',
          undefined,
        ),
      ).rejects.toThrow(/filterValue/);
    });

    it('rejects an invalid filterCondition', async () => {
      await expect(
        invalidRequest(
          0,
          10,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'timestamp',
          'between',
          new Date(),
        ),
      ).rejects.toThrow(/filterCondition/);
    });

    it('rejects an unknown entity_type', async () => {
      await expect(
        invalidRequest(0, 10, undefined, 'hospital'),
      ).rejects.toThrow(/entity_type/);
    });

    it('accepts a valid entity_type without throwing', async () => {
      jest.spyOn(service, 'measurementsV2Sandbox').mockReturnValue([]);

      await expect(
        controller.getSandboxMeasurementsV2(0, 10, undefined, 'health'),
      ).resolves.toEqual([]);
      await expect(
        controller.getSandboxMeasurementsV2(0, 10, undefined, 'school'),
      ).resolves.toEqual([]);
    });
  });
});
