import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('MeasurementController', () => {
  let measurementController: MeasurementController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementController],
      providers: [MeasurementService],
      imports: [AuthGuard],
    }).compile();

    measurementController = app.get<MeasurementController>(
      MeasurementController,
    );
  });

  it('should be defined', () => {
    expect(measurementController).toBeDefined();
  });
});
