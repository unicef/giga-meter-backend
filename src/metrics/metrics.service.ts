import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsDto } from './metrics.dto';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<MetricsDto> {
    const countries = await this.prisma.dailycheckapp_country.count();
    const schools = await this.prisma.dailycheckapp_school.count();
    const measurements = await this.prisma.measurements.count();

    return { countries, schools, measurements };
  }
}
