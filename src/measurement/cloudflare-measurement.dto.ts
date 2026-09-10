import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloudflareDataUsageDto {
  @ApiPropertyOptional()
  download?: number;

  @ApiPropertyOptional()
  upload?: number;

  @ApiPropertyOptional()
  total?: number;
}

export class CloudflareAccessInformationDto {
  @ApiPropertyOptional()
  ip?: string;

  @ApiPropertyOptional()
  hostname?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  loc?: string;

  @ApiPropertyOptional()
  org?: string;

  @ApiPropertyOptional()
  postal?: string;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  asn?: string;
}

export class CloudflareServerInformationDto {
  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  site?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional()
  metro?: string;
}

export class CloudflareMeasurementSummaryDto {
  @ApiPropertyOptional()
  download?: number;

  @ApiPropertyOptional()
  upload?: number;

  @ApiPropertyOptional()
  latency?: number;

  @ApiPropertyOptional()
  jitter?: number;

  @ApiPropertyOptional()
  downLoadedLatency?: number;

  @ApiPropertyOptional()
  downLoadedJitter?: number;

  @ApiPropertyOptional()
  upLoadedLatency?: number;

  @ApiPropertyOptional()
  upLoadedJitter?: number;
}

export class CloudflareLatencySeriesDto {
  @ApiPropertyOptional()
  latency?: number;

  @ApiPropertyOptional()
  jitter?: number;

  @ApiPropertyOptional({ type: [Number] })
  latencyPoints?: number[];
}

export class CloudflareBandwidthDto {
  @ApiPropertyOptional()
  download?: number;

  @ApiPropertyOptional()
  upload?: number;
}

export class CloudflarePacketLossDetailsDto {
  @ApiPropertyOptional()
  error?: string;
}

export class CloudflarePacketLossDto {
  @ApiPropertyOptional({ type: CloudflarePacketLossDetailsDto })
  details?: CloudflarePacketLossDetailsDto;
}

export class CloudflareScoreEntryDto {
  @ApiPropertyOptional()
  points?: number;

  @ApiPropertyOptional()
  classificationIdx?: number;

  @ApiPropertyOptional()
  classificationName?: string;
}

export class CloudflareScoresDto {
  @ApiPropertyOptional({ type: CloudflareScoreEntryDto })
  streaming?: CloudflareScoreEntryDto;

  @ApiPropertyOptional({ type: CloudflareScoreEntryDto })
  gaming?: CloudflareScoreEntryDto;

  @ApiPropertyOptional({ type: CloudflareScoreEntryDto })
  rtc?: CloudflareScoreEntryDto;
}

export class CloudflareMeasurementResultsDto {
  @ApiPropertyOptional()
  isFinished?: boolean;

  @ApiPropertyOptional({ type: CloudflareMeasurementSummaryDto })
  summary?: CloudflareMeasurementSummaryDto;

  @ApiPropertyOptional({ type: CloudflareLatencySeriesDto })
  unloadedLatency?: CloudflareLatencySeriesDto;

  @ApiPropertyOptional({ type: CloudflareLatencySeriesDto })
  downloadedLatency?: CloudflareLatencySeriesDto;

  @ApiPropertyOptional({ type: CloudflareLatencySeriesDto })
  uploadedLatency?: CloudflareLatencySeriesDto;

  @ApiPropertyOptional({ type: CloudflareBandwidthDto })
  bandwidth?: CloudflareBandwidthDto;

  @ApiPropertyOptional({ type: CloudflarePacketLossDto })
  packetLoss?: CloudflarePacketLossDto;

  @ApiPropertyOptional({ type: CloudflareScoresDto })
  scores?: CloudflareScoresDto;
}

export class CloudflareMeasurementDto {
  @ApiProperty()
  uuid: string;

  @ApiPropertyOptional()
  version?: string | number;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  timestamp: number;

  @ApiPropertyOptional()
  appVersion?: string;

  @ApiPropertyOptional({ type: CloudflareDataUsageDto })
  dataUsage?: CloudflareDataUsageDto;

  @ApiPropertyOptional({ type: CloudflareAccessInformationDto })
  accessInformation?: CloudflareAccessInformationDto;

  @ApiPropertyOptional({ type: CloudflareServerInformationDto })
  serverInformation?: CloudflareServerInformationDto;

  @ApiPropertyOptional({ type: CloudflareMeasurementResultsDto })
  results?: CloudflareMeasurementResultsDto;

  @ApiPropertyOptional()
  browserID?: string;

  @ApiPropertyOptional()
  deviceType?: string;

  @ApiProperty()
  schoolID: string;

  @ApiPropertyOptional()
  gigaIDSchool?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  countryCode?: string;
}
