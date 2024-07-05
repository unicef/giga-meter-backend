import { Test, TestingModule } from '@nestjs/testing';
import { CountryController } from './country.controller';
import { CountryService } from './country.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('CountryController', () => {
  let countryController: CountryController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [CountryService],
      imports: [AuthGuard],
    }).compile();

    countryController = app.get<CountryController>(CountryController);
  });

  it('should be defined', () => {
    expect(countryController).toBeDefined();
  });
});
