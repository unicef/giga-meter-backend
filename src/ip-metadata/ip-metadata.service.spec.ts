import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { IpMetadataService } from 'src/ip-metadata/ip-metadata.service';

describe('IpMetadataService', () => {
  let service: IpMetadataService;
  let httpService: HttpService;
  let prismaMock: {
    ipMetadata: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeAll(() => {
    process.env.IPINFO_TOKEN = 'test-token';
  });

  beforeEach(async () => {
    prismaMock = {
      ipMetadata: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpMetadataService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: PrismaService, useValue: prismaMock },
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

    // this is exactly what the service will pass into prisma.upsert
    const expectedCreateData = {
      ip: '1.2.3.4',
      city: 'City',
      region: 'Region',
      country: 'CO',
      loc: '0,0',
      org: 'Org Name',
      postal: '12345',
      timezone: 'Zone/Here',
      asn: 'AS99999',
      source: 'ipinfo',
      hostname: undefined,
    };
    prismaMock.ipMetadata.upsert.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('1.2.3.4');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
    });

    expect(httpService.get).toHaveBeenCalledWith(
      `https://ipinfo.io/1.2.3.4/json?token=${process.env.IPINFO_TOKEN}`,
    );
    console.log('expectedCreateData', expectedCreateData);
    expect(prismaMock.ipMetadata.upsert).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
      create: expectedCreateData,
      update: expectedCreateData,
    });
    delete expectedCreateData.source; // remove source for comparison
    expect(result).toEqual(expectedCreateData);
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

    const expectedCreateData = {
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
      source: 'ipinfo',
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
    delete expectedCreateData.source; // remove source for comparison
    expect(result).toEqual(expectedCreateData);
  });

  it('should fall back to GeoJS API when primary API fails', async () => {
    prismaMock.ipMetadata.findUnique.mockResolvedValue(null);

    // primary call fails
    (httpService.get as jest.Mock)
      .mockImplementationOnce(() => throwError(() => new Error('fail')))
      // fallback succeeds
      .mockReturnValueOnce(
        of({
          data: {
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
          },
        }),
      );

    const expectedCreateData = {
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
      source: 'geojs',
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
    delete expectedCreateData.source; // remove source for comparison
    expect(result).toEqual(expectedCreateData);
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

    const cachedRecord = (updatedDaysAgo: number) => ({
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

      const result = await service.getIpInfo('1.2.3.4');

      expect(prismaMock.ipMetadata.upsert).not.toHaveBeenCalled();
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('source');
      expect(result).not.toHaveProperty('updated_at');
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
      expect(result.city).toBe('Old City');
      expect(result).not.toHaveProperty('error');
    });
  });
});
