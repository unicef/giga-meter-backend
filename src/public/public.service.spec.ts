import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockMeasurementModel } from '../common/mock-objects';

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a null latency for a measurement without one', () => {
    // latency is nullable: a test whose server sent no measurement has none.
    const measurement = service['toDto']({
      ...mockMeasurementModel[0],
      latency: null,
    });

    expect(measurement.Latency).toBeNull();
  });
});
