import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CloudflareDataUsageDto {
  @ApiProperty({
    required: false,
    description: 'Bytes downloaded during the measurement',
  })
  @IsOptional()
  @IsNumber()
  download?: number;

  @ApiProperty({
    required: false,
    description: 'Bytes uploaded during the measurement',
  })
  @IsOptional()
  @IsNumber()
  upload?: number;

  @ApiProperty({
    required: false,
    description: 'Total bytes transferred during the measurement',
  })
  @IsOptional()
  @IsNumber()
  total?: number;
}

export class CloudflareResultsSummaryDto {
  @ApiProperty({
    required: false,
    description: 'Measured download bandwidth in bits per second',
  })
  @IsOptional()
  @IsNumber()
  download?: number;

  @ApiProperty({
    required: false,
    description: 'Measured upload bandwidth in bits per second',
  })
  @IsOptional()
  @IsNumber()
  upload?: number;

  @ApiProperty({
    required: false,
    description: 'Measured latency in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  latency?: number;
}

export class CloudflareAccessInformationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  loc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  org?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postal?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  asn?: Record<string, any> | string;
}

export class CloudflareMeasurementDto {
  @ApiProperty({ description: 'Unique identifier for the measurement run' })
  @IsUUID()
  uuid: string;

  @ApiProperty({ description: 'Version of the Cloudflare speed test' })
  @IsString()
  version: string;

  @ApiProperty({
    required: false,
    description: 'Provider responsible for the measurement',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    required: false,
    description: 'Optional notes about the measurement',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Measurement timestamp as Unix epoch in milliseconds',
  })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Application version sending the measurement' })
  @IsString()
  appVersion: string;

