import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CountriesListingDto, CountryFieldToggleDto } from './countries.dto';
import { Prisma, SpeedTestProtocol } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CountriesService {
  private logger = new Logger(CountriesService.name);

  constructor(private prisma: PrismaService) {}

  async getAllCountries(params: CountriesListingDto) {
    const { limit, page, search, country_id,is_active,speed_test_protocol } = plainToInstance(
      CountriesListingDto,
      params,
    );
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.countryWhereInput = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { iso3_format: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (is_active) {
      where.is_active = is_active;
    }

    if (speed_test_protocol) {
      where.speed_test_protocol = speed_test_protocol;
    }

    if (country_id) {
      where.id = country_id;
    }

    const countryDataPromis = new Promise((resolve) =>
      this.prisma.country
        .findMany({
          where,
          skip,
          take,
          include: { _count: { select: { schools: true } } },
          orderBy: { name: 'asc' },
        })
        .then((res) =>
          resolve(
            res.map((el) => {
              (el as any).school_count = el._count.schools;
              delete el._count;
              return { ...el, id: el.id.toString() };
            }),
          ),
        ),
    );
    const [data, total] = await Promise.all([
      countryDataPromis,
      this.prisma.country.count({ where }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async toggleCountryFlags(prams: CountryFieldToggleDto) {
    const body = plainToInstance(CountryFieldToggleDto, prams);
    try {
      const country = await this.prisma.country.findMany({
        select: { id: true },
        where: { id: { in: [1, 2] } },
      });

      if (!country.le) {
        throw new NotFoundException(`Country with ID ${body.ids.join(', ')} not found`);
      }

      if (
        typeof body.speed_test_protocol !== 'undefined' &&
        SpeedTestProtocol[body.speed_test_protocol] === undefined
      ) {
        throw new BadRequestException('Invalid speed test protocol');
      }
      const ids = body.ids.map((id) => Number(id));
      const updatedCountry = await this.prisma.country.updateMany({
        where: { id: { in: ids } },
        data: {
          ...body,
        },
      });
      if (updatedCountry.count) {
        return {
          data: updatedCountry,
          message: 'Country flags updated successfully',
          status: 200,
        };
      } else throw new NotFoundException('Not able to update');
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
