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
    const { limit, page, search, country_id } = plainToInstance(
      CountriesListingDto,
      params,
    );
    const skip = (page - 1) * limit;
    const take = limit;
    const where: Prisma.countryWhereInput = {};
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
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
          orderBy: { is_active: 'desc' },
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

  async toggleCountryFlags(id: number, prams: CountryFieldToggleDto) {
    const body = plainToInstance(CountryFieldToggleDto, prams);
    try {
      const country = await this.prisma.country.findUnique({ where: { id } });

      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      if (
        typeof body.speed_test_protocol !== 'undefined' &&
        SpeedTestProtocol[body.speed_test_protocol] === undefined
      ) {
        throw new BadRequestException('Invalid speed test protocol');
      }

      const updatedCountry = await this.prisma.country.update({
        where: { id },
        data: {
          ...body,
        },
      });
      if (updatedCountry) {
        updatedCountry.id = updatedCountry.id.toString() as any;
        return {
          data: updatedCountry,
          message: 'Country flags updated successfully',
          status: 200,
        };
      } else throw new InternalServerErrorException('Something went wrong');
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
