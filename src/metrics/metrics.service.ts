import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsDto } from './metrics.dto';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<MetricsDto> {
    const countries = await this.prisma.dailycheckapp_country.groupBy({
      by: ['country_id'],
      _count: {
        country_id: true,
      },
    }).then(result => result.length);
    const schools = await this.prisma.dailycheckapp_school.groupBy({
      by: 'giga_id_school',
      _count: {
        giga_id_school: true,
      },
    }); // ideal solution should be using distinct: 'giga_id_school', but it was not working so it is an alternate solution
    const measurements = await this.prisma.measurements.count({
      where: {
        source: 'DailyCheckApp'
      }
    });

    return { countries, schools: schools?.length, measurements };
  }
}
