import { FeatureFlagV2Controller } from './feature-flag.v2.controller';

describe('FeatureFlagV2Controller', () => {
  let prisma: any;
  let schoolMasterService: any;
  let controller: FeatureFlagV2Controller;

  beforeEach(() => {
    prisma = { registration: { findFirst: jest.fn() } };
    schoolMasterService = { flagsByGigaId: jest.fn() };
    controller = new FeatureFlagV2Controller(prisma, schoolMasterService);
  });

  it('returns the defaults before the install is registered', async () => {
    prisma.registration.findFirst.mockResolvedValue(null);

    await expect(controller.resolve('inst-1')).resolves.toEqual({
      pingService: true,
    });
    expect(schoolMasterService.flagsByGigaId).not.toHaveBeenCalled();
  });

  it('returns the defaults for a health install', async () => {
    prisma.registration.findFirst.mockResolvedValue({ giga_id_school: null });

    await expect(controller.resolve('inst-1')).resolves.toEqual({
      pingService: true,
    });
  });

  it("returns the school's flags for a school install, as v1 does", async () => {
    prisma.registration.findFirst.mockResolvedValue({
      giga_id_school: 'ABC-1',
    });
    schoolMasterService.flagsByGigaId.mockResolvedValue({
      pingService: false,
      feature_flag: true,
    });

    await expect(controller.resolve('inst-1')).resolves.toEqual({
      pingService: false,
      feature_flag: true,
    });
    expect(schoolMasterService.flagsByGigaId).toHaveBeenCalledWith('abc-1');
  });

  it('falls back to the defaults when the school is unknown', async () => {
    schoolMasterService.flagsByGigaId.mockRejectedValue(new Error('not found'));

    await expect(controller.resolve(undefined, 'missing')).resolves.toEqual({
      pingService: true,
    });
  });
});
