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

@Module({
  controllers: [
    UsersController,
    RolesController,
    SchoolsController,
    CountriesController,
  ],
  providers: [
    PrismaService,
    UsersService,
    SchoolsService,
    RolesService,
    CountriesService,
  ],
})
export class AdminMeterModule {}
