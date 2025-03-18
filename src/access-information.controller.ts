import { Controller, Get, Req } from '@nestjs/common';
import { AccessInformationService } from './access-information.service';
import { Request } from 'express';

@Controller('access-information')
export class AccessInformationController {
  constructor(
    private readonly accessInformationService: AccessInformationService,
  ) {}

  @Get()
  async getIpInfo(@Req() request: Request) {
    let ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    if (ip === 'unknown') {
      return { error: 'IP address could not be determined' };
    }
    console.log('IP:', ip);
    ip = typeof ip === 'string' ? ip.split(',')[0] : ip[0];
    return this.accessInformationService.getIpInfo(ip);
  }
}
