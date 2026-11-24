import { ApiProperty } from '@nestjs/swagger';

/**
 * What the Giga Meter app needs for M-Lab's priority server lookup. Both
 * fields null means the app uses M-Lab's public lookup, as it always has.
 */
export class LocateTokenDto {
  @ApiProperty({
    nullable: true,
    description:
      "Short-lived JWT for M-Lab's priority lookup, sent by the app as `Authorization: Bearer`. Expires 20 seconds after it is issued.",
  })
  token: string | null;

  @ApiProperty({
    nullable: true,
    description:
      "Lookup the app calls instead of M-Lab's default priority endpoint (https only). Null for the default.",
  })
  locate_url: string | null;
}
