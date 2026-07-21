import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from './auth.guard';
import { DeviceTokenService } from './device-token.service';
import { NonceService } from './nonce.service';
import { HmacSignatureService } from './hmac-signature.service';
import { CategoryConfigModule } from '../category-config/category-config.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Global()
@Module({
  imports: [HttpModule, CategoryConfigModule],
  providers: [
    AuthGuard,
    PrismaService,
    CategoryConfigModule,
    DeviceTokenService,
    NonceService,
    HmacSignatureService,
  ],
  exports: [
    AuthGuard,
    HttpModule,
    DeviceTokenService,
    NonceService,
    HmacSignatureService,
  ],
})
export class AuthModule {}
