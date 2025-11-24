import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CountryConfig, MeasurementProvider, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  CountryConfigDto,
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
} from './country-config.dto';

@Injectable()
export class CountryConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCountryConfigDto): Promise<CountryConfigDto> {
    const countryCode = this.normalizeCountryCode(dto.countryCode);
    await this.ensureCountryExists(countryCode);

    try {
      const record = await this.prisma.countryConfig.create({
        data: {
          country: { connect: { code: countryCode } },
          measurementProvider:
            dto.measurementProvider ?? MeasurementProvider.mlab,
          options:
            dto.options !== undefined
              ? (dto.options as Prisma.JsonValue)
              : undefined,
        },
      });
      return this.toDto(record);
    } catch (error) {
      this.handlePrismaError(error, countryCode);
    }
  }

  async findAll(params?: { page?: number; size?: number }): Promise<{
    items: CountryConfigDto[];
    total: number;
    page: number;
    size: number;
  }> {
    const page = Math.max(0, params?.page ?? 0);
    const size = Math.min(Math.max(1, params?.size ?? 10), 100);
    const skip = page * size;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.countryConfig.findMany({
        skip,
        take: size,
        orderBy: { countryCode: 'asc' },
      }),
      this.prisma.countryConfig.count(),
    ]);

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      size,
    };
  }

  async findOne(id: number): Promise<CountryConfigDto> {
    const config = await this.prisma.countryConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundException(
        `Country configuration with id ${id} was not found`,
      );
    }
    return this.toDto(config);
  }

  async update(
    id: number,
    dto: UpdateCountryConfigDto,
  ): Promise<CountryConfigDto> {
    await this.findOne(id);

    const data: Prisma.CountryConfigUpdateInput = {};

    if (dto.countryCode) {
      const countryCode = this.normalizeCountryCode(dto.countryCode);
      await this.ensureCountryExists(countryCode);
      data.country = { connect: { code: countryCode } };
    }

    if (dto.measurementProvider) {
      data.measurementProvider = dto.measurementProvider;
    }

    if (dto.options !== undefined) {
      data.options = dto.options as Prisma.JsonValue;
    }

    try {
      const record = await this.prisma.countryConfig.update({
        where: { id },
        data,
      });
      return this.toDto(record);
    } catch (error) {
      const countryCode = dto.countryCode
        ? this.normalizeCountryCode(dto.countryCode)
        : undefined;
      this.handlePrismaError(error, countryCode);
    }
  }
  async updateByCode(
    code: string,
    dto: UpdateCountryConfigDto,
  ): Promise<CountryConfigDto> {
    const countryCode = this.normalizeCountryCode(code);
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });
    if (!config) {
      throw new NotFoundException(
        `Country configuration with code ${countryCode} was not found`,
      );
    }
    return this.update(config.id, dto);
  }

  async remove(id: number): Promise<CountryConfigDto> {
    await this.findOne(id);
    const record = await this.prisma.countryConfig.delete({ where: { id } });
    return this.toDto(record);
  }

  private normalizeCountryCode(countryCode: string): string {
    const trimmed = countryCode?.trim().toUpperCase();
    if (!trimmed) {
      throw new BadRequestException('countryCode is required');
    }
    return trimmed;
  }

  private async ensureCountryExists(code: string): Promise<void> {
    const country = await this.prisma.country.findUnique({ where: { code } });
    if (!country) {
      throw new BadRequestException(`Country with code ${code} does not exist`);
    }
  }

  private handlePrismaError(error: unknown, countryCode?: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const identifier = countryCode
        ? `code ${countryCode}`
        : 'the provided country code';
      throw new BadRequestException(
        `A country configuration for ${identifier} already exists`,
      );
    }
    throw error;
  }

  private toDto(model: CountryConfig): CountryConfigDto {
    const options =
      model.options &&
      typeof model.options === 'object' &&
      !Array.isArray(model.options)
        ? (model.options as Record<string, unknown>)
        : null;

    return {
      id: model.id,
      countryCode: model.countryCode,
      measurementProvider: model.measurementProvider,
      options,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
  async findByCode(code: string): Promise<CountryConfigDto> {
    const countryCode = this.normalizeCountryCode(code);
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });
    if (!config) {
      throw new NotFoundException(
        `Country configuration with code ${countryCode} was not found`,
      );
    }
    return this.toDto(config);
  }
}
