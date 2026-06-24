import { Test, TestingModule } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { SchoolService } from 'src/school/school.service';
import { PublicService } from './public.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheInterCeptorOptional } from 'src/config/cache.config';

describe('PublicController', () => {
  let controller: PublicController;

  beforeEach(async () => {
    const moduleRef = Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        {
          provide: SchoolService,
          useValue: {},
        },
        {
          provide: PublicService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterCeptorOptional)
      .useValue({
        intercept: (_context, next) => next.handle(),
      });

    const module: TestingModule = await moduleRef.compile();

    controller = module.get<PublicController>(PublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
