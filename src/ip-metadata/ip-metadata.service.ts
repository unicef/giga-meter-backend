/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface IpMetadata {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
  asn: string;
  error?: string;
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
      console.log('Fetching IP info from IPInfo API...');
      const response = await firstValueFrom(
        this.httpService.get(
          `https://ipinfo.io/${ip}/json?token=${ipInfoToken}`,
        ),
      );
      return {
        ...response.data,
        asn:
          response.data?.asn?.asn ??
          response.data?.org?.match(/AS[0-9]+/)?.[0] ??
          '',
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
          error: 'Unable to fetch IP information from both APIs',
        }
      }
    }
  }

  private async fetchIpInfoFromFallbackAPI(ip: string): Promise<any> {
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
      org: response?.data?.organization_name ?? '',
      postal: response?.data?.area_code ?? '',
      timezone: response?.data?.timezone ?? '',
      
    };
  }

  async getIpInfo(ip: string): Promise<any> {
    console.log('IP Address:', ip);
    let ipInfo = await this.prisma.ipMetadata.findUnique({
      where: { ip },
    });

    if (!ipInfo) {
      const ipData = await this.fetchIpInfoFromAPI(ip);
      console.log('IP Data:', ipData);
      if (ipData) {
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
          },
        });
      }
    }
    console.log('IP Info:', ipInfo);
    return ipInfo;
  }
}
