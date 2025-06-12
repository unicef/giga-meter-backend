import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { IpMetadataService } from './ip-metadata.service';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/v1/ip-metadata')
export class IpMetadataController {
  constructor(private readonly ipMetadataService: IpMetadataService) {}
  @Get('debug-ip')
  getDebugIp(@Req() req: Request) {
    return {
      ip: req.ip,
      ips: req.ips,
      xForwardedFor: req.headers['x-forwarded-for'],
    };
  }
  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getIpInfo(@Req() request: Request) {
    let ip =
      request.ip === '::1' ? request.headers['x-forwarded-for'] : request.ip;
    if (!ip) {
      ip = request.ip;
    }
    if (typeof ip === 'string') {
      ip = ip.split(',')[0];
    } else if (Array.isArray(ip) && ip.length > 0) {
      ip = ip[0];
    } else {
      return { error: 'Invalid IP address format' };
    }
    return this.ipMetadataService.getIpInfo(ip);
  }
}
