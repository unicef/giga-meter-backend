import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { DeviceTokenService } from './device-token.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AuthGuard, DeviceTokenService],
  exports: [AuthGuard, HttpModule, DeviceTokenService],
})
export class AuthModule {}
