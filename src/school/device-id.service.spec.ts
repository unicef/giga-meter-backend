import {
  CandidateDevice,
  cleanSignals,
  decideDevice,
  DeviceIdService,
  DeviceSignals,
  DUPLICATE_VALUES_FLAG,
  hashDeviceId,
  matchFields,
  SignalField,
  valueLockKey,
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

  it('compares values exactly, as the database lookups do', () => {
    expect(
      decideDevice(signals('a', 'b', 'c'), [X], none).device_id,
    ).toBeNull();
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

    it('fall back to the Windows install ID when every readable value is shared', () => {
      expect(
        decideDevice(
          signals('A', null, null, 'M1'),
          [X],
          new Set<SignalField>(['firmware_uuid']),
        ),
      ).toEqual({ device_id: 'X', flags: ['firmware_uuid_shared'] });
    });

    it('give a new ID when the Windows install ID is shared too', () => {
      expect(
        decideDevice(
          signals('A', null, null, 'M1'),
          [X],
          new Set<SignalField>(['firmware_uuid', 'machine_guid']),
        ),
      ).toEqual({
        device_id: null,
        flags: ['firmware_uuid_shared', 'machine_guid_shared'],
      });
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

  it('leaves out shared values, and uses the Windows install ID when none is left', () => {
    const shared = new Set<SignalField>(['firmware_uuid']);
    expect(matchFields(signals('A', 'B', null, 'M'), shared)).toEqual([
      'baseboard_serial',
    ]);
    expect(matchFields(signals('A', null, null, 'M'), shared)).toEqual([
      'machine_guid',
    ]);
    expect(
      matchFields(
        signals('A', null, null, 'M'),
        new Set<SignalField>(['firmware_uuid', 'machine_guid']),
      ),
    ).toEqual([]);
  });
});

describe('hashDeviceId', () => {
  const HARDWARE: SignalField[] = [
    'firmware_uuid',
    'baseboard_serial',
    'disk_serial',
  ];

  it('gives the same values the same ID, as a version 5 UUID', () => {
    const id = hashDeviceId(signals('A', 'B', 'C'), HARDWARE);

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(hashDeviceId(signals('A', 'B', 'C'), HARDWARE)).toBe(id);
  });

  it('gives different values a different ID', () => {
    expect(hashDeviceId(signals('A', 'B', 'D'), HARDWARE)).not.toBe(
      hashDeviceId(signals('A', 'B', 'C'), HARDWARE),
    );
  });

  it('hashes only the given fields', () => {
    expect(
      hashDeviceId(signals('A', 'B', 'C'), ['firmware_uuid', 'disk_serial']),
    ).toBe(
      hashDeviceId(signals('A', 'other', 'C'), [
        'firmware_uuid',
        'disk_serial',
      ]),
    );
  });

  it('tells apart the same value in different fields', () => {
    expect(
      hashDeviceId(signals(null, 'X', null), ['baseboard_serial']),
    ).not.toBe(hashDeviceId(signals(null, null, 'X'), ['disk_serial']));
  });

  it('has nothing to hash without fields', () => {
    expect(hashDeviceId(signals('A', 'B', 'C'), [])).toBeNull();
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
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
  });

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  it('gives a new PC the hash of its values', async () => {
    const result = await service.assign(tx, signals('A', 'B', 'C'));

    expect(result).toEqual({
      device_id: hashDeviceId(signals('A', 'B', 'C'), [
        'firmware_uuid',
        'baseboard_serial',
        'disk_serial',
      ]),
      device_id_flags: [],
    });
    expect(tx.dailycheckapp_school.findFirst).toHaveBeenCalledWith({
      where: { device_id: result.device_id },
      select: { id: true },
    });
  });

  it('hashes only the values that can be read', async () => {
    const result = await service.assign(tx, signals('A', null, 'C'));

    expect(result.device_id).toBe(
      hashDeviceId(signals('A', null, 'C'), ['firmware_uuid', 'disk_serial']),
    );
  });

  it('leaves a shared value out of the hash', async () => {
    tx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: any[]) =>
        values.includes('A')
          ? [{ devices: 2, old_schools: 0 }]
          : [{ devices: 0, old_schools: 0 }],
    );

    const first = await service.assign(tx, signals('A', 'B', 'C'));
    const second = await service.assign(tx, signals('A', 'E', 'F'));

    expect(first).toEqual({
      device_id: hashDeviceId(signals('A', 'B', 'C'), [
        'baseboard_serial',
        'disk_serial',
      ]),
      device_id_flags: ['firmware_uuid_shared'],
    });
    expect(second.device_id).not.toBe(first.device_id);
  });

  it('hashes the Windows install ID when no hardware value counts', async () => {
    tx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: any[]) =>
        values.includes('A')
          ? [{ devices: 2, old_schools: 0 }]
          : [{ devices: 0, old_schools: 0 }],
    );

    const result = await service.assign(tx, signals('A', null, null, 'M1'));

    expect(result).toEqual({
      device_id: hashDeviceId(signals('A', null, null, 'M1'), ['machine_guid']),
      device_id_flags: ['firmware_uuid_shared'],
    });
  });

  it("gives a random ID, flagged, when the hash is already another PC's", async () => {
    // Another PC was first seen with these values, and they no longer match it.
    tx.dailycheckapp_school.findFirst.mockResolvedValue({ id: 7 });

    const result = await service.assign(tx, signals('A', 'B', 'C'));

    expect(result.device_id).toMatch(UUID);
    expect(result.device_id).not.toBe(
      hashDeviceId(signals('A', 'B', 'C'), [
        'firmware_uuid',
        'baseboard_serial',
        'disk_serial',
      ]),
    );
    expect(result.device_id_flags).toEqual([DUPLICATE_VALUES_FLAG]);
  });

  it('gives a random ID when there is nothing to hash', async () => {
    const first = await service.assign(tx, signals(null, null, null));
    const second = await service.assign(tx, signals(null, null, null));

    expect(first.device_id).toMatch(UUID);
    expect(second.device_id).not.toBe(first.device_id);
    expect(first.device_id_flags).toEqual(['nothing_readable']);
    expect(tx.dailycheckapp_school.findFirst).not.toHaveBeenCalled();
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

    // Not the hash of A, B, D: the PC keeps the ID it already has.
    expect(result).toEqual({ device_id: 'X', device_id_flags: [] });
    expect(tx.dailycheckapp_school.findFirst).not.toHaveBeenCalled();
  });

  it('keeps the ID when one value of three changed, and not when two did', async () => {
    const earlier = [
      {
        device_id: 'X',
        device_hardware_id: 'A',
        baseboard_serial: 'B',
        disk_serial: 'C',
        machine_guid: null,
      },
    ];
    tx.dailycheckapp_school.findMany
      .mockResolvedValueOnce([{ device_id: 'X' }])
      .mockResolvedValueOnce(earlier)
      .mockResolvedValueOnce([{ device_id: 'X' }])
      .mockResolvedValueOnce(earlier);

    const newBoard = await service.assign(tx, signals('A', 'E', 'C'));
    const newBoardAndDisk = await service.assign(tx, signals('A', 'E', 'F'));

    expect(newBoard).toEqual({
      device_id: 'X',
      device_id_flags: ['baseboard_serial_changed'],
    });
    expect(newBoardAndDisk).toEqual({
      device_id: hashDeviceId(signals('A', 'E', 'F'), [
        'firmware_uuid',
        'baseboard_serial',
        'disk_serial',
      ]),
      device_id_flags: [],
    });
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

  it('falls back to the Windows install ID when the hardware values are shared', async () => {
    // A placeholder firmware UUID on two PCs, nothing else readable.
    tx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray, ...values: any[]) =>
        values.includes('A')
          ? [{ devices: 2, old_schools: 0 }]
          : [{ devices: 1, old_schools: 0 }],
    );
    tx.dailycheckapp_school.findMany
      .mockResolvedValueOnce([{ device_id: 'X' }])
      .mockResolvedValueOnce([
        {
          device_id: 'X',
          device_hardware_id: 'A',
          baseboard_serial: null,
          disk_serial: null,
          machine_guid: 'M1',
        },
      ]);

    const result = await service.assign(tx, signals('A', null, null, 'M1'));

    expect(result).toEqual({
      device_id: 'X',
      device_id_flags: ['firmware_uuid_shared'],
    });
    expect(tx.dailycheckapp_school.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { device_id: { not: null }, OR: [{ machine_guid: 'M1' }] },
      }),
    );
  });

  it("doesn't look at the Windows install ID when a hardware value counts", async () => {
    await service.assign(tx, signals('A', 'B', null, 'M1'));

    const looked = tx.$queryRaw.mock.calls.map((call: any[]) => call.slice(1));
    expect(looked.flat()).not.toContain('M1');
  });

  describe('resolve', () => {
    // What a measurement gets: the ID by the same rules, with nothing stored.
    const ALL: SignalField[] = [
      'firmware_uuid',
      'baseboard_serial',
      'disk_serial',
    ];

    it("gives a matched PC's ID, compared with its latest registration", async () => {
      tx.dailycheckapp_school.findMany
        .mockResolvedValueOnce([{ device_id: 'X' }])
        .mockResolvedValueOnce([
          {
            device_id: 'X',
            device_hardware_id: 'A',
            baseboard_serial: 'B',
            disk_serial: 'C',
            machine_guid: null,
          },
        ]);

      // A serial that can't be read this time is ignored, not a change.
      const result = await service.resolve(tx, signals('A', 'B', null));

      expect(result.device_id).toBe('X');
      expect(result.flags).toEqual([]);
      expect(tx.dailycheckapp_school.updateMany).not.toHaveBeenCalled();
    });

    it('gives the hash a new PC would get, without storing anything', async () => {
      const result = await service.resolve(tx, signals('A', 'B', 'C'));

      expect(result.device_id).toBe(hashDeviceId(signals('A', 'B', 'C'), ALL));
      expect(tx.dailycheckapp_school.updateMany).not.toHaveBeenCalled();
    });

    it("gives none, flagged, when the hash is already another PC's", async () => {
      tx.dailycheckapp_school.findFirst.mockResolvedValue({ id: 7 });

      const result = await service.resolve(tx, signals('A', 'B', 'C'));

      expect(result.device_id).toBeNull();
      expect(result.flags).toEqual([DUPLICATE_VALUES_FLAG]);
    });

    it('gives none when there is nothing to hash', async () => {
      const result = await service.resolve(tx, signals(null, null, null));

      expect(result.device_id).toBeNull();
      expect(result.flags).toEqual(['nothing_readable']);
    });

    it("treats it as a new PC when two PCs qualify and the firmware UUID can't tell", async () => {
      tx.dailycheckapp_school.findMany
        .mockResolvedValueOnce([{ device_id: 'X' }, { device_id: 'Y' }])
        .mockResolvedValueOnce([
          {
            device_id: 'X',
            device_hardware_id: null,
            baseboard_serial: 'B',
            disk_serial: null,
            machine_guid: null,
          },
          {
            device_id: 'Y',
            device_hardware_id: null,
            baseboard_serial: null,
            disk_serial: 'C',
            machine_guid: null,
          },
        ]);

      const result = await service.resolve(tx, signals(null, 'B', 'C'));

      // As for a registration: a new PC, with the hash of its values.
      expect(result.device_id).toBe(
        hashDeviceId(signals(null, 'B', 'C'), [
          'baseboard_serial',
          'disk_serial',
        ]),
      );
      expect(result.flags).toEqual(['conflict']);
    });
  });

  describe('lock', () => {
    const lockKeys = () =>
      tx.$executeRaw.mock.calls.map(([strings, ...values]: any[]) => {
        expect(strings.join('?')).toContain('pg_advisory_xact_lock');
        expect(values[0]).toBe(8828);
        return values[1];
      });

    it('locks each value, in sorted order', async () => {
      await service.lock(tx, signals('A', 'B', null, 'M1'));

      const keys = lockKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toEqual([...keys].sort((a, b) => a - b));
      expect(keys).toContain(valueLockKey('firmware_uuid', 'A'));
      expect(keys).toContain(valueLockKey('machine_guid', 'M1'));
    });

    it('gives the same value the same key, and different values different keys', () => {
      expect(valueLockKey('disk_serial', 'D1')).toBe(
        valueLockKey('disk_serial', 'D1'),
      );
      expect(valueLockKey('disk_serial', 'D1')).not.toBe(
        valueLockKey('disk_serial', 'D2'),
      );
      expect(valueLockKey('disk_serial', 'D1')).not.toBe(
        valueLockKey('baseboard_serial', 'D1'),
      );
      const key = valueLockKey('firmware_uuid', 'A');
      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(-(2 ** 31));
      expect(key).toBeLessThan(2 ** 31);
    });

    it('takes no lock when the registration has no values', async () => {
      await service.lock(tx, signals(null, null, null, null));

      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('waits at most 5 s for another registration, for this transaction only', async () => {
      await service.lock(tx, signals('A', null, null, null));

      const [strings, ...values] = tx.$queryRaw.mock.calls[0];
      expect(strings.join('?')).toBe(
        "SELECT set_config('lock_timeout', ?, true)",
      );
      expect(values).toEqual(['5s']);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.$executeRaw.mock.invocationCallOrder[0],
      );
    });
  });
});
