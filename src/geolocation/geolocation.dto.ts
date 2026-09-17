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
 * A real scan reports a handful of access points; anything beyond this is
 * either a broken client or an attempt to make the upstream do extra work.
 */
export const MAX_WIFI_ACCESS_POINTS = 50;

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
 * accepted, and the access point list is capped.
 */
export class GeolocateBodyDto {
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  considerIp?: boolean;

  @ApiProperty({ type: [WifiAccessPointDto] })
  @IsArray()
  @ArrayMaxSize(MAX_WIFI_ACCESS_POINTS)
  @ValidateNested({ each: true })
  @Type(() => WifiAccessPointDto)
  wifiAccessPoints: WifiAccessPointDto[];
}
