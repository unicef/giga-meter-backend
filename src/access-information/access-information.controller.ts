import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AccessInformationService } from './access-information.service';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/v1/access-information')
export class AccessInformationController {
  constructor(
    private readonly accessInformationService: AccessInformationService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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
