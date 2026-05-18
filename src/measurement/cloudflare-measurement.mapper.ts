import {
  AddMeasurementDto,
  ClientInfoDto,
  ServerInfoDto,
} from './measurement.dto';
import {
  CloudflareAccessInformationDto,
  CloudflareMeasurementDto,
  CloudflareMeasurementResultsDto,
  CloudflareServerInformationDto,
} from './cloudflare-measurement.dto';

function parseLatitudeLongitude(loc?: string): {
  latitude?: number;
  longitude?: number;
} {
  if (!loc) {
    return {};
  }

  const coords = loc.split(',');
  if (coords.length !== 2) {
    return {};
  }

  const latitude = Number.parseFloat(coords[0]);
  const longitude = Number.parseFloat(coords[1]);

  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

function mapClientInfo(
  accessInformation?: CloudflareAccessInformationDto,
): ClientInfoDto {
  const { latitude, longitude } = parseLatitudeLongitude(accessInformation?.loc);

  return {
    IP: accessInformation?.ip,
    ASN: accessInformation?.asn,
    ISP: accessInformation?.org,
    Hostname: accessInformation?.hostname,
    City: accessInformation?.city,
    Postal: accessInformation?.postal,
    Region: accessInformation?.region,
    Country: accessInformation?.country,
    Latitude: latitude,
    Longitude: longitude,
    Timezone: accessInformation?.timezone,
  };
}

function mapServerInfo(
  serverInformation?: CloudflareServerInformationDto,
): ServerInfoDto {
  return {
    City: serverInformation?.city,
    Country: serverInformation?.country,
    Label: serverInformation?.label,
    Metro: serverInformation?.metro,
    Site: serverInformation?.site,
  };
}

function resolveDownloadUpload(results?: CloudflareMeasurementResultsDto): {
  download?: number;
  upload?: number;
} {
  return {
    download:
      results?.summary?.download ?? results?.bandwidth?.download ?? undefined,
    upload: results?.summary?.upload ?? results?.bandwidth?.upload ?? undefined,
  };
}

function resolveLatency(results?: CloudflareMeasurementResultsDto): number | undefined {
  const latency =
    results?.summary?.latency ?? results?.unloadedLatency?.latency ?? undefined;

  if (typeof latency !== 'number' || Number.isNaN(latency)) {
    return undefined;
  }

  return Math.round(latency);
}

export function mapCloudflareMeasurementToAddDto(
  dto: CloudflareMeasurementDto,
): AddMeasurementDto {
  const { download, upload } = resolveDownloadUpload(dto.results);
  const latency = resolveLatency(dto.results);
  const clientInfo = mapClientInfo(dto.accessInformation);
  const timestamp = new Date(dto.timestamp);

  return {
    UUID: dto.uuid,
    BrowserID: dto.browserID,
    school_id: dto.schoolID,
    giga_id_school: dto.gigaIDSchool,
    ip_address: dto.ipAddress ?? dto.accessInformation?.ip,
    country_code: dto.countryCode ?? dto.accessInformation?.country,
    DeviceType: dto.deviceType,
    Notes: dto.notes,
    app_version: dto.appVersion,
    Timestamp: Number.isNaN(timestamp.getTime()) ? undefined : timestamp,
    Download: download,
    Upload: upload,
    Latency: latency,
    DataDownloaded: dto.dataUsage?.download,
    DataUploaded: dto.dataUsage?.upload,
    DataUsage: dto.dataUsage?.total,
    ClientInfo: clientInfo,
    ServerInfo: mapServerInfo(dto.serverInformation),
    Results: dto.results as AddMeasurementDto['Results'],
  };
}
