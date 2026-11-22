/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Counter, register } from 'prom-client';
import { IpInfoRefreshBudget } from './ip-metadata.refresh-budget';

const ipInfoRequests: Counter<'reason' | 'outcome'> =
  (register.getSingleMetric(
    'ip_metadata_ipinfo_requests_total',
  ) as Counter<'reason' | 'outcome'>) ??
  new Counter({
    name: 'ip_metadata_ipinfo_requests_total',
    help: 'Calls to IPInfo by reason (new: IP never seen, refresh: saved record past its age) and outcome (ok, failed)',
    labelNames: ['reason', 'outcome'],
  });

// Stored for our own analysis, never returned to the app.
export interface IpMetadataDetails {
  asn_name?: string | null;
  asn_type?: string | null;
  asn_route?: string | null;
  company_name?: string | null;
  company_type?: string | null;
  is_vpn?: boolean | null;
  is_proxy?: boolean | null;
  is_tor?: boolean | null;
  is_relay?: boolean | null;
  is_hosting?: boolean | null;
  raw?: Prisma.JsonValue | null;
}

const DETAIL_FIELDS: (keyof IpMetadataDetails)[] = [
  'asn_name',
  'asn_type',
  'asn_route',
  'company_name',
  'company_type',
  'is_vpn',
  'is_proxy',
  'is_tor',
  'is_relay',
  'is_hosting',
  'raw',
];

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;
const flagOrNull = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;
const objectOrEmpty = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export interface IpMetadata extends IpMetadataDetails {
  id?: number;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: string;
  error?: string;
  hostname?: string;
  source?: string;
  new?: boolean; // Indicates if this is a new record
  created_at?: Date;
  updated_at?: Date;
  retry_after?: Date | null;
  last_seen_at?: Date | null;
}

// Cached IPInfo records older than this are fetched again.
const DEFAULT_CACHE_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// After a failed refresh, keep serving the cached record this long before trying again.
const REFRESH_RETRY_DELAY_MS = DAY_MS;
// last_seen_at is written at most this often per IP, not on every lookup.
const LAST_SEEN_INTERVAL_MS = DAY_MS;

