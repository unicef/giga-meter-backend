import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { IpMetadataService } from './ip-metadata.service';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/v1/ip-metadata')
export class IpMetadataController {
  constructor(private readonly ipMetadataService: IpMetadataService) {}
  @UseGuards(AuthGuard)
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
    // Get IP from appropriate source
    let ip =
      request.ip === '::1' ? request.headers['x-forwarded-for'] : request.ip;

    // Handle array format
    if (Array.isArray(ip)) {
      ip = ip[0];
    } else if (typeof ip === 'string') {
      // Extract first IP and remove IPv6 part if present
      ip = ip.split(',')[0].trim().split(':')[0];
    } else {
      return { error: 'Invalid IP address format' };
    }
    return this.ipMetadataService.getIpInfo(ip);
  }
}
