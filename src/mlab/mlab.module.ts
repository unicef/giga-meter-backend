import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MlabController } from './mlab.controller';
import { MlabTokenService } from './mlab-token.service';

/**
 * Upper bound for the call to M-Lab's token exchange. axios waits forever by
 * default; this keeps the answer well inside the 5 s the Windows app waits for
 * it, so a slow exchange means the public lookup, not a stalled test.
 */
export const MLAB_TOKEN_EXCHANGE_TIMEOUT_MS = 3_000;

@Module({
  imports: [HttpModule.register({ timeout: MLAB_TOKEN_EXCHANGE_TIMEOUT_MS })],
  controllers: [MlabController],
  providers: [MlabTokenService],
})
export class MlabModule {}
