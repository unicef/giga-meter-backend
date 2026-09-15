import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/public.decorator';

@ApiTags('geolocation')
@Controller('api/v1/geolocation')
export class GeolocationController {
  private readonly googleApiUrl = 'https://www.googleapis.com/geolocation/v1/geolocate';

  constructor(private readonly httpService: HttpService) {}

  @Public()
  @Post('geolocate')
  @ApiOperation({ summary: 'Proxy for Google Geolocation API' })
  @ApiResponse({ status: 200, description: 'Location data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 504, description: 'Google did not answer in time' })
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

      // No answer from Google within the HttpModule timeout. Report it as a
      // gateway timeout so the client can tell it apart from a server error.
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Geolocation provider timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      throw new HttpException(
        'Failed to fetch geolocation data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
