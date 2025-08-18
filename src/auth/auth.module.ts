import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { DeviceTokenService } from './device-token.service';
import { NonceService } from './nonce.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AuthGuard, DeviceTokenService, NonceService],
  exports: [AuthGuard, HttpModule, DeviceTokenService, NonceService],
})
export class AuthModule {}
