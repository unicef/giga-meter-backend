import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * Most access points sent to the provider, and used for the cache key: the
 * strongest ones, which say the most about where the scan was taken. Anything
 * beyond them only makes the upstream do extra work.
 */
export const MAX_WIFI_ACCESS_POINTS = 50;

/**
 * Most access points accepted in one request. A scan in a dense building can
 * list well over 50 networks, and the deployed Windows apps send every one of
 * them, so a request is not rejected for that: it is trimmed to the
 * MAX_WIFI_ACCESS_POINTS strongest. This bound only keeps the endpoint from
 * being fed arbitrarily large lists.
 */
export const MAX_WIFI_ACCESS_POINTS_ACCEPTED = 500;

/** One Wi-Fi access point as the Google Geolocation API expects it. */
export class WifiAccessPointDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  macAddress: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  signalStrength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  signalToNoiseRatio?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  channel?: number;
}

/**
 * Body of the geolocate proxy. It used to be an untyped `any` forwarded to
 * Google as-is, so anything up to the global 2 MB body limit reached the
 * upstream and counted against its quota. Only the fields Google reads are
 * accepted, and the access point list is bounded here and trimmed to the
 * MAX_WIFI_ACCESS_POINTS strongest before the provider sees it.
 */
export class GeolocateBodyDto {
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  considerIp?: boolean;

  @ApiProperty({
    type: [WifiAccessPointDto],
    maxItems: MAX_WIFI_ACCESS_POINTS_ACCEPTED,
    description: `Only the ${MAX_WIFI_ACCESS_POINTS} strongest locatable access points are used.`,
  })
  @IsArray()
  @ArrayMaxSize(MAX_WIFI_ACCESS_POINTS_ACCEPTED)
  @ValidateNested({ each: true })
  @Type(() => WifiAccessPointDto)
  wifiAccessPoints: WifiAccessPointDto[];
}
