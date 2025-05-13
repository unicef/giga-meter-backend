import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { IpMetadataService } from './ip-metadata.service';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/v1/ip-metadata')
export class IpMetadataController {
  constructor(private readonly ipMetadataService: IpMetadataService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getIpInfo(@Req() request: Request) {
    let ip =
      request.ip === '::1' ? request.headers['x-forwarded-for'] : request.ip;
    if (ip === 'unknown') {
      return { error: 'IP address could not be determined' };
    }
    ip = typeof ip === 'string' ? ip.split(',')[0] : ip[0];
    return this.ipMetadataService.getIpInfo(ip);
  }
}
