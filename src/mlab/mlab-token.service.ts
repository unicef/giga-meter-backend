import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { LocateTokenDto } from './mlab.dto';

/** M-Lab's production token exchange (project mlab-oti). */
export const DEFAULT_MLAB_TOKEN_EXCHANGE_URL =
  'https://auth.mlab-oti.measurementlab.net/v0/token/integration';

const NO_PRIORITY_LOOKUP: LocateTokenDto = { token: null, locate_url: null };

/**
 * Hands the Giga Meter app what it needs for M-Lab's priority server lookup,
 * which has higher rate limits than the public one. M-Lab registers Giga Meter
 * as a client integration and gives it an API key; the key stays here, and the
 * app only ever gets the short-lived token M-Lab's exchange returns for it.
 *
 * Configured by environment, so it is switched on and off without an app
 * release:
 * - MLAB_API_KEY: the integration key. Unset: the app uses the public lookup.
 * - MLAB_TOKEN_EXCHANGE_URL: defaults to M-Lab's production exchange.
 * - MLAB_LOCATE_URL: optional lookup URL the app calls instead of M-Lab's
 *   default priority endpoint.
 */
@Injectable()
export class MlabTokenService {
  private readonly logger = new Logger(MlabTokenService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * A fresh token, or nulls when the app should use the public lookup. Never
   * throws. Not cached: M-Lab's tokens expire 20 seconds after they are issued.
   */
  async getLocateToken(): Promise<LocateTokenDto> {
    const apiKey = process.env.MLAB_API_KEY?.trim();
    const locateUrl = process.env.MLAB_LOCATE_URL?.trim() || null;
    if (!apiKey) {
      // A lookup URL alone is passed on: it may carry its own key.
      return { token: null, locate_url: locateUrl };
    }

    const exchangeUrl =
      process.env.MLAB_TOKEN_EXCHANGE_URL?.trim() ||
      DEFAULT_MLAB_TOKEN_EXCHANGE_URL;
    try {
      const response = await firstValueFrom(
        this.httpService.post(exchangeUrl, { api_key: apiKey }),
      );
      const token = response.data?.token;
      if (typeof token !== 'string' || !token) {
        throw new Error('no token in the reply');
      }
      return { token, locate_url: locateUrl };
    } catch (error) {
      // Only the status or message: the axios error also carries the request,
      // and with it the API key, so it is not logged or sent to Sentry.
      const status = error?.response?.status;
      this.logger.warn(
        `M-Lab token exchange failed (${status ? `HTTP ${status}` : error?.message}); the app uses the public server lookup`,
      );
      return NO_PRIORITY_LOOKUP;
    }
  }
}
