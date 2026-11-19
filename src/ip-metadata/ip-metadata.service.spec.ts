import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { register } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { IpMetadataService } from 'src/ip-metadata/ip-metadata.service';
import { IpInfoRefreshBudget } from './ip-metadata.refresh-budget';

describe('IpMetadataService', () => {
  let service: IpMetadataService;
  let httpService: HttpService;
  let prismaMock: {
    ipMetadata: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let refreshBudget: { tryTake: jest.Mock };

  // What gets stored when the response has no ISP, company or privacy details.
  const noDetails = {
    asn_name: null,
    asn_type: null,
    asn_route: null,
    company_name: null,
    company_type: null,
    is_vpn: null,
    is_proxy: null,
    is_tor: null,
    is_relay: null,
    is_hosting: null,
  };

  beforeAll(() => {
    process.env.IPINFO_TOKEN = 'test-token';
  });

  beforeEach(async () => {
    prismaMock = {
      ipMetadata: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    // Budget left unless a test says otherwise.
    refreshBudget = { tryTake: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpMetadataService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: PrismaService, useValue: prismaMock },
        { provide: IpInfoRefreshBudget, useValue: refreshBudget },
      ],
    }).compile();

    service = module.get<IpMetadataService>(IpMetadataService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.IPINFO_CACHE_MAX_AGE_DAYS;
  });

  it('should return existing ip info from database without calling external APIs', async () => {
    const existing = {
      ip: '1.2.3.4',
      city: 'Test City',
      region: 'Test Region',
      country: 'TC',
      loc: '10,20',
      org: 'Test Org',
      postal: '99999',
      timezone: 'Test/Zone',
      asn: 'AS12345',
      hostname: 'test-hostname',
      // note: no `source` in the returned object
    };
    prismaMock.ipMetadata.findUnique.mockResolvedValue({
      ...existing,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.getIpInfo('1.2.3.4');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
    });
    expect(httpService.get).not.toHaveBeenCalled();
    expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });

  it('should fetch from primary API (using response.data.asn.asn) and store in DB', async () => {
    prismaMock.ipMetadata.findUnique.mockResolvedValue(null);

    const apiResponse = {
      data: {
        ip: '1.2.3.4',
        city: 'City',
        region: 'Region',
        country: 'CO',
        loc: '0,0',
        org: 'Org Name',
        postal: '12345',
        timezone: 'Zone/Here',
        asn: { asn: 'AS99999' },
      },
    };
    (httpService.get as jest.Mock).mockReturnValue(of(apiResponse));

    // what the app gets back
    const expectedResponse = {
      ip: '1.2.3.4',
      city: 'City',
      region: 'Region',
      country: 'CO',
      loc: '0,0',
      org: 'Org Name',
      postal: '12345',
      timezone: 'Zone/Here',
      asn: 'AS99999',
      hostname: undefined,
    };
    // this is exactly what the service will pass into prisma.upsert
    const expectedCreateData = {
      ...expectedResponse,
      source: 'ipinfo',
      ...noDetails,
      raw: apiResponse.data,
      updated_at: expect.any(Date),
      retry_after: null,
    };
    prismaMock.ipMetadata.upsert.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('1.2.3.4');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
    });

    expect(httpService.get).toHaveBeenCalledWith(
      `https://ipinfo.io/1.2.3.4/json?token=${process.env.IPINFO_TOKEN}`,
    );
    expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
      create: expectedCreateData,
      update: expectedCreateData,
    });
    expect(result).toEqual(expectedResponse);
  });

  it('should fetch from primary API and parse ASN from org if asn.asn is missing', async () => {
    prismaMock.ipMetadata.findUnique.mockResolvedValue(null);

    const apiResponse = {
      data: {
        ip: '5.6.7.8',
        city: 'Other City',
        region: 'Other Region',
        country: 'OR',
        loc: '1,2',
        org: 'AS123TEST Organization',
        postal: '54321',
        timezone: 'Other/Zone',
        // no asn property
      },
    };
    (httpService.get as jest.Mock).mockReturnValue(of(apiResponse));

    const expectedResponse = {
      ip: '5.6.7.8',
      city: 'Other City',
      region: 'Other Region',
      country: 'OR',
      loc: '1,2',
      org: 'AS123TEST Organization',
      postal: '54321',
      timezone: 'Other/Zone',
      asn: 'AS123',
      hostname: undefined,
    };
    const expectedCreateData = {
      ...expectedResponse,
      source: 'ipinfo',
      ...noDetails,
      raw: apiResponse.data,
      updated_at: expect.any(Date),
      retry_after: null,
    };
    prismaMock.ipMetadata.upsert.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('5.6.7.8');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '5.6.7.8', source: 'ipinfo' } },
    });
    expect(httpService.get).toHaveBeenCalledWith(
      `https://ipinfo.io/5.6.7.8/json?token=${process.env.IPINFO_TOKEN}`,
    );
    expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
      where: { ip_source: { ip: '5.6.7.8', source: 'ipinfo' } },
      create: expectedCreateData,
      update: expectedCreateData,
    });
    expect(result.asn).toBe('AS123');
    expect(result).toEqual(expectedResponse);
  });

  it('should fall back to GeoJS API when primary API fails', async () => {
    prismaMock.ipMetadata.findUnique.mockResolvedValue(null);

    const geoJsData = {
      ip: '9.10.11.12',
      city: 'Fallback City',
      region: 'Fallback Region',
      country_code: 'FB',
      latitude: 12.34,
      longitude: 56.78,
      organization_name: 'Fallback Org',
      organization: 'AS00000 Fallback Org',
      area_code: '00000',
      timezone: 'Fallback/Zone',
    };
    // primary call fails
    (httpService.get as jest.Mock)
      .mockImplementationOnce(() => throwError(() => new Error('fail')))
      // fallback succeeds
      .mockReturnValueOnce(of({ data: geoJsData }));

    const expectedResponse = {
      ip: '9.10.11.12',
      city: 'Fallback City',
      region: 'Fallback Region',
      country: 'FB',
      loc: '12.34,56.78',
      org: 'Fallback Org',
      postal: '00000',
      timezone: 'Fallback/Zone',
      asn: 'AS00000',
      hostname: '',
    };
    const expectedCreateData = {
      ...expectedResponse,
      source: 'geojs',
      ...noDetails,
      raw: geoJsData,
      updated_at: expect.any(Date),
      retry_after: null,
    };
    prismaMock.ipMetadata.upsert.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('9.10.11.12');

    // first call: primary URL
    expect((httpService.get as jest.Mock).mock.calls[0][0]).toBe(
      `https://ipinfo.io/9.10.11.12/json?token=${process.env.IPINFO_TOKEN}`,
    );
    // second call: fallback URL
    expect((httpService.get as jest.Mock).mock.calls[1][0]).toBe(
      'https://ipv4.geojs.io/v1/ip/geo/9.10.11.12.json',
    );

    expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
      where: { ip_source: { ip: '9.10.11.12', source: 'geojs' } },
      create: expectedCreateData,
      update: expectedCreateData,
    });
    expect(result).toEqual(expectedResponse);
  });

  it('fetchIpInfoFromAPI should return an error‐object when both APIs fail', async () => {
    (httpService.get as jest.Mock).mockImplementation(() =>
      throwError(() => new Error('both fail')),
    );

    // invoke the private method
    const fn = (service as any).fetchIpInfoFromAPI.bind(service);
    const result = await fn('0.0.0.0');

    expect(result).toEqual({
      ip: '',
      city: '',
      region: '',
      country: '',
      loc: '',
      org: '',
      postal: '',
      timezone: '',
      asn: '',
      hostname: '',
      error: 'Unable to fetch IP information from both APIs',
    });
  });

  describe('refreshing cached records', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

    const cachedRecord = (updatedDaysAgo: number, retryAfter: Date = null) => ({
      id: 7,
      ip: '1.2.3.4',
      city: 'Old City',
      region: 'Old Region',
      country: 'OC',
      loc: '0,0',
      org: 'Old Org',
      postal: '11111',
      timezone: 'Old/Zone',
      asn: 'AS11111',
      hostname: null,
      source: 'ipinfo',
      created_at: daysAgo(400),
      updated_at: daysAgo(updatedDaysAgo),
      retry_after: retryAfter,
    });

    const freshApiResponse = {
      data: {
        ip: '1.2.3.4',
        city: 'New City',
        region: 'New Region',
        country: 'NC',
        loc: '1,1',
        org: 'New Org',
        postal: '22222',
        timezone: 'New/Zone',
        asn: { asn: 'AS22222' },
      },
    };

    const freshData = {
      ip: '1.2.3.4',
      city: 'New City',
      region: 'New Region',
      country: 'NC',
      loc: '1,1',
      org: 'New Org',
      postal: '22222',
      timezone: 'New/Zone',
      asn: 'AS22222',
      hostname: undefined,
      source: 'ipinfo',
      ...noDetails,
      raw: freshApiResponse.data,
      updated_at: expect.any(Date),
      retry_after: null,
    };

    it('should keep using a record younger than the default 30 days', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(cachedRecord(29));

      const result = await service.getIpInfo('1.2.3.4');

      expect(httpService.get).not.toHaveBeenCalled();
      expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
      expect(result.city).toBe('Old City');
    });

    it('should fetch again and update a record older than the default 30 days', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(cachedRecord(31));
      (httpService.get as jest.Mock).mockReturnValue(of(freshApiResponse));
      prismaMock.ipMetadata.upsert.mockResolvedValue({
        ...cachedRecord(0),
        ...freshData,
      });

      const result = await service.getIpInfo('1.2.3.4');

      expect(httpService.get).toHaveBeenCalledWith(
        `https://ipinfo.io/1.2.3.4/json?token=${process.env.IPINFO_TOKEN}`,
      );
      expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
        where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
        create: freshData,
        update: freshData,
      });
      expect(result.city).toBe('New City');
      expect(result).not.toHaveProperty('source');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('updated_at');
      expect(refreshBudget.tryTake).toHaveBeenCalledTimes(1);
    });

    it("should serve the saved record without calling IPInfo once the hour's refresh budget is used up", async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(cachedRecord(31));
      refreshBudget.tryTake.mockResolvedValue(false);

      const result = await service.getIpInfo('1.2.3.4');

      expect(httpService.get).not.toHaveBeenCalled();
      expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
      // Not a failed refresh: it may try again on the next lookup.
      expect(prismaMock.ipMetadata.update).not.toHaveBeenCalled();
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('updated_at');
      expect(result).not.toHaveProperty('retry_after');
    });

    it('should not use the refresh budget for an IP it has never seen', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(null);
      refreshBudget.tryTake.mockResolvedValue(false);
      (httpService.get as jest.Mock).mockReturnValue(of(freshApiResponse));
      prismaMock.ipMetadata.upsert.mockResolvedValue({
        ...cachedRecord(0),
        ...freshData,
      });

      const result = await service.getIpInfo('1.2.3.4');

      expect(refreshBudget.tryTake).not.toHaveBeenCalled();
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(result.city).toBe('New City');
    });

    it('should not use the refresh budget for a record that is still fresh', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(cachedRecord(29));

      await service.getIpInfo('1.2.3.4');

      expect(refreshBudget.tryTake).not.toHaveBeenCalled();
    });

    it('should count IPInfo calls by reason and outcome', async () => {
      const count = async (reason: string, outcome: string) => {
        const metric = await register
          .getSingleMetric('ip_metadata_ipinfo_requests_total')
          .get();
        return (
          metric.values.find(
            (v) => v.labels.reason === reason && v.labels.outcome === outcome,
          )?.value ?? 0
        );
      };
      const newOkBefore = await count('new', 'ok');
      const refreshFailedBefore = await count('refresh', 'failed');

      // An IP never seen, answered by IPInfo.
      prismaMock.ipMetadata.findUnique.mockResolvedValueOnce(null);
      (httpService.get as jest.Mock).mockReturnValueOnce(of(freshApiResponse));
      prismaMock.ipMetadata.upsert.mockResolvedValueOnce({ ...freshData });
      await service.getIpInfo('1.2.3.4');

      // A saved record past its age, IPInfo unreachable (GeoJS fails too).
      prismaMock.ipMetadata.findUnique
        .mockResolvedValueOnce(cachedRecord(45))
        .mockResolvedValueOnce(null);
      (httpService.get as jest.Mock).mockImplementation(() =>
        throwError(() => new Error('down')),
      );
      await service.getIpInfo('1.2.3.4');

      expect((await count('new', 'ok')) - newOkBefore).toBe(1);
      expect((await count('refresh', 'failed')) - refreshFailedBefore).toBe(1);
    });

    it('should read the maximum age from IPINFO_CACHE_MAX_AGE_DAYS', async () => {
      process.env.IPINFO_CACHE_MAX_AGE_DAYS = '7';
      prismaMock.ipMetadata.findUnique.mockResolvedValue(cachedRecord(8));
      (httpService.get as jest.Mock).mockReturnValue(of(freshApiResponse));
      prismaMock.ipMetadata.upsert.mockResolvedValue({
        ...cachedRecord(0),
        ...freshData,
      });

      const result = await service.getIpInfo('1.2.3.4');

      expect(prismaMock.ipMetadata.upsert).toHaveBeenCalled();
      expect(result.city).toBe('New City');
    });

    it('should return the stale record when IPInfo cannot be reached', async () => {
      prismaMock.ipMetadata.findUnique
        .mockResolvedValueOnce(cachedRecord(45)) // stale ipinfo record
        .mockResolvedValueOnce(null); // no geojs record
      (httpService.get as jest.Mock)
        .mockImplementationOnce(() => throwError(() => new Error('fail')))
        .mockReturnValueOnce(
          of({
            data: {
              ip: '1.2.3.4',
              city: 'Fallback City',
              country_code: 'FB',
              organization: 'AS00000 Fallback Org',
            },
          }),
        );

      const before = Date.now();
      const result = await service.getIpInfo('1.2.3.4');

      expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
      expect(prismaMock.ipMetadata.update).toHaveBeenCalledWith({
        where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
        data: { retry_after: expect.any(Date) },
      });
      const retryAfter: Date =
        prismaMock.ipMetadata.update.mock.calls[0][0].data.retry_after;
      expect(retryAfter.getTime()).toBeGreaterThanOrEqual(before + DAY_MS);
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('source');
      expect(result).not.toHaveProperty('updated_at');
      expect(result).not.toHaveProperty('retry_after');
    });

    it('should return the stale record when both APIs fail', async () => {
      prismaMock.ipMetadata.findUnique
        .mockResolvedValueOnce(cachedRecord(45))
        .mockResolvedValueOnce(null);
      (httpService.get as jest.Mock).mockImplementation(() =>
        throwError(() => new Error('both fail')),
      );

      const result = await service.getIpInfo('1.2.3.4');

      expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
      expect(prismaMock.ipMetadata.update).toHaveBeenCalled();
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('error');
    });

    it('should not retry a stale record while its retry_after is in the future', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(
        cachedRecord(45, new Date(Date.now() + DAY_MS / 2)),
      );

      const result = await service.getIpInfo('1.2.3.4');

      expect(httpService.get).not.toHaveBeenCalled();
      expect(prismaMock.ipMetadata.update).not.toHaveBeenCalled();
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('retry_after');
    });

    it('should retry a stale record once its retry_after has passed', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(
        cachedRecord(45, daysAgo(1)),
      );
      (httpService.get as jest.Mock).mockReturnValue(of(freshApiResponse));
      prismaMock.ipMetadata.upsert.mockResolvedValue({
        ...cachedRecord(0),
        ...freshData,
      });

      const result = await service.getIpInfo('1.2.3.4');

      expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
        where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
        create: freshData,
        update: freshData,
      });
      expect(result.city).toBe('New City');
    });
  });

  describe('ISP, company and privacy details', () => {
    // The shape IPInfo returns on plans with these sections (example values).
    const fullApiData = {
      ip: '203.0.113.17',
      hostname: '17.example-isp.net',
      city: 'Test City',
      region: 'Test Region',
      country: 'TC',
      loc: '10.0000,20.0000',
      org: 'AS64500 EXAMPLE TELECOM S.A.',
      postal: '00000',
      timezone: 'Test/Zone',
      asn: {
        asn: 'AS64500',
        name: 'EXAMPLE TELECOM S.A.',
        domain: 'example.net',
        route: '203.0.113.0/24',
        type: 'isp',
      },
      company: {
        name: 'Example Telecom SA',
        domain: 'example.net',
        type: 'isp',
      },
      privacy: {
        vpn: true,
        proxy: false,
        tor: false,
        relay: false,
        hosting: false,
        service: 'Example VPN',
      },
      abuse: {
        address: 'Example Street 1',
        country: 'TC',
        email: 'abuse@example.net',
        name: 'Example Abuse Team',
        network: '203.0.112.0/22',
        phone: '',
      },
      domains: { page: 0, total: 0, domains: [] },
    };

    // Exactly the fields the app got before these details were stored.
    const appResponse = {
      id: 1,
      ip: '203.0.113.17',
      hostname: '17.example-isp.net',
      city: 'Test City',
      region: 'Test Region',
      country: 'TC',
      loc: '10.0000,20.0000',
      org: 'AS64500 EXAMPLE TELECOM S.A.',
      postal: '00000',
      timezone: 'Test/Zone',
      asn: 'AS64500',
    };

    const details = {
      asn_name: 'EXAMPLE TELECOM S.A.',
      asn_type: 'isp',
      asn_route: '203.0.113.0/24',
      company_name: 'Example Telecom SA',
      company_type: 'isp',
      is_vpn: true,
      is_proxy: false,
      is_tor: false,
      is_relay: false,
      is_hosting: false,
    };

    it('should store the details and the full response', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(null);
      (httpService.get as jest.Mock).mockReturnValue(of({ data: fullApiData }));
      prismaMock.ipMetadata.upsert.mockImplementation(async ({ create }) => ({
        id: 1,
        ...create,
        created_at: new Date(),
      }));

      await service.getIpInfo('203.0.113.17');

      const stored = prismaMock.ipMetadata.upsert.mock.calls[0][0].create;
      expect(stored).toMatchObject(details);
      expect(stored.raw).toEqual(fullApiData);
      expect(prismaMock.ipMetadata.upsert.mock.calls[0][0].update).toEqual(
        stored,
      );
    });

    it('should not send the details to the app', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(null);
      (httpService.get as jest.Mock).mockReturnValue(of({ data: fullApiData }));
      prismaMock.ipMetadata.upsert.mockImplementation(async ({ create }) => ({
        id: 1,
        ...create,
        created_at: new Date(),
      }));

      const result = await service.getIpInfo('203.0.113.17');

      expect(result).toEqual(appResponse);
    });

    it('should not send the details of a cached record to the app', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue({
        ...appResponse,
        source: 'ipinfo',
        ...details,
        raw: fullApiData,
        created_at: new Date(),
        updated_at: new Date(),
        retry_after: null,
      });

      const result = await service.getIpInfo('203.0.113.17');

      expect(httpService.get).not.toHaveBeenCalled();
      expect(result).toEqual(appResponse);
    });

    it('should store no details when they come back in an unexpected shape', async () => {
      prismaMock.ipMetadata.findUnique.mockResolvedValue(null);
      const oddData = {
        ...fullApiData,
        asn: 'AS64500',
        company: 'Example Telecom SA',
        privacy: { vpn: 'true', hosting: 1 },
      };
      (httpService.get as jest.Mock).mockReturnValue(of({ data: oddData }));
      prismaMock.ipMetadata.upsert.mockResolvedValue({ id: 1 });

      await service.getIpInfo('203.0.113.17');

      const stored = prismaMock.ipMetadata.upsert.mock.calls[0][0].create;
      expect(stored).toMatchObject({ ...noDetails, asn: 'AS64500' });
      expect(stored.raw).toEqual(oddData);
    });
  });
});
