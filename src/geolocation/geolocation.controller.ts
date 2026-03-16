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
            ...query,
            key: apiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
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
}
