import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

describe('MeasurementController', () => {
  let controller: MeasurementController;
  let service: MeasurementService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementController],
      providers: [MeasurementService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<MeasurementController>(MeasurementController);
    service = app.get<MeasurementService>(MeasurementService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });
});
