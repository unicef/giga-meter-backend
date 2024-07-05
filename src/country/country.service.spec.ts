import { Test, TestingModule } from '@nestjs/testing';
import { CountryService } from './country.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CountryService', () => {
  let service: CountryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryService, PrismaService],
    }).compile();

    service = module.get<CountryService>(CountryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
