import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsDto } from './metrics.dto';
import { v1SchoolScope, V1_SCHOOL_SCOPE_SQL } from '../common/facility-scope';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<MetricsDto> {
    const countries = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT c.country_id) as count
      FROM dailycheckapp_country c
      JOIN measurements m ON c.code = m.country_code
      WHERE m.source = 'DailyCheckApp' AND ${V1_SCHOOL_SCOPE_SQL}
    `;
    const schools = await this.prisma.dailycheckapp_school.groupBy({
      by: 'giga_id_school',
      _count: {
        giga_id_school: true,
      },
    }); // ideal solution should be using distinct: 'giga_id_school', but it was not working so it is an alternate solution
    const measurements = await this.prisma.measurements.count({
      where: {
        source: 'DailyCheckApp',
        AND: [v1SchoolScope()],
      },
    });

    return {
      countries: Number(countries[0].count),
      schools: schools?.length,
      measurements,
    };
  }
}
