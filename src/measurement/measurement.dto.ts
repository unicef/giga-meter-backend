import { ApiProperty } from '@nestjs/swagger';

export class ClientInfoDto {
  @ApiProperty()
  IP?: string;

  @ApiProperty()
  ASN?: string;

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
  Results?: ResultsDto;

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
}

export class MeasurementV2Dto {
  @ApiProperty()
  Timestamp?: Date;

  @ApiProperty()
  BrowserID?: string;

  @ApiProperty()
  Download?: number;

  @ApiProperty()
  Upload?: number;

  @ApiProperty()
  Latency?: number;

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
}

export class MeasurementFailedDto extends MeasurementDto {
  @ApiProperty()
  reason?: string;
}
