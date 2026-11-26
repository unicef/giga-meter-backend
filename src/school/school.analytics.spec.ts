import { SchoolService } from './school.service';

const DEVICE_ID = '7d0f5c1e-3a52-4f7e-9a0c-2b9f1f6d4e21';
const OTHER_DEVICE_ID = '0b1e7a40-58a4-4c1f-8e8e-41f5f1a0c9d2';
const APP_INSTANCE_ID = '3f2b8c1a-6d4e-4f7a-9b2c-1e5d8a7f6c3b';
const HARDWARE_ID = '4c4c4544-0042-3510-8051-b4c04f4e3432';
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** Device ID in the API answers and the server-side analytics events. */
describe('SchoolService device ID and analytics', () => {
  let prisma: any;
  let analytics: { captureDeviceEvent: jest.Mock; isEnabled: jest.Mock };
  let service: SchoolService;

  beforeEach(() => {
    prisma = {
      dailycheckapp_school: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    analytics = {
      captureDeviceEvent: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
    };
    service = new SchoolService(prisma, {} as any, {} as any, analytics as any);
  });

  /** One app instance's row: registered by itself on a PC with a device ID. */
  const registration = {
    user_id: 'user-1',
    giga_id_school: 'gigaid1',
    country_code: 'ES',
    device_id: DEVICE_ID,
    device_id_flags: ['disk_serial_changed'],
    app_instance_id: APP_INSTANCE_ID,
    registration_source: 'auto',
  };

  /** count() for all of the device's app instances, then the active ones. */
  const instances = (all: number, active: number) =>
    prisma.dailycheckapp_school.count.mockImplementation((args: any) =>
      Promise.resolve(args?.where?.OR ? active : all),
    );

  it('reports a registration as one app instance on its device', async () => {
    instances(3, 2);

    (service as any).reportRegistration(
      registration,
      { app_version: '2.0.4' },
      false,
    );
    await settle();

    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_device_registered',
      {
        deviceId: DEVICE_ID,
        gigaId: 'gigaid1',
        countryCode: 'ES',
        appInstanceId: APP_INSTANCE_ID,
      },
      expect.objectContaining({
        registration_user_id: 'user-1',
        registration_source: 'auto',
        device_id_flags: ['disk_serial_changed'],
        app_instances_for_device: 3,
        active_app_instances_for_device: 2,
        anomaly: false,
      }),
    );
  });

  it('flags 5 app instances on one device ID as an anomaly', async () => {
    instances(5, 1);

    (service as any).reportRegistration(registration, {}, false);
    await settle();

    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_device_registered',
      expect.anything(),
      expect.objectContaining({ app_instances_for_device: 5, anomaly: true }),
    );
  });

  it('reports a registration saved without a device ID', async () => {
    (service as any).reportRegistration(
      { ...registration, device_id: null, device_id_flags: [] },
      {},
      false,
    );
    await settle();

    expect(prisma.dailycheckapp_school.count).not.toHaveBeenCalled();
    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_device_registered',
      expect.objectContaining({ deviceId: null }),
      expect.objectContaining({ has_device_id: false, anomaly: false }),
    );
  });

  it("reports a deactivation on the device ID's person, with the app instances it logged out", async () => {
    prisma.dailycheckapp_school.findFirst.mockResolvedValue({
      device_id: DEVICE_ID,
      country_code: 'ES',
    });
    prisma.dailycheckapp_school.updateMany.mockResolvedValue({ count: 2 });

    await service.deactivateDevice('hw-1', 'GigaID1');

    expect(analytics.captureDeviceEvent).toHaveBeenCalledWith(
      'server_device_deactivated',
      { deviceId: DEVICE_ID, gigaId: 'GigaID1', countryCode: 'ES' },
      { deactivated: true, app_instances_deactivated: 2 },
    );
  });

  it('tells the app its device ID in the status check', async () => {
    prisma.dailycheckapp_school.findFirst.mockResolvedValue({
      is_active: true,
      device_id: DEVICE_ID,
    });

    const status = await service.checkDeviceStatus(HARDWARE_ID, 'gigaid1');

    expect(status).toEqual(
      expect.objectContaining({ is_active: true, device_id: DEVICE_ID }),
    );
    expect(prisma.dailycheckapp_school.findUnique).not.toHaveBeenCalled();
  });

  it("gives the asking app instance its own row's device ID", async () => {
    // The latest row for this firmware UUID and school is another PC's.
    prisma.dailycheckapp_school.findFirst.mockResolvedValue({
      is_active: true,
      device_id: OTHER_DEVICE_ID,
      app_instance_id: null,
    });
    prisma.dailycheckapp_school.findUnique.mockResolvedValue({
      device_id: DEVICE_ID,
    });

    const status = await service.checkDeviceStatus(
      HARDWARE_ID,
      'gigaid1',
      APP_INSTANCE_ID.toUpperCase(),
    );

    expect(prisma.dailycheckapp_school.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { app_instance_id: APP_INSTANCE_ID } }),
    );
    expect(status).toEqual(
      expect.objectContaining({ is_active: true, device_id: DEVICE_ID }),
    );
  });

  it('falls back to the latest row when the app instance has none yet', async () => {
    prisma.dailycheckapp_school.findFirst.mockResolvedValue({
      is_active: true,
      device_id: DEVICE_ID,
      app_instance_id: null,
    });
    prisma.dailycheckapp_school.findUnique.mockResolvedValue(null);

    const status = await service.checkDeviceStatus(
      HARDWARE_ID,
      'gigaid1',
      APP_INSTANCE_ID,
    );

    expect(status.device_id).toBe(DEVICE_ID);
  });
});
