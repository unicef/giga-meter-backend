import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from 'src/common/public.decorator';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { GeocodeQueryDto, GeolocateBodyDto } from './geolocation.dto';
import { GeolocationCircuit } from './geolocation.circuit';

/** Same options the geocode endpoints already validated their query with. */
const VALIDATION_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};

@ApiTags('geolocation')
@Controller('api/v1/geolocation')
@UseGuards(ThrottlerGuard)
export class GeolocationController {
  private readonly logger = new Logger(GeolocationController.name);
  private readonly googleApiUrl = 'https://www.googleapis.com/geolocation/v1/geolocate';
  private readonly googleGeocodeApiUrl =
    'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(
    private readonly httpService: HttpService,
    private readonly circuit: GeolocationCircuit,
  ) {}

  @Public()
  @Throttle(getRateLimitConfig('geolocation'))
  @Post('geolocate')
  @UsePipes(new ValidationPipe(VALIDATION_OPTIONS))
  @ApiOperation({ summary: 'Proxy for Google Geolocation API' })
  @ApiResponse({ status: 200, description: 'Location data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 422,
    description: 'The access points given do not resolve to a location',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 502, description: 'The provider rejected the call or failed' })
  @ApiResponse({ status: 503, description: 'The provider is rate limiting or unreachable' })
  @ApiResponse({ status: 504, description: 'The provider did not answer in time' })
  async geolocate(@Body() payload: GeolocateBodyDto) {
    const apiKey = this.requireApiKey();
    return this.callUpstream('geolocate', () =>
      this.httpService.post(`${this.googleApiUrl}?key=${apiKey}`, payload),
    );
  }

  @Public()
  @Throttle(getRateLimitConfig('geolocation'))
  @Get('geocode')
  @UsePipes(new ValidationPipe(VALIDATION_OPTIONS))
  @ApiOperation({ summary: 'Proxy for Google Geocoding API' })
  @ApiResponse({ status: 200, description: 'Geocode data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 422,
    description: 'The address or coordinates given do not resolve',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 502, description: 'The provider rejected the call or failed' })
  @ApiResponse({ status: 503, description: 'The provider is rate limiting or unreachable' })
  @ApiResponse({ status: 504, description: 'The provider did not answer in time' })
  async geocode(@Query() query: GeocodeQueryDto) {
    return this.fetchGeocodeData(query);
  }

  @Public()
  @Throttle(getRateLimitConfig('geolocation'))
  @Get('geocode/flexible')
  @UsePipes(new ValidationPipe(VALIDATION_OPTIONS))
  @ApiOperation({ summary: 'Proxy for a normalized Google Geocoding response' })
  @ApiResponse({
    status: 200,
    description: 'Flexible address data retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 422,
    description: 'The address or coordinates given do not resolve',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiResponse({ status: 502, description: 'The provider rejected the call or failed' })
  @ApiResponse({ status: 503, description: 'The provider is rate limiting or unreachable' })
  @ApiResponse({ status: 504, description: 'The provider did not answer in time' })
  async geocodeFlexible(@Query() query: GeocodeQueryDto) {
    const geocodeResponse = await this.fetchGeocodeData(query);
    return this.toFlexibleAddressResponse(geocodeResponse);
  }

  private requireApiKey(): string {
    const apiKey = process.env.GOOGLE_GEOLOCATION_API_KEY;

    if (!apiKey) {
      // A deployment problem, not a caller problem: say so in the logs, because
      // the response body deliberately does not.
      this.logger.error('GOOGLE_GEOLOCATION_API_KEY is not configured');
      throw new HttpException(
        'Geolocation provider not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return apiKey;
  }

  private async fetchGeocodeData(query: GeocodeQueryDto) {
    const apiKey = this.requireApiKey();

    return this.callUpstream('geocode', () =>
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
  }

  /**
   * Runs one call to Google behind the circuit breaker and turns anything that
   * goes wrong into a status of ours.
   *
   * Both proxied endpoints go through here: they used to carry two copies of
   * the same error handling, and the copies had drifted apart.
   */
  private async callUpstream<T>(
    operation: string,
    call: () => import('rxjs').Observable<{ data: T }>,
  ): Promise<T> {
    if (this.circuit.isOpen()) {
      const retryAfterSeconds = Math.ceil(this.circuit.retryAfterMs() / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Geolocation provider is unavailable',
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const startedAt = Date.now();
    try {
      const response = await firstValueFrom(call());
      this.circuit.recordSuccess();
      return response.data;
    } catch (error) {
      throw this.handleUpstreamError(operation, error, Date.now() - startedAt);
    }
  }

  /**
   * Maps an upstream failure to a status of ours.
   *
   * The provider's own status and body used to be forwarded verbatim. That made
   * its 403 (restricted key, quota exhausted) indistinguishable from "your token
   * is not valid" once these endpoints require auth, and its 404 ("no result for
   * these access points") indistinguishable from "no such route". The detail
   * stays in the logs; the caller gets a small, stable set of statuses.
   */
  private handleUpstreamError(
    operation: string,
    error: any,
    elapsedMs: number,
  ): HttpException {
    // Ours already (a missing API key, or the open circuit): keep it as it is.
    if (error instanceof HttpException) {
      return error;
    }

    const upstreamStatus: number | undefined = error?.response?.status;

    if (upstreamStatus !== undefined) {
      this.logger.error(
        `${operation}: provider answered ${upstreamStatus} in ${elapsedMs} ms`,
      );

      // The provider answered, so it is alive: this says nothing about whether
      // the next call will work, and must not open the circuit.
      if (upstreamStatus === HttpStatus.NOT_FOUND) {
        return new HttpException(
          'No location matches the data provided',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (upstreamStatus === HttpStatus.TOO_MANY_REQUESTS) {
        return new HttpException(
          'Geolocation provider is rate limiting this deployment',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (upstreamStatus >= 500) {
        this.circuit.recordFailure();
        return new HttpException(
          'Geolocation provider failed',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // 400 (a payload it rejected) and 403 (key restricted, quota, billing) are
      // both our side of the contract with the provider, never the caller's.
      return new HttpException(
        'Geolocation provider rejected the request',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.circuit.recordFailure();
    const code: string | undefined = error?.code;

    // No answer within the module's timeout.
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      this.logger.error(`${operation}: provider timed out after ${elapsedMs} ms`);
      return new HttpException(
        'Geolocation provider timed out',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    // Never reached the provider: DNS, refused connection, reset, TLS.
    if (code) {
      this.logger.error(
        `${operation}: could not reach the provider (${code}) after ${elapsedMs} ms`,
      );
      return new HttpException(
        'Geolocation provider is unreachable',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.error(
      `${operation}: unexpected failure after ${elapsedMs} ms: ${error?.message}`,
    );
    return new HttpException(
      'Failed to fetch geolocation data',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
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
}
