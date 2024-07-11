import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementService } from './measurement.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MeasurementService', () => {
  let service: MeasurementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeasurementService, PrismaService],
    }).compile();

    service = module.get<MeasurementService>(MeasurementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
