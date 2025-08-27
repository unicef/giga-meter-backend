import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_country as Country } from '@prisma/client';
import { CountryDto } from './country.dto';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  async countries(params: {
    skip?: number;
    take?: number;
    write_access?: boolean;
    countries?: string[];
  }): Promise<CountryDto[]> {
    const { skip, take, write_access, countries } = params;
    const filter: Record<string, any> = {
      code: {
        in: countries,
      },
    };
    if (write_access) {
      delete filter.country_code;
    }

    const records = this.prisma.dailycheckapp_country.findMany({
      where: filter,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    return (await records).map(this.toDto);
  }

  async countriesByCode(code: string): Promise<CountryDto[]> {
    const countries = this.prisma.dailycheckapp_country.findMany({
      where: { code },
    });
    return (await countries).map(this.toDto);
  }

  async countriesByCodeIso3(code_iso3: string): Promise<CountryDto[]> {
    const countries = this.prisma.dailycheckapp_country.findMany({
      where: { code_iso3 },
    });
    return (await countries).map(this.toDto);
  }

  async createCountry(schoolDto: CountryDto): Promise<string | null> {
    const existingRecord = await this.prisma.dailycheckapp_country.findFirst({
      where: { code: schoolDto.code?.toUpperCase() },
    });
    if (existingRecord?.id > 0) {
      return null;
    }

    const country = await this.prisma.dailycheckapp_country.create({
      data: this.toModel(schoolDto),
    });
    return country.id.toString();
  }

  async deleteCountry(code: string): Promise<void> {
    const country = await this.prisma.dailycheckapp_country.findFirstOrThrow({
      where: { code },
    });

    await this.prisma.dailycheckapp_country.delete({
      where: { id: country.id },
    });
  }

  private toDto(country: Country): CountryDto {
    return {
      id: country.id.toString(),
      code: country.code,
      code_iso3: country.code_iso3,
      name: country.name,
      country_id: country.country_id,
      created_at: country.created_at,
    };
  }

  private toModel(country: CountryDto): any {
    return {
      code: country.code?.trim().toUpperCase(),
      code_iso3: country.code_iso3?.trim().toUpperCase(),
      name: country.name,
      country_id: country.country_id,
      created: new Date().toISOString().split('T')[0],
    };
  }

  async getAllCountries(params: {
    skip?: number;
    take?: number;
  }): Promise<CountryDto[]> {
    const { skip, take } = params;

    const records = this.prisma.dailycheckapp_country.findMany({
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    return (await records).map(this.toDto);
  }
}
