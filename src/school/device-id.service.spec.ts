import {
  CandidateDevice,
  cleanSignals,
  decideDevice,
  DeviceIdService,
  DeviceSignals,
  matchFields,
  SignalField,
} from './device-id.service';

const signals = (
  firmware_uuid: string | null,
  baseboard_serial: string | null,
  disk_serial: string | null,
  machine_guid: string | null = null,
): DeviceSignals => ({
  firmware_uuid,
  baseboard_serial,
  disk_serial,
  machine_guid,
});

const pc = (device_id: string, values: DeviceSignals): CandidateDevice => ({
  device_id,
  ...values,
});

const none = new Set<SignalField>();

describe('decideDevice', () => {
  // The examples table in the plan, against an earlier PC X with A, B, C.
  const X = pc('X', signals('A', 'B', 'C', 'M1'));

  it('first registration of a PC: new device', () => {
    expect(decideDevice(signals('A', 'B', 'C'), [], none)).toEqual({
      device_id: null,
      flags: [],
    });
  });

  it('second Windows user or reinstall, same values: same PC', () => {
    expect(decideDevice(signals('A', 'B', 'C'), [X], none)).toEqual({
      device_id: 'X',
      flags: [],
    });
  });

  it('new disk: 2 match, 1 changed, same PC and flagged', () => {
    expect(decideDevice(signals('A', 'B', 'D'), [X], none)).toEqual({
      device_id: 'X',
      flags: ['disk_serial_changed'],
    });
  });

  it('no firmware UUID and a new disk: 1 match, 1 changed, same PC and flagged', () => {
    expect(decideDevice(signals(null, 'B', 'D'), [X], none)).toEqual({
      device_id: 'X',
      flags: ['disk_serial_changed'],
    });
  });

  it('new motherboard: 1 match, 2 changed, new PC', () => {
    expect(decideDevice(signals('E', 'F', 'C'), [X], none)).toEqual({
      device_id: null,
      flags: [],
    });
  });

  it('a different PC: new PC', () => {
    expect(
      decideDevice(signals('G', 'H', 'J'), [X], none).device_id,
    ).toBeNull();
  });

  it('a missing value on either side is ignored, not counted as a change', () => {
    const older = pc('X', signals('A', null, 'C'));
    expect(decideDevice(signals('A', 'B', null), [older], none)).toEqual({
      device_id: 'X',
      flags: [],
    });
  });

  it('compares values without regard to case', () => {
    expect(decideDevice(signals('a', 'b', 'c'), [X], none).device_id).toBe('X');
  });

  describe('nothing readable', () => {
    it('matches by the Windows install ID when no other PC has it', () => {
      expect(decideDevice(signals(null, null, null, 'M1'), [X], none)).toEqual({
        device_id: 'X',
        flags: ['nothing_readable'],
      });
    });

    it('gets a new ID when the Windows install ID is shared', () => {
      expect(
        decideDevice(
          signals(null, null, null, 'M1'),
          [X],
          new Set<SignalField>(['machine_guid']),
        ),
      ).toEqual({
        device_id: null,
        flags: ['nothing_readable', 'machine_guid_shared'],
      });
    });

    it('gets a new ID when there is no Windows install ID either', () => {
      expect(decideDevice(signals(null, null, null), [X], none)).toEqual({
        device_id: null,
        flags: ['nothing_readable'],
      });
    });
  });

  it('ignores the Windows install ID when a hardware value can be read', () => {
    // Same Windows install ID (a PC copied from the same disk image), but
    // different hardware: a different PC.
    expect(
      decideDevice(signals('G', 'H', 'J', 'M1'), [X], none).device_id,
    ).toBeNull();
  });

  describe('shared values', () => {
    it("don't count: a placeholder firmware UUID alone doesn't match", () => {
      expect(
        decideDevice(
          signals('A', null, null),
          [X],
          new Set<SignalField>(['firmware_uuid']),
        ),
      ).toEqual({ device_id: null, flags: ['firmware_uuid_shared'] });
    });

    it('the other values still decide', () => {
      expect(
        decideDevice(
          signals('A', 'B', 'C'),
          [X],
          new Set<SignalField>(['firmware_uuid']),
        ),
      ).toEqual({ device_id: 'X', flags: ['firmware_uuid_shared'] });
    });
  });

  describe('values pointing to two PCs', () => {
    // Board serial matches X, disk serial matches Y (a disk moved between PCs).
    const Y = pc('Y', signals('G', 'H', 'D'));

    it('follows the firmware UUID when no other PC has it', () => {
      expect(decideDevice(signals('A', null, 'D'), [X, Y], none)).toEqual({
        device_id: 'X',
        flags: ['conflict', 'disk_serial_changed'],
      });
    });

    it('is a new PC when the firmware UUID can not decide', () => {
      expect(
        decideDevice(
          signals(null, 'B', 'D'),
          [X, pc('Y', signals(null, 'Z', 'D'))],
          none,
        ),
      ).toEqual({ device_id: null, flags: ['conflict'] });
    });
  });
});

