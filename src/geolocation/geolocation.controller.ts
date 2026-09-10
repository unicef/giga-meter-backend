import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/public.decorator';
import { GeocodeQueryDto } from './geolocation.dto';

@ApiTags('geolocation')
@Controller('api/v1/geolocation')
export class GeolocationController {
  private readonly googleApiUrl = 'https://www.googleapis.com/geolocation/v1/geolocate';
  private readonly googleGeocodeApiUrl =
    'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(private readonly httpService: HttpService) {}

  @Public()
  @Post('geolocate')
  @ApiOperation({ summary: 'Proxy for Google Geolocation API' })
  @ApiResponse({ status: 200, description: 'Location data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async geolocate(@Body() payload: any) {
    try {
      const apiKey = process.env.GOOGLE_GEOLOCATION_API_KEY;
      
      if (!apiKey) {
        throw new HttpException(
          'Google Geolocation API key not configured',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.googleApiUrl}?key=${apiKey}`, payload)
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        // Forward the exact error from Google API
        throw new HttpException(
          error.response.data,
          error.response.status
        );
      }
      
      throw new HttpException(
        'Failed to fetch geolocation data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get('geocode')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Proxy for Google Geocoding API' })
  @ApiResponse({ status: 200, description: 'Geocode data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async geocode(@Query() query: GeocodeQueryDto) {
    try {
      return await this.fetchGeocodeData(query);
    } catch (error) {
      this.handleGeocodeError(error);
    }
  }

  @Public()
  @Get('geocode/flexible')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Proxy for a normalized Google Geocoding response' })
  @ApiResponse({
    status: 200,
    description: 'Flexible address data retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async geocodeFlexible(@Query() query: GeocodeQueryDto) {
    try {
      const geocodeResponse = await this.fetchGeocodeData(query);
      return this.toFlexibleAddressResponse(geocodeResponse);
    } catch (error) {
      this.handleGeocodeError(error);
    }
  }

  private async fetchGeocodeData(query: GeocodeQueryDto) {
    const apiKey = process.env.GOOGLE_GEOLOCATION_API_KEY;

    if (!apiKey) {
      throw new HttpException(
        'Google Geolocation API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const response = await firstValueFrom(
      this.httpService.get(this.googleGeocodeApiUrl, {
        params: {
          address: query.address,
          latlng:
            query.latitude != null && query.longitude != null
              ? `${query.latitude},${query.longitude}`
              : undefined,
          components: query.components,
          bounds: query.bounds,
          region: query.region,
          language: query.language,
          key: apiKey,
        },
      }),
    );

    return response.data;
  }

  private toFlexibleAddressResponse(geocodeResponse: any) {
    const firstResult = geocodeResponse?.results?.[0];
    const flexibleAddress: Record<string, string> = {
      address: firstResult?.formatted_address ?? '',
      state: '',
      city: '',
      postalCode: '',
    };

    if (!firstResult?.address_components) {
      return flexibleAddress;
    }

    for (const component of firstResult.address_components) {
      const types: string[] = component.types ?? [];
      if (types.includes('administrative_area_level_1')) {
        flexibleAddress.state = component.long_name;
      }
      if (
        types.includes('locality') ||
        types.includes('administrative_area_level_2')
      ) {
        flexibleAddress.city = component.long_name;
      }
      if (types.includes('postal_code')) {
        flexibleAddress.postalCode = component.long_name;
      }
      if (types.includes('country')) {
        flexibleAddress.country = component.long_name;
      }
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        flexibleAddress.subLocality = component.long_name;
      }
    }

    return flexibleAddress;
  }

  private handleGeocodeError(error: any): never {
    if (error.response) {
      throw new HttpException(error.response.data, error.response.status);
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      'Failed to fetch geocode data',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