@Injectable()
export class IpMetadataService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly refreshBudget: IpInfoRefreshBudget,
  ) {}

  private async fetchIpInfoFromAPI(
    ip: string,
    reason: 'new' | 'refresh' = 'new',
  ): Promise<IpMetadata> {
    const ipInfoToken = process.env.IPINFO_TOKEN;
    try {
      let response;
      try {
        response = await firstValueFrom(
          this.httpService.get(
            `https://ipinfo.io/${ip}/json?token=${ipInfoToken}`,
          ),
        );
      } catch (error) {
        ipInfoRequests.inc({ reason, outcome: 'failed' });
        throw error;
      }
      ipInfoRequests.inc({ reason, outcome: 'ok' });
      const { data } = response;
      const { asn, org } = data;

      let asnValue = '';
      if (asn && typeof asn === 'object' && typeof asn.asn === 'string') {
        asnValue = asn.asn;
      } else if (typeof asn === 'string') {
        asnValue = asn;
      } else if (typeof org === 'string') {
        const match = org.match(/AS\d+/);
        asnValue = match ? match[0] : '';
      }

      // On plans that return them: ISP, company and privacy (VPN, proxy, ...) details.
      const asnDetails = objectOrEmpty(asn);
      const company = objectOrEmpty(data.company);
      const privacy = objectOrEmpty(data.privacy);

      return {
        ...data,
        asn: asnValue,
        asn_name: textOrNull(asnDetails.name),
        asn_type: textOrNull(asnDetails.type),
        asn_route: textOrNull(asnDetails.route),
        company_name: textOrNull(company.name),
        company_type: textOrNull(company.type),
        is_vpn: flagOrNull(privacy.vpn),
        is_proxy: flagOrNull(privacy.proxy),
        is_tor: flagOrNull(privacy.tor),
        is_relay: flagOrNull(privacy.relay),
        is_hosting: flagOrNull(privacy.hosting),
        raw: data,
        source: 'ipinfo',
        new: true, // Indicating this is a new record
      };
    } catch (error) {
      console.error('IPInfo API failed, attempting fallback...');
      console.error('Error details:', error);
      try {
        const fallbackResponse = await this.fetchIpInfoFromFallbackAPI(ip);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error('Fallback API failed:', fallbackError);
        return {
          ip: '',
          city: '',
          region: '',
          country: '',
          loc: '',
          org: '',
          postal: '',
          timezone: '',
          asn: '',
          hostname: '',
          error: 'Unable to fetch IP information from both APIs',
        };
      }
    }
  }

  private async fetchIpInfoFromFallbackAPI(ip: string): Promise<IpMetadata> {
    const ipGeo = await this.prisma.ipMetadata.findUnique({
      where: { ip_source: { ip, source: 'geojs' } },
    });
    if (ipGeo) {
      return ipGeo;
    }

    const response = await firstValueFrom(
      this.httpService.get(`https://ipv4.geojs.io/v1/ip/geo/${ip}.json`),
    );
    return {
      ip: response?.data?.ip ?? '',
      city: response?.data?.city ?? '',
      region: response?.data?.region ?? '',
      country: response?.data?.country_code ?? '',
      loc:
        response?.data?.latitude && response?.data?.longitude
          ? `${response?.data.latitude},${response?.data.longitude}`
          : '',
      postal: response?.data?.area_code ?? '',
      timezone: response?.data?.timezone ?? '',
      hostname: '',
      org:
        typeof response?.data?.organization === 'string'
          ? response.data.organization.match(/^AS\d+\s+(.+)$/)?.[1] ?? ''
          : '',
      asn:
        typeof response?.data?.organization === 'string'
          ? response.data.organization.match(/^(AS\d+)/)?.[1] ?? ''
          : '',
      raw: response?.data ?? null,
      source: 'geojs',
      new: true, // Indicating this is a new record
    };
  }

  private isStale(record: IpMetadata): boolean {
    if (record.retry_after && record.retry_after.getTime() > Date.now()) {
      return false;
    }
    const maxAgeDays =
      Number(process.env.IPINFO_CACHE_MAX_AGE_DAYS) || DEFAULT_CACHE_MAX_AGE_DAYS;
    return Date.now() - record.updated_at.getTime() > maxAgeDays * DAY_MS;
  }

  // Keep the response shape the clients already know: no source, no timestamps,
  // none of the stored details.
  private toResponse(record: IpMetadata): IpMetadata {
    const response = { ...record };
    delete response.source;
    delete response.created_at;
    delete response.updated_at;
    delete response.retry_after;
    delete response.last_seen_at;
    for (const field of DETAIL_FIELDS) {
      delete response[field];
    }
    return response;
  }

  /**
   * Records that a saved IP was looked up, at most once a day per IP, so we can
   * tell which IPs are still in use without a write on every lookup. A failure
   * here never fails the lookup.
   */
  private async markSeen(record: IpMetadata): Promise<void> {
    if (record.id == null) {
      return;
    }
    const lastSeen = record.last_seen_at?.getTime() ?? 0;
    if (Date.now() - lastSeen < LAST_SEEN_INTERVAL_MS) {
      return;
    }
    try {
      await this.prisma.ipMetadata.update({
        where: { id: record.id },
        data: { last_seen_at: new Date() },
      });
    } catch (error) {
      console.warn(
        'Could not record when an IP was last seen:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async getIpInfo(ip: string): Promise<IpMetadata> {
    console.log('IP Address:', ip);
    const cached = await this.prisma.ipMetadata.findUnique({
      where: { ip_source: { ip, source: 'ipinfo' } },
    });
    if (cached && !this.isStale(cached)) {
      await this.markSeen(cached);
      return this.toResponse(cached);
    }

    // A saved record past its age is refreshed only while this hour's budget
    // lasts, so refreshes are spread out instead of using up the IPInfo quota.
    // Otherwise it is served as it is and refreshed on a later lookup.
    if (cached && !(await this.refreshBudget.tryTake())) {
      await this.markSeen(cached);
      return this.toResponse(cached);
    }

    const ipData = await this.fetchIpInfoFromAPI(ip, cached ? 'refresh' : 'new');
    console.log('IP Data:', ipData);

    // IPInfo could not be reached: a stale IPInfo record beats GeoJS or an error.
    // Hold off the next attempt so an outage doesn't cost two upstream calls per request.
    if (cached && ipData.source !== 'ipinfo') {
      await this.prisma.ipMetadata.update({
        where: { ip_source: { ip, source: 'ipinfo' } },
        data: {
          retry_after: new Date(Date.now() + REFRESH_RETRY_DELAY_MS),
          last_seen_at: new Date(),
        },
      });
      return this.toResponse(cached);
    }
    if (!ipData.new) {
      // A saved GeoJS record (or the error answer, which has no id).
      await this.markSeen(ipData);
      return this.toResponse(ipData);
    }

    const data = {
      ip: ipData.ip,
      city: ipData.city,
      region: ipData.region,
      country: ipData.country,
      loc: ipData.loc,
      org: ipData.org,
      postal: ipData.postal,
      timezone: ipData.timezone,
      asn: ipData.asn,
      hostname: ipData.hostname,
      source: ipData.source,
      asn_name: ipData.asn_name ?? null,
      asn_type: ipData.asn_type ?? null,
      asn_route: ipData.asn_route ?? null,
      company_name: ipData.company_name ?? null,
      company_type: ipData.company_type ?? null,
      is_vpn: ipData.is_vpn ?? null,
      is_proxy: ipData.is_proxy ?? null,
      is_tor: ipData.is_tor ?? null,
      is_relay: ipData.is_relay ?? null,
      is_hosting: ipData.is_hosting ?? null,
      raw:
        ipData.raw == null
          ? Prisma.DbNull
          : (ipData.raw as Prisma.InputJsonValue),
      updated_at: new Date(),
      retry_after: null,
      last_seen_at: new Date(),
    };
    const saved = await this.prisma.ipMetadata.upsert({
      where: { ip_source: { ip: ipData.ip, source: ipData.source } },
      create: data,
      update: data,
    });
    return this.toResponse(saved);
  }
}