describe('matchFields', () => {
  it('uses the hardware values that can be read', () => {
    expect(matchFields(signals('A', null, 'C', 'M'))).toEqual([
      'firmware_uuid',
      'disk_serial',
    ]);
  });

  it('uses the Windows install ID only when nothing else can be read', () => {
    expect(matchFields(signals(null, null, null, 'M'))).toEqual([
      'machine_guid',
    ]);
    expect(matchFields(signals(null, null, null, null))).toEqual([]);
  });
});

describe('cleanSignals', () => {
  it('drops blank values, placeholders and blocked generic UUIDs', () => {
    expect(
      cleanSignals({
        device_hardware_id: '03000200-0400-0500-0006-000700080009',
        baseboard_serial: 'To be filled by O.E.M.',
        disk_serial: '   ',
        machine_guid: '0000000000',
      }),
    ).toEqual(signals(null, null, null, null));
  });

  it('keeps real values, trimmed', () => {
    expect(
      cleanSignals({
        device_hardware_id: ' 4c4c4544-0039-4410-8044-b7c04f4b5433 ',
        baseboard_serial: '/7XK2Q12/CNFCW0089000UL/',
        disk_serial: 'S3Z9NX0M123456',
        machine_guid: 'a1b2c3d4-0000-4000-8000-123456789abc',
      }),
    ).toEqual(
      signals(
        '4c4c4544-0039-4410-8044-b7c04f4b5433',
        '/7XK2Q12/CNFCW0089000UL/',
        'S3Z9NX0M123456',
        'a1b2c3d4-0000-4000-8000-123456789abc',
      ),
    );
  });

  it('treats missing fields as null', () => {
    expect(cleanSignals({})).toEqual(signals(null, null, null, null));
  });
});

describe('DeviceIdService.assign', () => {
  let service: DeviceIdService;
  let tx: any;

  beforeEach(() => {
    service = new DeviceIdService();
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ devices: 0, old_schools: 0 }]),
      $executeRaw: jest.fn(),
      dailycheckapp_school: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
  });

  it('gives a new PC a random ID', async () => {
    const first = await service.assign(tx, signals('A', 'B', 'C'));
    const second = await service.assign(tx, signals('A', 'B', 'C'));

    expect(first.device_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.device_id).not.toEqual(first.device_id);
    expect(first.device_id_flags).toEqual([]);
  });

  it("keeps an earlier PC's ID, compared with its latest registration", async () => {
    tx.dailycheckapp_school.findMany
      .mockResolvedValueOnce([{ device_id: 'X' }])
      .mockResolvedValueOnce([
        // Latest first: the disk was replaced after the first registration.
        {
          device_id: 'X',
          device_hardware_id: 'A',
          baseboard_serial: 'B',
          disk_serial: 'D',
          machine_guid: null,
        },
        {
          device_id: 'X',
          device_hardware_id: 'A',
          baseboard_serial: 'B',
          disk_serial: 'C',
          machine_guid: null,
        },
      ]);

    const result = await service.assign(tx, signals('A', 'B', 'D'));

    expect(result).toEqual({ device_id: 'X', device_id_flags: [] });
  });

  it('gives older registrations with the same firmware UUID the same ID', async () => {
    const result = await service.assign(tx, signals('A', 'B', 'C'));

    expect(tx.dailycheckapp_school.updateMany).toHaveBeenCalledWith({
      where: { device_hardware_id: 'A', device_id: null },
      data: { device_id: result.device_id },
    });
  });

  it("doesn't touch older registrations when the firmware UUID is shared", async () => {
    // The firmware UUID is on older registrations at two schools.
    tx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: any[]) =>
        values.includes('A')
          ? [{ devices: 0, old_schools: 2 }]
          : [{ devices: 0, old_schools: 0 }],
    );

    const result = await service.assign(tx, signals('A', 'B', 'C'));

    expect(result.device_id_flags).toEqual(['firmware_uuid_shared']);
    expect(tx.dailycheckapp_school.updateMany).not.toHaveBeenCalled();
  });

  it('treats a serial on two PCs as shared', async () => {
    tx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: any[]) =>
        values.includes('B')
          ? [{ devices: 2, old_schools: 0 }]
          : [{ devices: 0, old_schools: 0 }],
    );

    const result = await service.assign(tx, signals('A', 'B', 'C'));

    expect(result.device_id_flags).toEqual(['baseboard_serial_shared']);
    // Only the counting values are used to look for earlier PCs.
    expect(tx.dailycheckapp_school.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          device_id: { not: null },
          OR: [{ device_hardware_id: 'A' }, { disk_serial: 'C' }],
        },
      }),
    );
  });

  it('takes a transaction-wide lock', async () => {
    await service.lock(tx);

    expect(tx.$executeRaw).toHaveBeenCalled();
    const [strings, key] = tx.$executeRaw.mock.calls[0];
    expect(strings.join('?')).toContain('pg_advisory_xact_lock');
    expect(key).toBe(8828);
  });
});
