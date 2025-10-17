import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { MeasurementServiceV2 } from './measurement.service.v2';

describe('MeasurementServiceV2', () => {
  let service: MeasurementServiceV2;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeasurementServiceV2, PrismaService],
    }).compile();

    service = module.get<MeasurementServiceV2>(MeasurementServiceV2);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCloudflareMeasurement', () => {
    const cloudflarePayload = {
      uuid: '4b8cb6b0-518b-403e-aea6-a14c3bfd8f6a',
      version: '2.0.2',
      provider: 'cloudflare',
      notes: 'manual',
      timestamp: 1760697125447,
      appVersion: '2.0.2',
      dataUsage: {
        download: 469000000,
        upload: 296800000,
        total: 765800000,
      },
      accessInformation: {
        ip: '79.154.48.135',
        hostname: '135.red-79-154-48.dynamicip.rima-tde.net',
        city: 'Barberà del Vallès',
        region: 'Catalonia',
        country: 'ES',
        loc: '41.5159,2.1246',
        org: 'AS3352 TELEFONICA DE ESPANA S.A.U.',
        postal: '08210',
        timezone: 'Europe/Madrid',
        asn: 'AS3352',
      },
      results: {
        summary: {
          download: 333654086.9673409,
          upload: 256289086.55864042,
          latency: 16.799939952316283,
        },
        isFinished: false,
      },
      browserID: '54893be8-930a-4b57-a324-7dee90e1bae3',
      deviceType: 'android',
      schoolID: 'spaintestschool1',
      gigaIDSchool: '02c63702-b27b-4a7f-8013-309d34860ce9',
      ipAddress: '79.154.48.135',
      countryCode: 'es',
    };

    it('should map Cloudflare payload and persist measurement', async () => {
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue({} as any);

      await service.createCloudflareMeasurement(cloudflarePayload as any);

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uuid: cloudflarePayload.uuid,
          school_id: cloudflarePayload.schoolID,
          download: cloudflarePayload.results.summary.download,
          upload: cloudflarePayload.results.summary.upload,
          data_downloaded: cloudflarePayload.dataUsage.download,
          data_uploaded: cloudflarePayload.dataUsage.upload,
          data_usage: cloudflarePayload.dataUsage.total,
          detected_latitude: 41.5159,
          detected_longitude: 2.1246,
          source: 'cloudflare',
          country_code: 'ES',
          app_version: cloudflarePayload.appVersion,
        }),
      });
    });

    it('should throw BadRequestException when schoolID is missing', async () => {
      await expect(
        service.createCloudflareMeasurement({
          ...cloudflarePayload,
          schoolID: '',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