  @ApiProperty({
    required: false,
    description: 'Aggregated usage values reported by Cloudflare',
    type: () => CloudflareDataUsageDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CloudflareDataUsageDto)
  dataUsage?: CloudflareDataUsageDto;

  @ApiProperty({
    required: false,
    description: 'Access related metadata reported by Cloudflare',
    type: () => CloudflareAccessInformationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CloudflareAccessInformationDto)
  accessInformation?: CloudflareAccessInformationDto;

  @ApiProperty({
    required: false,
    description: 'Detailed measurement results returned by Cloudflare',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  results?: Record<string, any>;

  @ApiProperty({
    required: false,
    description: 'Identifier of the browser that triggered the measurement',
  })
  @IsOptional()
  @IsString()
  browserID?: string;

  @ApiProperty({
    required: false,
    description: 'Type of device running the measurement',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({
    description: 'School identifier (legacy Daily Check App user id)',
  })
  @IsString()
  schoolID: string;

  @ApiProperty({ required: false, description: 'Giga ID of the school' })
  @IsOptional()
  @IsString()
  gigaIDSchool?: string;

  @ApiProperty({
    required: false,
    description: 'IP address captured during the test',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    required: false,
    description: 'Country code associated with the measurement',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class GeoLocationDto {
  @ApiProperty({
    description: 'Location coordinates with latitude and longitude',
    example: { lat: 28.655616, lng: 77.2079616 },
  })
  location?: { lat: number; lng: number };

  @ApiProperty({
    description: 'Accuracy of the geolocation in meters',
    example: 741820.5619146812,
  })
  accuracy?: number;
}

export class ASNDto {
  @ApiProperty()
  asn?: string;
  @ApiProperty()
  name?: string;
  @ApiProperty()
  type?: string;
  @ApiProperty()
  route?: string;
  @ApiProperty()
  domain?: string;
}
export class ClientInfoDto {
  @ApiProperty()
  IP?: string;

  @ApiProperty()
  ASN?: ASNDto | string;

  @ApiProperty()
  ISP?: string;

  @ApiProperty()
  Hostname?: string;

  @ApiProperty()
  City?: string;

  @ApiProperty()
  Postal?: string;

  @ApiProperty()
  Region?: string;

  @ApiProperty()
  Country?: string;

  @ApiProperty()
  Latitude?: number;

  @ApiProperty()
  Timezone?: string;

  @ApiProperty()
  Longitude?: number;
}

export class ServerInfoDto {
  @ApiProperty()
  URL?: string;

  @ApiProperty()
  City?: string;

  @ApiProperty()
  FQDN?: string;

  @ApiProperty()
  IPv4?: string;

  @ApiProperty()
  IPv6?: string;

  @ApiProperty()
  Site?: string;

  @ApiProperty()
  Label?: string;

  @ApiProperty()
  Metro?: string;

  @ApiProperty()
  Country?: string;
}

export class ResultsDto {
  @ApiProperty()
  CurMSS?: string;

  @ApiProperty()
  CurRTO?: string;

  @ApiProperty()
  MaxRTT?: string;

  @ApiProperty()
  MinRTT?: string;

  @ApiProperty()
  Sndbuf?: string;

  @ApiProperty()
  SumRTT?: string;

  @ApiProperty()
  MaxCwnd?: string;

  @ApiProperty()
  PktsOut?: string;

  @ApiProperty()
  Country?: string;

  @ApiProperty()
  c2sRate?: number;

  @ApiProperty()
  s2cRate?: number;

  @ApiProperty()
  CountRTT?: string;

  @ApiProperty()
  Timeouts?: string;

  @ApiProperty()
  AckPktsIn?: string;

  @ApiProperty()
  DupAcksIn?: string;

  @ApiProperty()
  MaxRwinRcvd?: string;

  @ApiProperty()
  PktsRetrans?: string;

  @ApiProperty()
  RcvWinScale?: string;

  @ApiProperty()
  SndWinScale?: string;

  @ApiProperty()
  DataBytesOut?: string;

  @ApiProperty()
  SndLimTimeCwnd?: string;

  @ApiProperty()
  SndLimTimeRwin?: string;

  @ApiProperty()
  SndLimTimeSender?: string;

  @ApiProperty()
  CongestionSignals?: string;

  @ApiProperty()
  packetRetransmissions?: string;

  @ApiProperty({ name: 'TCPInfo.ATO' })
  TCPInfoATO?: string;

  @ApiProperty({ name: 'TCPInfo.RTO' })
  TCPInfoRTO?: string;

  @ApiProperty({ name: 'TCPInfo.RTT' })
  TCPInfoRTT?: string;

  @ApiProperty({ name: 'TCPInfo.Lost' })
  TCPInfoLost?: string;

  @ApiProperty({ name: 'TCPInfo.PMTU' })
  TCPInfoPMTU?: string;

  @ApiProperty({ name: 'TCPInfo.State' })
  TCPInfoState?: string;

  @ApiProperty({ name: 'TCPInfo.AdvMSS' })
  TCPInfoAdvMSS?: string;

  @ApiProperty({ name: 'TCPInfo.MinRTT' })
  TCPInfoMinRTT?: string;

  @ApiProperty({ name: 'TCPInfo.Probes' })
  TCPInfoProbes?: string;

  @ApiProperty({ name: 'TCPInfo.RTTVar' })
  TCPInfoRTTVar?: string;

  @ApiProperty({ name: 'TCPInfo.RcvMSS' })
  TCPInfoRcvMSS?: string;

  @ApiProperty({ name: 'TCPInfo.RcvRTT' })
  TCPInfoRcvRTT?: string;

  @ApiProperty({ name: 'TCPInfo.Sacked' })
  TCPInfoSacked?: string;

  @ApiProperty({ name: 'TCPInfo.SegsIn' })
  TCPInfoSegsIn?: string;

  @ApiProperty({ name: 'TCPInfo.SndMSS' })
  TCPInfoSndMSS?: string;

  @ApiProperty({ name: 'TCPInfo.SndWnd' })
  TCPInfoSndWnd?: string;

  @ApiProperty({ name: 'TCPInfo.WScale' })
  TCPInfoWScale?: string;

  @ApiProperty({ name: 'TCPInfo.Backoff' })
  TCPInfoBackoff?: string;

  @ApiProperty({ name: 'TCPInfo.CAState' })
  TCPInfoCAState?: string;

  @ApiProperty({ name: 'TCPInfo.Fackets' })
  TCPInfoFackets?: string;

  @ApiProperty({ name: 'TCPInfo.Options' })
  TCPInfoOptions?: string;

  @ApiProperty({ name: 'TCPInfo.Retrans' })
  TCPInfoRetrans?: string;

  @ApiProperty({ name: 'TCPInfo.SegsOut' })
  TCPInfoSegsOut?: string;

  @ApiProperty({ name: 'TCPInfo.SndCwnd' })
  TCPInfoSndCwnd?: string;

  @ApiProperty({ name: 'TCPInfo.Unacked' })
  TCPInfoUnacked?: string;

  @ApiProperty({ name: 'TCPInfo.BusyTime' })
  TCPInfoBusyTime?: string;

  @ApiProperty({ name: 'TCPInfo.RcvSpace' })
  TCPInfoRcvSpace?: string;

  @ApiProperty({ name: 'TCPInfo.BytesSent' })
  TCPInfoBytesSent?: string;

  @ApiProperty({ name: 'TCPInfo.DSackDups' })
  TCPInfoDSackDups?: string;

  @ApiProperty({ name: 'TCPInfo.Delivered' })
  TCPInfoDelivered?: string;

  @ApiProperty({ name: 'TCPInfo.ReordSeen' })
  TCPInfoReordSeen?: string;

  @ApiProperty({ name: 'TCPInfo.AppLimited' })
  TCPInfoAppLimited?: string;

  @ApiProperty({ name: 'TCPInfo.BytesAcked' })
  TCPInfoBytesAcked?: string;

  @ApiProperty({ name: 'TCPInfo.DataSegsIn' })
  TCPInfoDataSegsIn?: string;

  @ApiProperty({ name: 'TCPInfo.PacingRate' })
  TCPInfoPacingRate?: string;

  @ApiProperty({ name: 'TCPInfo.RcvOooPack' })
  TCPInfoRcvOooPack?: string;

  @ApiProperty({ name: 'TCPInfo.Reordering' })
  TCPInfoReordering?: string;

  @ApiProperty({ name: 'TCPInfo.DataSegsOut' })
  TCPInfoDataSegsOut?: string;

  @ApiProperty({ name: 'TCPInfo.DeliveredCE' })
  TCPInfoDeliveredCE?: string;

  @ApiProperty({ name: 'TCPInfo.LastAckRecv' })
  TCPInfoLastAckRecv?: string;

  @ApiProperty({ name: 'TCPInfo.LastAckSent' })
  TCPInfoLastAckSent?: string;

  @ApiProperty({ name: 'TCPInfo.RWndLimited' })
  TCPInfoRWndLimited?: string;

  @ApiProperty({ name: 'TCPInfo.RcvSsThresh' })
  TCPInfoRcvSsThresh?: string;

  @ApiProperty({ name: 'TCPInfo.Retransmits' })
  TCPInfoRetransmits?: string;

  @ApiProperty({ name: 'TCPInfo.SndSsThresh' })
  TCPInfoSndSsThresh?: string;

  @ApiProperty({ name: 'TCPInfo.BytesRetrans' })
  TCPInfoBytesRetrans?: string;

  @ApiProperty({ name: 'TCPInfo.DeliveryRate' })
  TCPInfoDeliveryRate?: string;

  @ApiProperty({ name: 'TCPInfo.LastDataRecv' })
  TCPInfoLastDataRecv?: string;

  @ApiProperty({ name: 'TCPInfo.LastDataSent' })
  TCPInfoLastDataSent?: string;

  @ApiProperty({ name: 'TCPInfo.NotsentBytes' })
  TCPInfoNotsentBytes?: string;

  @ApiProperty({ name: 'TCPInfo.TotalRetrans' })
  TCPInfoTotalRetrans?: string;

  @ApiProperty({ name: 'TCPInfo.BytesReceived' })
  TCPInfoBytesReceived?: string;

  @ApiProperty({ name: 'TCPInfo.MaxPacingRate' })
  TCPInfoMaxPacingRate?: string;

  @ApiProperty({ name: 'TCPInfo.SndBufLimited' })
  TCPInfoSndBufLimiteds?: string;

  @ApiProperty({ name: 'NDTResult.S2C.UUID' })
  NDTResultS2CUUID?: string;

  @ApiProperty({ name: 'NDTResult.S2C.Error' })
  NDTResultS2CError?: string;

  @ApiProperty({ name: 'NDTResult.S2C.MaxRTT' })
  NDTResultS2CMaxRTT?: string;

  @ApiProperty({ name: 'NDTResult.S2C.MinRTT' })
  NDTResultS2CMinRTT?: string;

  @ApiProperty({ name: 'NDTResult.S2C.SumRTT' })
  NDTResultS2CSumRTT?: string;

  @ApiProperty({ name: 'NDTResult.S2C.EndTime' })
  NDTResultS2CEndTime?: string;

  @ApiProperty({ name: 'NDTResult.S2C.ClientIP' })
  NDTResultS2CClientIP?: string;

  @ApiProperty({ name: 'NDTResult.S2C.CountRTT' })
  NDTResultS2CCountRTT?: string;

  @ApiProperty({ name: 'NDTResult.S2C.ServerIP' })
  NDTResultS2CServerIP?: string;

  @ApiProperty({ name: 'NDTResult.S2C.StartTime' })
  NDTResultS2CStartTime?: string;

  @ApiProperty({ name: 'NDTResult.S2C.ClientPort' })
  NDTResultS2CClientPort?: string;

  @ApiProperty({ name: 'NDTResult.S2C.ServerPort' })
  NDTResultS2CServerPort?: string;
}

export class MeasurementDto {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  Timestamp?: Date;

  @ApiProperty()
  UUID?: string;

  @ApiProperty()
  BrowserID?: string;

  @ApiProperty()
  DeviceType?: string;

  @ApiProperty()
  Notes?: string;

  @ApiProperty()
  ClientInfo?: ClientInfoDto;

  @ApiProperty()
  ServerInfo?: ServerInfoDto;

  @ApiProperty()
  annotation?: string;

  @ApiProperty()
  Download?: number;

  @ApiProperty()
  Upload?: number;

  @ApiProperty()
  Latency?: number;

  @ApiProperty()
  DataUploaded?: number;

  @ApiProperty()
  DataDownloaded?: number;

  @ApiProperty()
  DataUsage?: number;

  @ApiProperty()
  Results?: ResultsDto | ResultsNdt7Dto;

  @ApiProperty()
  ndtVersion?: string;

  @ApiProperty()
  giga_id_school?: string;

  @ApiProperty()
  country_code?: string;

  @ApiProperty()
  ip_address?: string;

  @ApiProperty()
  app_version?: string;

  @ApiProperty()
  source?: string;

  @ApiProperty()
  created_at?: Date;

  @ApiProperty({
    description: 'Geolocation data from device',
    type: GeoLocationDto,
  })
  geolocation?: GeoLocationDto;

  @ApiProperty({
    description:
      'Distance between school location and detected location in meters',
  })
  detected_location_distance?: number;

  @ApiProperty({
    description: 'Accuracy of the geolocation in meters',
  })
  detected_location_accuracy?: number;

  @ApiProperty({
    description: 'Flag if distance > X & accuracy > Y',
  })
  detected_location_is_flagged?: boolean;
}

export class MeasurementV2Dto {
  @ApiProperty()
  timestamp?: Date;

  @ApiProperty()
  browserId?: string;

  @ApiProperty()
  download?: number;

  @ApiProperty()
  upload?: number;

  @ApiProperty()
  latency?: number;

  @ApiProperty()
  school_id: string;

  @ApiProperty()
  giga_id_school?: string;

  @ApiProperty()
  country_code?: string;

  @ApiProperty()
  ip_address?: string;

  @ApiProperty()
  app_version?: string;

  @ApiProperty()
  source?: string;

  @ApiProperty()
  created_at?: Date;

  @ApiProperty({
    description: 'Geolocation data from device',
    type: GeoLocationDto,
  })
  geolocation?: GeoLocationDto;

  @ApiProperty({
    description:
      'Distance between school location and detected location in meters',
  })
  detected_location_distance?: number;

  @ApiProperty({
    description: 'Accuracy of the geolocation in meters',
  })
  detected_location_accuracy?: number;

  @ApiProperty({
    description: 'Flag if distance > X & accuracy > Y',
  })
  detected_location_is_flagged?: boolean;
}

export class AddMeasurementDto extends MeasurementDto {
  @ApiProperty()
  school_id: string;
}

export class MeasurementFailedDto extends AddMeasurementDto {
  @ApiProperty()
  reason?: string;
}
class LastClientMeasurementDto {
  @ApiProperty({ description: 'Elapsed time in seconds' })
  ElapsedTime: number;

  @ApiProperty({ description: 'Number of bytes transferred' })
  NumBytes: number;

  @ApiProperty({ description: 'Mean client Mbps' })
  MeanClientMbps: number;
}

class ConnectionInfoDto {
  @ApiProperty({ description: 'Client IP and port' })
  Client: string;

  @ApiProperty({ description: 'Server IP and port' })
  Server: string;

  @ApiProperty({ description: 'UUID of the connection' })
  UUID: string;
}

class BBRInfoDto {
  @ApiProperty({ description: 'Bandwidth in bits per second' })
  BW: number;

  @ApiProperty({ description: 'Minimum RTT in microseconds' })
  MinRTT: number;

  @ApiProperty({ description: 'Pacing gain' })
  PacingGain: number;

  @ApiProperty({ description: 'Congestion window gain' })
  CwndGain: number;

  @ApiProperty({ description: 'Elapsed time in microseconds' })
  ElapsedTime: number;
}

export class TCPInfoDto {
  @ApiProperty({ description: 'TCP state' })
  State: number;

  @ApiProperty({ description: 'Congestion avoidance state' })
  CAState: number;

  @ApiProperty({ description: 'Number of retransmissions' })
  Retransmits: number;

  @ApiProperty({ description: 'Number of probes' })
  Probes: number;

  @ApiProperty({ description: 'Backoff value' })
  Backoff: number;

  @ApiProperty({ description: 'Options' })
  Options: number;

  @ApiProperty({ description: 'Window scale' })
  WScale: number;

  @ApiProperty({ description: 'Whether the application is limited' })
  AppLimited: number;

  @ApiProperty({ description: 'Retransmission timeout in microseconds' })
  RTO: number;

  @ApiProperty({ description: 'Ack timeout in microseconds' })
  ATO: number;

  @ApiProperty({ description: 'Sender MSS (Maximum Segment Size)' })
  SndMSS: number;

  @ApiProperty({ description: 'Receiver MSS (Maximum Segment Size)' })
  RcvMSS: number;

  @ApiProperty({ description: 'Number of unacknowledged packets' })
  Unacked: number;

  @ApiProperty({ description: 'Number of selectively acknowledged packets' })
  Sacked: number;

  @ApiProperty({ description: 'Number of lost packets' })
  Lost: number;

  @ApiProperty({ description: 'Number of retransmitted packets' })
  Retrans: number;

  @ApiProperty({ description: 'Number of forward acknowledgments' })
  Fackets: number;

  @ApiProperty({ description: 'Time since last data was sent' })
  LastDataSent: number;

  @ApiProperty({ description: 'Time since last ACK was sent' })
  LastAckSent: number;

  @ApiProperty({ description: 'Time since last data was received' })
  LastDataRecv: number;

  @ApiProperty({ description: 'Time since last ACK was received' })
  LastAckRecv: number;

  @ApiProperty({ description: 'Path MTU (Maximum Transmission Unit)' })
  PMTU: number;

  @ApiProperty({ description: 'Receiver ssthresh (slow start threshold)' })
  RcvSsThresh: number;

  @ApiProperty({ description: 'Round-trip time in microseconds' })
  RTT: number;

  @ApiProperty({ description: 'Round-trip time variance in microseconds' })
  RTTVar: number;

  @ApiProperty({ description: 'Sender slow start threshold' })
  SndSsThresh: number;

  @ApiProperty({ description: 'Sender congestion window' })
  SndCwnd: number;

  @ApiProperty({ description: 'Advertised MSS' })
  AdvMSS: number;

  @ApiProperty({ description: 'Reordering value' })
  Reordering: number;

  @ApiProperty({ description: 'Receiver round-trip time' })
  RcvRTT: number;

  @ApiProperty({ description: 'Receiver space' })
  RcvSpace: number;

  @ApiProperty({ description: 'Total retransmitted bytes' })
  TotalRetrans: number;

  @ApiProperty({ description: 'Pacing rate' })
  PacingRate: number;

  @ApiProperty({ description: 'Maximum pacing rate' })
  MaxPacingRate: number;

  @ApiProperty({ description: 'Bytes acknowledged' })
  BytesAcked: number;

  @ApiProperty({ description: 'Bytes received' })
  BytesReceived: number;

  @ApiProperty({ description: 'Number of segments sent' })
  SegsOut: number;

  @ApiProperty({ description: 'Number of segments received' })
  SegsIn: number;

  @ApiProperty({ description: 'Not sent bytes' })
  NotsentBytes: number;

  @ApiProperty({ description: 'Minimum RTT in microseconds' })
  MinRTT: number;

  @ApiProperty({ description: 'Number of data segments in' })
  DataSegsIn: number;

  @ApiProperty({ description: 'Number of data segments out' })
  DataSegsOut: number;

  @ApiProperty({ description: 'Delivery rate' })
  DeliveryRate: number;

  @ApiProperty({ description: 'Busy time in microseconds' })
  BusyTime: number;

  @ApiProperty({ description: 'Receive window limited' })
  RWndLimited: number;

  @ApiProperty({ description: 'Send buffer limited' })
  SndBufLimited: number;

  @ApiProperty({ description: 'Number of delivered packets' })
  Delivered: number;

  @ApiProperty({ description: 'Delivered CE (Congestion Experienced)' })
  DeliveredCE: number;

  @ApiProperty({ description: 'Bytes sent' })
  BytesSent: number;

  @ApiProperty({ description: 'Bytes retransmitted' })
  BytesRetrans: number;

  @ApiProperty({ description: 'Number of DSACK (Duplicate SACK)' })
  DSackDups: number;

  @ApiProperty({ description: 'Reordering seen' })
  ReordSeen: number;

  @ApiProperty({ description: 'Out-of-order received packets' })
  RcvOooPack: number;

  @ApiProperty({ description: 'Sender window size' })
  SndWnd: number;

  @ApiProperty({ description: 'Elapsed time in microseconds' })
  ElapsedTime: number;
}

class LastServerMeasurementDto {
  @ApiProperty({ type: ConnectionInfoDto })
  ConnectionInfo: ConnectionInfoDto;

  @ApiProperty({ type: BBRInfoDto })
  BBRInfo: BBRInfoDto;

  @ApiProperty({ type: TCPInfoDto })
  TCPInfo: TCPInfoDto;
}

class NDTResultDto {
  @ApiProperty({ type: LastClientMeasurementDto })
  LastClientMeasurement: LastClientMeasurementDto;

  @ApiProperty({ type: LastServerMeasurementDto })
  LastServerMeasurement: LastServerMeasurementDto;
}

class ResultsNdt7Dto {
  @ApiProperty({ type: NDTResultDto })
  'NDTResult.S2C': NDTResultDto;

  @ApiProperty({ type: NDTResultDto })
  'NDTResult.C2S': NDTResultDto;
}
