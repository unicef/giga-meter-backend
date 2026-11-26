import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementService } from './measurement.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import { AnalyticsService } from '../analytics/analytics.service';
import { DeviceIdService } from '../school/device-id.service';
import { FacilityTypeService } from '../facility-type/facility-type.service';
import { HealthService } from '../health/health.service';
import { RegistrationService } from '../registration/registration.service';
import {
  mockAddMeasurementDto,
  mockMeasurementFailedModel,
  mockMeasurementModel,
  mockSchoolModel,
} from '../common/mock-objects';

const DEVICE_ID = '7d0f5c1e-3a52-4f7e-9a0c-2b9f1f6d4e21';
const OTHER_DEVICE_ID = '0b1e7a40-58a4-4c1f-8e8e-41f5f1a0c9d2';
const APP_INSTANCE_ID = '3f2b8c1a-6d4e-4f7a-9b2c-1e5d8a7f6c3b';

/** The events are sent after the response, without being awaited. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** The PostHog events MeasurementService sends for what only the server sees. */
describe('MeasurementService analytics', () => {
  let service: MeasurementService;
  let prisma: PrismaService;
  let analytics: { captureDeviceEvent: jest.Mock; isEnabled: jest.Mock };
  let geolocation: { calculateDistanceAndSetFlag: jest.Mock };

  /**
   * dailycheckapp_school.findFirst answers two questions: does the school
   * exist (by giga_id_school), and which registration sent this (by user_id,
   * the BrowserID of apps before app instances).
   */
  const schoolLookup = (school: unknown) =>
    jest
      .spyOn(prisma.dailycheckapp_school, 'findFirst')
      .mockImplementation(((args: any) =>
        Promise.resolve(
          args?.where?.user_id ? { id: 1n, device_id: DEVICE_ID } : school,
        )) as any);

  beforeEach(async () => {
    analytics = {
      captureDeviceEvent: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
    };
    geolocation = { calculateDistanceAndSetFlag: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementService,
        PrismaService,
        { provide: GeolocationUtility, useValue: geolocation },
        { provide: AnalyticsService, useValue: analytics },
        { provide: FacilityTypeService, useValue: {} },
        { provide: HealthService, useValue: {} },
        { provide: RegistrationService, useValue: {} },
        {
          provide: DeviceIdService,
          useValue: {
            resolve: jest.fn().mockResolvedValue({ device_id: DEVICE_ID }),
          },
        },
      ],
    }).compile();

    service = module.get(MeasurementService);
    prisma = module.get(PrismaService);
  });

  it("reports a refused measurement on its registration's device", async () => {
    schoolLookup(null);
    jest
      .spyOn(prisma.measurements_failed, 'create')
      .mockResolvedValue(mockMeasurementFailedModel[0]);
    const dto = mockAddMeasurementDto[0];

    await service.createMeasurement(dto);
    await settle();

    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_measurement_rejected',
      expect.objectContaining({
        deviceId: DEVICE_ID,
        gigaId: dto.giga_id_school,
        appInstanceId: null,
      }),
      expect.objectContaining({ reason: 'school_doesnt_exist' }),
    );
  });

  it("finds a refused measurement's device by its app instance", async () => {
    schoolLookup(null);
    const own = jest
      .spyOn(prisma.dailycheckapp_school, 'findUnique')
      .mockResolvedValue({ id: 2n, device_id: OTHER_DEVICE_ID } as any);
    jest
      .spyOn(prisma.measurements_failed, 'create')
      .mockResolvedValue(mockMeasurementFailedModel[0]);
    const dto: any = {
      ...mockAddMeasurementDto[0],
      app_instance_id: APP_INSTANCE_ID.toUpperCase(),
    };

    await service.createMeasurement(dto);
    await settle();

    expect(own).toHaveBeenCalledWith(
      expect.objectContaining({ where: { app_instance_id: APP_INSTANCE_ID } }),
    );
    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_measurement_rejected',
      expect.objectContaining({
        deviceId: OTHER_DEVICE_ID,
        appInstanceId: APP_INSTANCE_ID,
      }),
      expect.anything(),
    );
  });

  it('does not look the device up when analytics is off', async () => {
    analytics.isEnabled.mockReturnValue(false);
    const lookup = schoolLookup(null);
    jest
      .spyOn(prisma.measurements_failed, 'create')
      .mockResolvedValue(mockMeasurementFailedModel[0]);

    await service.createMeasurement(mockAddMeasurementDto[0]);
    await settle();

    // Only the school check: no device lookup, no event.
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(analytics.captureDeviceEvent).not.toHaveBeenCalled();
  });

  it('reports a flagged location with the device ID stored, and nothing for an accepted one', async () => {
    schoolLookup(mockSchoolModel[0]);
    jest
      .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
      .mockResolvedValue(null);
    const create = jest
      .spyOn(prisma.measurements, 'create')
      .mockResolvedValue(mockMeasurementModel[0]);
    // The flag is only worked out for a measurement with a school (the mock
    // has none) and a location.
    const dto: any = {
      ...mockAddMeasurementDto[0],
      giga_id_school: 'gigaid1',
      geolocation: { location: { lat: 1, lng: 2 }, accuracy: 900 },
    };

    geolocation.calculateDistanceAndSetFlag.mockResolvedValue({
      distance: 6000,
      accuracy: 900,
      isFlagged: true,
    });
    await service.createMeasurement({ ...dto });
    await settle();
    const stored = (create.mock.calls[0][0] as any).data;
    expect(stored.device_id).toBe(DEVICE_ID);
    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_measurement_flagged',
      expect.objectContaining({ deviceId: DEVICE_ID }),
      expect.objectContaining({
        distance_band: '4-20km',
        accuracy_band: '500m-2km',
      }),
    );

    analytics.captureDeviceEvent.mockClear();
    geolocation.calculateDistanceAndSetFlag.mockResolvedValue({
      distance: 100,
      accuracy: 50,
      isFlagged: false,
    });
    await service.createMeasurement({ ...dto });
    await settle();
    expect(analytics.captureDeviceEvent).not.toHaveBeenCalled();
  });
});
