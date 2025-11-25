/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface IpMetadata {
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
}

@Injectable()
export class IpMetadataService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private async fetchIpInfoFromAPI(ip: string): Promise<IpMetadata> {
    const ipInfoToken = process.env.IPINFO_TOKEN;
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://ipinfo.io/${ip}/json?token=${ipInfoToken}`,
        ),
      );
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

      return {
        ...data,
        asn: asnValue,
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
      source: 'geojs',
      new: true, // Indicating this is a new record
    };
  }

  async getIpInfo(ip: string): Promise<IpMetadata> {
    console.log('IP Address:', ip);
    let ipInfo:IpMetadata = await this.prisma.ipMetadata.findUnique({
      where: { ip_source: { ip, source: 'ipinfo' } },
    });

    if (!ipInfo) {
      const ipData = await this.fetchIpInfoFromAPI(ip);
      console.log('IP Data:', ipData);
      if (ipData && ipData.new) {
        ipInfo = await this.prisma.ipMetadata.create({
          data: {
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
          },
        });
      }else
        ipInfo = ipData;
    }
    if (ipInfo.source) delete ipInfo.source;
    
    return ipInfo;
  }
}
