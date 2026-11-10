import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/public.decorator';
import { CacheInterCeptorOptional } from '../config/cache.config';

export class CountryFacilityTypesDto {
  @ApiProperty({ example: 'KE' })
  country_code: string;

  @ApiProperty({ example: 'Kenya' })
  name: string;

  @ApiProperty({
    type: [String],
    example: ['school', 'health'],
    description: 'Facility types enabled for this country (whitelist-driven)',
  })
  supported_facility_types: string[];
}

/**
 * GET /api/v2/countries — server-driven config: which facility types are
 * enabled per country. Data-driven from `country_facility_type_whitelist`,
 * so enabling a facility type in a new country needs no backend deploy and
 * no client release. Countries with no whitelist entry are omitted.
 */
@Public()
@ApiTags('Countries V2')
@Controller('api/v2/countries')
export class CountryV2Controller {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({
    summary: 'Countries with their supported facility types',
  })
  @ApiResponse({ status: 200, type: CountryFacilityTypesDto, isArray: true })
  async getCountries(): Promise<CountryFacilityTypesDto[]> {
    const entries = await this.prisma.country_facility_type_whitelist.findMany({
      include: { country: true, facility_type: true },
      orderBy: { country_code: 'asc' },
    });

    const byCountry = new Map<string, CountryFacilityTypesDto>();
    for (const entry of entries) {
      let row = byCountry.get(entry.country_code);
      if (!row) {
        row = {
          country_code: entry.country_code,
          name: entry.country.name,
          supported_facility_types: [],
        };
        byCountry.set(entry.country_code, row);
      }
      row.supported_facility_types.push(entry.facility_type.code);
    }
    return Array.from(byCountry.values());
  }
}
