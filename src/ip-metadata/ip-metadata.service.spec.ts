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
      create: jest.Mock;
    };
  };

  beforeAll(() => {
    process.env.IPINFO_TOKEN = 'test-token';
  });

  beforeEach(async () => {
    prismaMock = {
      ipMetadata: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
    prismaMock.ipMetadata.findUnique.mockResolvedValue(existing);

    const result = await service.getIpInfo('1.2.3.4');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
    });
    expect(httpService.get).not.toHaveBeenCalled();
    expect(prismaMock.ipMetadata.create).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });

  it('should fetch from IPInfo Lite API and store in DB', async () => {
    prismaMock.ipMetadata.findUnique.mockResolvedValue(null);

    const apiResponse = {
      data: {
        ip: '1.2.3.4',
        asn: 'AS99999',
        as_name: 'Test ISP Inc.',
        as_domain: 'testisp.com',
        country_code: 'CO',
        country: 'Colombia',
        continent_code: 'SA',
        continent: 'South America',
      },
    };
    (httpService.get as jest.Mock).mockReturnValue(of(apiResponse));

    const expectedCreateData = {
      ip: '1.2.3.4',
      city: '',
      region: '',
      country: 'CO',
      loc: '',
      org: 'Test ISP Inc.',
      postal: '',
      timezone: '',
      asn: 'AS99999',
      source: 'ipinfo',
      hostname: '',
    };
    prismaMock.ipMetadata.create.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('1.2.3.4');

    expect(prismaMock.ipMetadata.findUnique).toHaveBeenCalledWith({
      where: { ip_source: { ip: '1.2.3.4', source: 'ipinfo' } },
    });

    expect(httpService.get).toHaveBeenCalledWith(
      `https://ipinfo.io/lite/1.2.3.4?token=${process.env.IPINFO_TOKEN}`,
    );
    expect(prismaMock.ipMetadata.create).toHaveBeenCalledWith({
      data: expectedCreateData,
    });
    delete expectedCreateData.source;
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
    prismaMock.ipMetadata.create.mockResolvedValue({ ...expectedCreateData });

    const result = await service.getIpInfo('9.10.11.12');

    // first call: primary URL (Lite)
    expect((httpService.get as jest.Mock).mock.calls[0][0]).toBe(
      `https://ipinfo.io/lite/9.10.11.12?token=${process.env.IPINFO_TOKEN}`,
    );
    // second call: fallback URL
    expect((httpService.get as jest.Mock).mock.calls[1][0]).toBe(
      'https://ipv4.geojs.io/v1/ip/geo/9.10.11.12.json',
    );

    expect(prismaMock.ipMetadata.create).toHaveBeenCalledWith({
      data: expectedCreateData,
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
});
