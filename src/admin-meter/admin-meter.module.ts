import { Module } from '@nestjs/common';
import { UsersController } from './users/users.controller';
import { RolesController } from './roles/roles.controller';
import { SchoolsController } from './schools/schools.controller';
import { UsersService } from './users/users.service';
import { SchoolsService } from './schools/schools.service';
import { RolesService } from './roles/roles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CountriesController } from './countries/countries.controller';
import { CountriesService } from './countries/countries.service';
import { AdminAuthGuard } from './admin-auth/admin-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  controllers: [
    UsersController,
    RolesController,
    SchoolsController,
    CountriesController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
    PrismaService,
    UsersService,
    SchoolsService,
    RolesService,
    CountriesService,
  ],
})
export class AdminMeterModule {}
