import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessInformationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private async fetchIpInfoFromAPI(ip: string): Promise<any> {
    const ipInfoToken = process.env.IPINFO_TOKEN;
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://ipinfo.io/${ip}/json?token=${ipInfoToken}`,
        ),
      );
      return response.data;
    } catch (error) {
      console.error('IPInfo API failed, attempting fallback...');
      try {
        const fallbackResponse = await firstValueFrom(
          this.httpService.get(`https://ipv4.geojs.io/v1/ip/geo/${ip}.json`),
        );
        return {
          ip: fallbackResponse.data.ip,
          city: fallbackResponse.data.city,
          region: fallbackResponse.data.region,
          country: fallbackResponse.data.country_code,
          loc: `${fallbackResponse.data.latitude},${fallbackResponse.data.longitude}`,
          org: fallbackResponse.data.organization_name,
          postal: fallbackResponse.data.area_code,
          timezone: fallbackResponse.data.timezone,
          asn: fallbackResponse.data.asn,
        };
      } catch (fallbackError) {
        console.error('Both IP lookup services failed.', fallbackError);
        return null;
      }
    }
  }

  async getIpInfo(ip: string): Promise<any> {
    let ipInfo = await this.prisma.accessInformation.findUnique({
      where: { ip },
    });

    if (!ipInfo) {
      const ipData = await this.fetchIpInfoFromAPI(ip);
      if (ipData) {
        ipInfo = await this.prisma.accessInformation.create({ data: ipData });
      }
    }
    return ipInfo;
  }
}
