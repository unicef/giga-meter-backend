import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeGigaId, normalizeHealthId } from '../utility/utility';
import { v1SchoolScope } from '../common/facility-scope';
import {
  measurements as Measurement,
  measurements_failed as MeasurementFailed,
} from '@prisma/client';
import {
  AddMeasurementDto,
  AddMeasurementV2Dto,
  AddMeasurementFacilityV2Dto,
  ClientInfoDto,
  MeasurementDto,
  MeasurementEntityV2Dto,
  MeasurementFacilityV2Dto,
  MeasurementFailedDto,
  MeasurementV2Dto,
  ResultsDto,
  ServerInfoDto,
} from './measurement.dto';
import { plainToInstance } from 'class-transformer';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import { sanitizeHardwareId } from '../common/hardware-id.utils';
import {
  sanitizeDeviceContext,
  sanitizeSsidSource,
  sanitizeWifiUnavailableReason,
} from '../common/device-context.utils';
import { enrichMeasurementForPersistence } from './measurement-quality-metrics';
import { FacilityTypeService } from '../facility-type/facility-type.service';
import { RegistrationService } from '../registration/registration.service';
import { HealthService } from '../health/health.service';
import { parseRegistrationId } from '../registration/registration-id';
import { buildMeasurementV2Row } from './measurement-v2.mapper';

@Injectable()
export class MeasurementService {
  SCHOOL_DOESNT_EXIST_ERR = 'PCDC school does not exist';
  WRONG_COUNTRY_CODE_ERR = 'Wrong country code';
  constructor(
    private prisma: PrismaService,
    private geolocationUtility: GeolocationUtility,
    private facilityTypeService: FacilityTypeService,
    private healthService: HealthService,
    private registrationService: RegistrationService,
  ) {}

  async measurements(
    skip?: number,
    take?: number,
    order_by?: string,
    giga_id_school?: string,
    country_iso3_code?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
    isSuperUser?: boolean,
    protocol?: string,
  ): Promise<MeasurementDto[]> {
    const filter = this.applyFilter(
      giga_id_school,
      filter_by,
      filter_condition,
      filter_value,
      write_access,
      countries,
    );

    if (protocol) {
      filter.protocol = protocol;
    }

    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries?.includes(dbCountry.code))
      ) {
        return [];
      }
      filter.country_code = { in: [dbCountry.code] };
    }

    const measurements = this.prisma.measurements.findMany({
      where: filter,
      skip,
      take,
      orderBy: {
        [order_by?.replace('-', '')]: order_by?.includes('-') ? 'desc' : 'asc',
      },
    });
    return (await measurements).map((measurement) =>
      this.toDto(measurement, isSuperUser),
    );
  }

  async measurementsV2(
    skip?: number,
    take?: number,
    order_by?: string,
    giga_id_school?: string,
    country_iso3_code?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
    protocol?: string,
  ): Promise<MeasurementV2Dto[]> {
    const filter = this.applyFilter(
      giga_id_school,
      filter_by,
      filter_condition,
      filter_value,
      write_access,
      countries,
    );

    if (protocol) {
      filter.protocol = protocol;
    }

    if (!giga_id_school) {
      delete filter.giga_id_school;
    }
    if (write_access) {
      delete filter.country_code;
    }
    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries?.includes(dbCountry.code))
      ) {
        return [];
      }
      filter.country_code = { in: [dbCountry.code] };
    }

    const measurements = this.prisma.measurements.findMany({
      where: filter,
      skip,
      take,
      orderBy: {
        [order_by.replace('-', '')]: order_by.includes('-') ? 'desc' : 'asc',
      },
    });
    return (await measurements).map(this.toV2Dto);
  }

  async measurementsFailed(
    skip?: number,
    take?: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementFailedDto[]> {
    const query = {
      skip,
      take,
      where: {
        country_code: { in: countries },
      },
    };

    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements_failed.findMany(query);
    return (await measurements).map(this.toFailedDto);
  }

  async measurementsById(
    id: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementDto[]> {
    const query = {
      where: {
        id,
        country_code: { in: countries },
        AND: [v1SchoolScope()],
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements.findMany(query);
    return (await measurements).map((measurement) =>
      this.toDto(measurement, true),
    );
  }

  async measurementsBySchoolId(
    school_id: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementDto[]> {
    const query = {
      where: {
        school_id,
        country_code: { in: countries },
        AND: [v1SchoolScope()],
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements.findMany(query);
    return (await measurements).map((measurement) =>
      this.toDto(measurement, true),
    );
  }

  async createMeasurement(
    measurementDto: AddMeasurementDto,
    uploadProtocol?: string,
  ): Promise<string> {
    const processedResponse = await this.processMeasurement(measurementDto);

    switch (processedResponse) {
      case this.SCHOOL_DOESNT_EXIST_ERR:
      case this.WRONG_COUNTRY_CODE_ERR: {
        const failedModel = this.toFailedModel(
          measurementDto,
          processedResponse,
        );
        await this.prisma.measurements_failed.create({ data: failedModel });
        return processedResponse;
      }

      default: {
        // Process geolocation data if available
        if (measurementDto.geolocation && 
            measurementDto.geolocation.location &&
            measurementDto.geolocation.accuracy) {
          try {
            // Get the school coordinates based on giga_id_school
            if (measurementDto.giga_id_school) {
              // Use the common utility to calculate distance and set flags
              const geoResult = await this.geolocationUtility.calculateDistanceAndSetFlag(
                measurementDto.giga_id_school,
                measurementDto.geolocation.location,
                measurementDto.geolocation.accuracy
              );
              
              // Store the results in the measurement DTO
              measurementDto.detected_location_accuracy = geoResult.accuracy;
              measurementDto.detected_location_distance = geoResult.distance;
              measurementDto.detected_location_is_flagged = geoResult.isFlagged;
            }
          } catch (error) {
            console.error('Error processing geolocation data:', error);
          }
        }

        enrichMeasurementForPersistence(measurementDto, uploadProtocol);
        const model = this.toModel(measurementDto);
        await this.prisma.measurements.create({
          data: model,
        });
        
        return '';
      }
    }
  }

  async createMultipleMeasurement(
    multipleMeasurementDto: AddMeasurementDto[],
  ): Promise<any[]> {
    const allResponse: any[] = [];
    for (const measurementDto of multipleMeasurementDto) {
      if (measurementDto.Results && measurementDto.app_version) {
        try {
          // Validate app_version format
          const versionParts = measurementDto.app_version.toString().split('.');
          if (
            versionParts.length !== 3 ||
            versionParts.some((part) => !/^\d+$/.test(part))
          ) {
            console.warn(
              `Invalid version format: ${measurementDto.app_version}`,
            );
            return;
          }

          const [major, minor, patch] = versionParts.map(Number);
          const isVersionAbove109 =
            major > 1 ||
            (major === 1 && minor > 0) ||
            (major === 1 && minor === 0 && patch >= 9);

          if (isVersionAbove109) {
            const results = measurementDto.Results;
            const dataDownloaded =
              results['NDTResult.S2C']?.LastServerMeasurement?.TCPInfo
                ?.BytesAcked;
            const dataUploaded =
              results['NDTResult.C2S']?.LastServerMeasurement?.TCPInfo
                ?.BytesReceived;
            // Use strict null check (==) to handle both null and undefined
            // Use nullish coalescing (??) instead of OR (||) to only replace null/undefined with 0
            // This ensures we don't accidentally convert falsy values like 0 to 0
            const dataUsage =
              dataDownloaded == null && dataUploaded == null
                ? null // If both are null/undefined, return null
                : (dataDownloaded ?? 0) + (dataUploaded ?? 0); // Otherwise sum them, replacing null/undefined with 0
            measurementDto.DataDownloaded = dataDownloaded;
            measurementDto.DataUploaded = dataUploaded;
            measurementDto.DataUsage = dataUsage;
            const minRTT =
              results['NDTResult.S2C']?.LastServerMeasurement?.TCPInfo?.MinRTT;
            if (typeof minRTT === 'number' && !isNaN(minRTT)) {
              measurementDto.Latency = Number((minRTT / 1000).toFixed(0));
            } else {
              console.warn('Invalid or missing MinRTT value');
            }
          }
        } catch (error) {
          console.error('Error processing measurement:', error);
        }
      }
      const response = await this.createMeasurement(measurementDto);

      if (response.length) {
        allResponse.push(response);
      }
    }

    return allResponse;
  }

  private async processMeasurement(
    dto: AddMeasurementDto,
  ): Promise<string | null> {
    // Stored giga ids are lowercase. A null/undefined id is passed through
    // unchanged so a measurement submitted without one keeps the previous filter.
    const gigaIdFilter = this.normalizedGigaId(dto.giga_id_school);

    const existingRecord = await this.prisma.dailycheckapp_school.findFirst({
      where: { giga_id_school: gigaIdFilter },
    });

    if (existingRecord == null) {
      return this.SCHOOL_DOESNT_EXIST_ERR;
    }

    const gigaSchoolMapping =
      await this.prisma.giga_id_school_mapping_fix.findFirst({
        where: { giga_id_school_wrong: gigaIdFilter },
      });

    if (gigaSchoolMapping != null) {
      return gigaSchoolMapping.correct_country.toLowerCase() ===
        dto.country_code.toLowerCase()
        ? gigaSchoolMapping.giga_id_school_correct
        : this.WRONG_COUNTRY_CODE_ERR;
    }
    return null;
  }

  /**
   * Returns the value untouched when it is null/undefined so Prisma keeps
   * treating it the same way it did before (undefined drops the filter,
   * null matches NULL rows).
   */
  private normalizedGigaId(
    giga_id_school?: string,
  ): string | null | undefined {
    if (giga_id_school == null) {
      return giga_id_school;
    }
    return normalizeGigaId(giga_id_school);
  }

  // ---------------------------------------------------------------------------
  // V2 entity-aware methods
  // ---------------------------------------------------------------------------

  /**
   * POST /api/v1/measurements/v2
   * Entity-aware measurement submission for health (and school) devices.
   */
  async createMeasurementV2(dto: AddMeasurementV2Dto): Promise<string> {
    // 1. Validate: at least one entity ID must be present
    if (!dto.giga_id_school && !dto.giga_id_health) {
      throw new BadRequestException(
        'At least one of giga_id_school or giga_id_health must be provided',
      );
    }

    // 2. Resolve entity_type_id
    const facilityType = await this.facilityTypeService.getByCode(dto.entity_type);
    if (!facilityType) {
      throw new BadRequestException(
        `Unknown entity_type "${dto.entity_type}"`,
      );
    }

    // 3. If health entity: verify the health facility exists
    if (dto.giga_id_health) {
      const healthFacility = await this.healthService.findActiveById(
        dto.giga_id_health,
      );
      if (!healthFacility) {
        throw new BadRequestException(
          `Health facility "${dto.giga_id_health}" not found`,
        );
      }
    }

    // 4. If registration_id provided: verify it exists and is not blocked
    // Typed as a number, but it arrives as JSON: a string, or '' from clients
    // that have no registration yet.
    const rawRegistrationId: unknown = dto.registration_id;
    let registrationId: bigint | null =
      rawRegistrationId != null && rawRegistrationId !== ''
        ? parseRegistrationId(rawRegistrationId)
        : null;
    if (registrationId != null) {
      const registration = await this.prisma.registration.findFirst({
        where: { id: registrationId },
      });
      if (!registration) {
        throw new BadRequestException(
          `Registration "${dto.registration_id}" not found`,
        );
      }
      if (registration.is_blocked) {
        throw new BadRequestException(
          `Registration "${dto.registration_id}" is blocked`,
        );
      }
    } else {
      // Self-heal for legacy installs that never stored a registration_id
      // (v1 never returned one) and whose reconciliation call failed: resolve
      // it — or lazily create it from a valid giga_id — instead of rejecting.
      // Best-effort — an unresolved registration stays null.
      registrationId = await this.registrationService.resolveForIngest({
        installation_id: dto.installation_id,
        device_hardware_id: dto.device_hardware_id,
        giga_id_school: dto.giga_id_school,
        giga_id_health: dto.giga_id_health,
        browser_id: dto.BrowserID,
        country_code: dto.country_code,
      });
    }

    // 5. Resolve the detected-location verdict (school only — see below)
    const detectedLocation = await this.resolveDetectedLocationV2(dto);

    // 6. Write the measurement
    await this.prisma.measurements.create({
      data: buildMeasurementV2Row(dto, {
        facilityTypeId: facilityType.id,
        registrationId,
        detectedLocation,
      }),
    });

    return '';
  }

  /**
   * Distance/accuracy/flag for a v2 measurement.
   *
   * Only resolvable for schools today: the geolocation utility looks the
   * reference coordinates up from the school table. Health facilities carry
   * lat/lng too, so this is where that support would slot in — until then a
   * health measurement stores the reported coordinates with a null verdict
   * rather than a misleading `is_flagged`.
   */
  private async resolveDetectedLocationV2(
    dto: AddMeasurementV2Dto,
  ): Promise<{
    distance: number | null;
    accuracy: number | null;
    isFlagged: boolean | null;
  } | null> {
    const location = dto.geolocation?.location;
    const accuracy = dto.geolocation?.accuracy;
    if (!location || !accuracy || !dto.giga_id_school) {
      return null;
    }

    try {
      return await this.geolocationUtility.calculateDistanceAndSetFlag(
        dto.giga_id_school,
        location,
        accuracy,
      );
    } catch (error) {
      console.error('Error processing geolocation data (v2):', error);
      return null;
    }
  }

  /** POST /api/v2/measurements — facility-aware measurement submission */
  async createMeasurementFacilityV2(
    dto: AddMeasurementFacilityV2Dto,
  ): Promise<string> {
    return this.createMeasurementV2({
      ...dto,
      entity_type: dto.facility_type,
    });
  }


  /** GET /api/v2/measurements/facility — facility-aware measurement list */
  async measurementsV2Facility(
    skip: number,
    take: number,
    order_by: string,
    facility_type?: string,
    giga_id_health?: string,
    giga_id_school?: string,
    country_iso3_code?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementFacilityV2Dto[]> {
    const rows = await this.measurementsV2Entity(
      skip,
      take,
      order_by,
      facility_type,
      giga_id_health,
      giga_id_school,
      country_iso3_code,
      filter_by,
      filter_condition,
      filter_value,
      write_access,
      countries,
    );
    return rows.map((row) => {
      const { entity_type, ...rest } = row;
      return { ...rest, facility_type: entity_type };
    });
  }

  /**
   * GET /api/v1/measurements/v2/entity
   * Entity-aware measurement list — returns a plain array (no wrapper).
   */
  async measurementsV2Entity(
    skip: number,
    take: number,
    order_by: string,
    entity_type?: string,
    giga_id_health?: string,
    giga_id_school?: string,
    country_iso3_code?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementEntityV2Dto[]> {
    const filter: Record<string, any> = {};

    // Country access filter. Same rule as the v1 lists: a key without write
    // access sees only its countries, and none when it has none.
    if (!write_access) {
      filter.country_code = { in: countries ?? [] };
    }

    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries?.includes(dbCountry.code))
      ) {
        return [];
      }
      filter.country_code = { in: [dbCountry.code] };
    }

    if (giga_id_school) {
      filter.giga_id_school = normalizeGigaId(giga_id_school);
    }
    if (giga_id_health) {
      filter.giga_id_health = normalizeHealthId(giga_id_health);
    }

    // Resolve entity_type filter: string name → entity_type_id
    if (entity_type) {
      const ft = await this.facilityTypeService.getByCode(entity_type);
      if (!ft) {
        return [];
      }
      filter.facility_type_id = ft.id;
    }

    // Date filter
    if (filter_by && filter_condition && filter_value != null) {
      const parsedDate = new Date(filter_value);
      const formattedDate = parsedDate.toISOString();
      const hasTime =
        parsedDate.getUTCHours() > 0 ||
        parsedDate.getUTCMinutes() > 0 ||
        parsedDate.getUTCSeconds() > 0 ||
        parsedDate.getUTCMilliseconds() > 0;
      const endOfDay = new Date(filter_value);
      endOfDay.setUTCHours(23, 59, 59, 999);

      switch (filter_condition) {
        case 'lt': filter[filter_by] = { lt: hasTime ? formattedDate : parsedDate.toISOString() }; break;
        case 'lte': filter[filter_by] = { lte: hasTime ? formattedDate : endOfDay.toISOString() }; break;
        case 'gt': filter[filter_by] = { gt: hasTime ? formattedDate : endOfDay.toISOString() }; break;
        case 'gte': filter[filter_by] = { gte: hasTime ? formattedDate : parsedDate.toISOString() }; break;
        case 'eq':
          filter[filter_by] = hasTime
            ? { equals: formattedDate }
            : { gte: parsedDate, lte: endOfDay };
          break;
      }
    }

    const orderField = order_by.replace('-', '');
    const orderDir: 'asc' | 'desc' = order_by.startsWith('-') ? 'desc' : 'asc';

    const rows = await this.prisma.measurements.findMany({
      where: filter,
      skip,
      take,
      orderBy: { [orderField]: orderDir },
    });

    return Promise.all(rows.map(async (m) => this.toEntityV2Dto(m)));
  }

  private async toEntityV2Dto(m: Measurement): Promise<MeasurementEntityV2Dto> {
    // Resolve entity_type name (from cache — no extra DB round-trip)
    let facilityTypeName = 'school';
    if (m.facility_type_id != null) {
      const ft = await this.facilityTypeService.getById(m.facility_type_id);
      if (ft) facilityTypeName = ft.name;
    }

    return {
      timestamp: m.timestamp,
      browserId: m.browser_id,
      download: m.download,
      upload: m.upload,
      latency: m.latency != null ? parseInt(m.latency.toString()) : null,
      entity_type: facilityTypeName,
      school_id: m.school_id ?? null,
      giga_id_school: m.giga_id_school ?? null,
      giga_id_health: m.giga_id_health ?? null,
      registration_id: m.registration_id != null ? m.registration_id.toString() : null,
      country_code: m.country_code,
      ip_address: m.ip_address,
      app_version: m.app_version,
      source: m.source,
      created_at: m.created_at,
      device_hardware_id: m.device_hardware_id,
    };
  }

  private applyFilter(
    giga_id_school?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
  ): Record<string, any> {
    const filter: Record<string, any> = {
      // measurements.giga_id_school is always persisted lowercase (toModel),
      // so normalising the incoming value keeps the lookup on the plain
      // b-tree index instead of falling back to an ILIKE scan of a table
      // that is orders of magnitude larger than dailycheckapp_school.
      giga_id_school: giga_id_school == null ? giga_id_school : normalizeGigaId(giga_id_school),
      country_code: {
        in: countries,
      },
      AND: [v1SchoolScope()],
    };

    if (!giga_id_school) {
      delete filter.giga_id_school;
    }
    if (write_access) {
      delete filter.country_code;
    }
    if (filter_by && filter_condition && filter_value != null) {
      const parsedDate = new Date(filter_value);
      const formattedDate = parsedDate.toISOString();
      const hasTime =
        parsedDate.getUTCHours() > 0 ||
        parsedDate.getUTCMinutes() > 0 ||
        parsedDate.getUTCSeconds() > 0 ||
        parsedDate.getUTCMilliseconds() > 0;
      const endOfDay = new Date(filter_value);
      endOfDay.setUTCHours(23, 59, 59, 999);

      switch (filter_condition) {
        case 'lt':
          filter[filter_by] = {
            lt: hasTime ? formattedDate : parsedDate.toISOString(),
          };
          break;
        case 'lte':
          filter[filter_by] = {
            lte: hasTime ? formattedDate : endOfDay.toISOString(),
          };
          break;
        case 'gt':
          filter[filter_by] = {
            gt: hasTime ? formattedDate : endOfDay.toISOString(),
          };
          break;
        case 'gte':
          filter[filter_by] = {
            gte: hasTime ? formattedDate : parsedDate.toISOString(),
          };
          break;
        case 'eq':
          filter[filter_by] = hasTime
            ? {
                equals: formattedDate,
              }
            : {
                gte: parsedDate,
                lte: endOfDay,
              };
          break;
        default:
          break;
      }
    }
    return filter;
  }

  private toDto(
    measurement: Measurement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isSuperUser?: boolean,
  ): MeasurementDto {
    const clientInfo = plainToInstance(ClientInfoDto, measurement.client_info);
    const filteredClientInfo = clientInfo;
    // isSuperUser
    //   ? clientInfo
    //   : { ...clientInfo, IP: undefined };

    // Clean up Results object to remove ConnectionInfo
    const cleanResults = measurement.results
      ? this.removeConnectionInfo(measurement.results)
      : undefined;

    const filterMeasurementData = {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      BrowserID: measurement.browser_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: filteredClientInfo,
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: cleanResults
        ? plainToInstance(ResultsDto, cleanResults)
        : undefined,
      DataDownloaded: measurement.data_downloaded
        ? parseInt(measurement.data_downloaded.toString())
        : undefined,
      DataUploaded: measurement.data_uploaded
        ? parseInt(measurement.data_uploaded.toString())
        : undefined,
      DataUsage: measurement.data_usage
        ? parseInt(measurement.data_usage.toString())
        : undefined,
      giga_id_school: measurement.giga_id_school,
      country_code:
        measurement.source.toLowerCase() === 'mlab'
          ? clientInfo?.Country
          : measurement.country_code,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      geolocation: undefined,
      detected_location_distance: measurement.detected_location_distance,
      detected_location_accuracy: measurement.detected_location_accuracy,
      detected_location_is_flagged: measurement.detected_location_is_flagged,
      windows_username: measurement.windows_username,
      installed_path: measurement.installed_path,
      wifi_connections: measurement.wifi_connections
        ? JSON.parse(JSON.stringify(measurement.wifi_connections))
        : undefined,
      offline_synced: measurement.offline_synced,
      scheduled_slot: measurement.scheduled_slot,
      scheduled_at: measurement.scheduled_at,
      device_name: measurement.device_name,
      device_model: measurement.device_model,
      device_manufacturer: measurement.device_manufacturer,
      app_build_number: measurement.app_build_number,
      os_version: measurement.os_version,
      wifi_unavailable_reason: measurement.wifi_unavailable_reason,
      ssid_source: measurement.ssid_source,
      device_context: measurement.device_context
        ? JSON.parse(JSON.stringify(measurement.device_context))
        : undefined,
      protocol: measurement.protocol,
      download_latency: measurement.download_latency ?? undefined,
      upload_latency: measurement.upload_latency ?? undefined,
      download_jitter: measurement.download_jitter ?? undefined,
      upload_jitter: measurement.upload_jitter ?? undefined,
      jitter: measurement.jitter ?? undefined,
      packet_loss: measurement.packet_loss ?? undefined,
      network_quality_score: measurement.network_quality_score ?? undefined,
    };
    // if (isSuperUser) {
    filterMeasurementData['UUID'] = measurement.uuid;
    filterMeasurementData['ip_address'] = measurement.ip_address;
    filterMeasurementData['school_id'] = measurement.school_id;
    filterMeasurementData['device_hardware_id'] =
      measurement.device_hardware_id;
    // }
    return filterMeasurementData;
  }

  private removeConnectionInfo(results: any): any {
    if (!results) return results;

    const cleaned = { ...results };

    // Remove ConnectionInfo and NDTResult.S2C.ClientIP
    if (
      cleaned['NDTResult.C2S']?.LastServerMeasurement?.ConnectionInfo !==
      undefined
    ) {
      delete cleaned['NDTResult.C2S'].LastServerMeasurement.ConnectionInfo;
    }
    if (
      cleaned['NDTResult.S2C']?.LastServerMeasurement?.ConnectionInfo !==
      undefined
    ) {
      delete cleaned['NDTResult.S2C'].LastServerMeasurement.ConnectionInfo;
    }
    if (cleaned['NDTResult.S2C.ClientIP'] !== undefined) {
      delete cleaned['NDTResult.S2C.ClientIP'];
    }

    return cleaned;
  }

  private toV2Dto(measurement: Measurement): MeasurementV2Dto {
    const clientInfo =
      measurement.source.toLowerCase() === 'mlab'
        ? plainToInstance(ClientInfoDto, measurement.client_info ?? '')
        : {};
    return {
      timestamp: measurement.timestamp,
      browserId: measurement.browser_id,
      school_id: measurement.school_id,
      download: measurement.download,
      upload: measurement.upload,
      latency: parseInt(measurement.latency.toString()),
      giga_id_school: measurement.giga_id_school,
      country_code:
        measurement.source.toLowerCase() === 'mlab'
          ? clientInfo?.Country
          : measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      protocol: measurement.protocol,
      download_latency: measurement.download_latency ?? undefined,
      upload_latency: measurement.upload_latency ?? undefined,
      download_jitter: measurement.download_jitter ?? undefined,
      upload_jitter: measurement.upload_jitter ?? undefined,
      jitter: measurement.jitter ?? undefined,
      packet_loss: measurement.packet_loss ?? undefined,
      network_quality_score: measurement.network_quality_score ?? undefined,
    };
  }

  private toFailedDto(measurement: MeasurementFailed): MeasurementFailedDto {
    return {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      UUID: measurement.uuid,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: plainToInstance(ClientInfoDto, measurement.client_info),
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      DataDownloaded: measurement.data_downloaded
        ? parseInt(measurement.data_downloaded.toString())
        : undefined,
      DataUploaded: measurement.data_uploaded
        ? parseInt(measurement.data_uploaded.toString())
        : undefined,
      DataUsage: measurement.data_usage
        ? parseInt(measurement.data_usage.toString())
        : undefined,
      Results: measurement.results
        ? this.removeConnectionInfo(measurement.results)
          ? plainToInstance(
              ResultsDto,
              this.removeConnectionInfo(measurement.results),
            )
          : undefined
        : undefined,
      giga_id_school: measurement.giga_id_school,
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      reason: measurement.reason,
    };
  }

  private toModel(measurement: AddMeasurementDto): any {
    return {
      timestamp: measurement.Timestamp,
      uuid: measurement.UUID,
      browser_id: measurement.BrowserID,
      school_id: measurement.school_id,
      device_type: measurement.DeviceType,
      notes: measurement.Notes,
      client_info: measurement.ClientInfo,
      server_info: measurement.ServerInfo,
      annotation: measurement.annotation,
      download: measurement.Download,
      upload: measurement.Upload,
      data_downloaded: measurement?.DataDownloaded,
      data_uploaded: measurement?.DataUploaded,
      data_usage: measurement?.DataUsage,
      latency: measurement.Latency,
      results: measurement.Results,
      giga_id_school:
        measurement.giga_id_school == null
          ? measurement.giga_id_school
          : normalizeGigaId(measurement.giga_id_school),
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: 'DailyCheckApp',
      detected_latitude: measurement.geolocation?.location?.lat ?? null, 
      detected_longitude: measurement.geolocation?.location?.lng ?? null, 
      detected_location_accuracy: measurement.detected_location_accuracy ?? null,
      detected_location_distance: measurement.detected_location_distance ?? null,
      detected_location_is_flagged: measurement.detected_location_is_flagged ?? null,
      device_hardware_id: sanitizeHardwareId(measurement.device_hardware_id),
      windows_username: measurement.windows_username,
      installed_path: measurement.installed_path,
      wifi_connections: measurement.wifi_connections,
      offline_synced: measurement.offline_synced ?? false,
      scheduled_slot: measurement.scheduled_slot ?? null,
      scheduled_at: measurement.scheduled_at ?? null,
      device_name: measurement.device_name ?? null,
      device_model: measurement.device_model ?? null,
      device_manufacturer: measurement.device_manufacturer ?? null,
      app_build_number: measurement.app_build_number ?? null,
      os_version: measurement.os_version ?? null,
      wifi_unavailable_reason: sanitizeWifiUnavailableReason(
        measurement.wifi_unavailable_reason,
      ),
      ssid_source: sanitizeSsidSource(measurement.ssid_source),
      device_context: sanitizeDeviceContext(
        measurement.device_context,
      ),
      protocol: measurement.protocol ?? 'mlab',
      download_latency: measurement.download_latency ?? null,
      upload_latency: measurement.upload_latency ?? null,
      download_jitter: measurement.download_jitter ?? null,
      upload_jitter: measurement.upload_jitter ?? null,
      jitter: measurement.jitter ?? null,
      packet_loss: measurement.packet_loss ?? null,
      network_quality_score: measurement.network_quality_score ?? null,
    };
  }

  private toFailedModel(measurement: AddMeasurementDto, reason: string): any {
    return {
      timestamp: measurement.Timestamp,
      uuid: measurement.UUID,
      browser_id: measurement.BrowserID,
      school_id: measurement.school_id,
      device_type: measurement.DeviceType,
      notes: measurement.Notes,
      client_info: measurement.ClientInfo,
      server_info: measurement.ServerInfo,
      annotation: measurement.annotation,
      download: measurement.Download,
      upload: measurement.Upload,
      latency: measurement.Latency,
      results: measurement.Results,
      giga_id_school:
        measurement.giga_id_school == null
          ? measurement.giga_id_school
          : normalizeGigaId(measurement.giga_id_school),
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: 'DailyCheckApp',
      reason,
      detected_latitude: measurement.geolocation?.location?.lat || null,
      detected_longitude: measurement.geolocation?.location?.lng || null,
      detected_location_accuracy:
        measurement.detected_location_accuracy || null,
      detected_location_distance:
        measurement.detected_location_distance || null,
      detected_location_is_flagged:
        measurement.detected_location_is_flagged || false,
      device_name: measurement.device_name ?? null,
      device_model: measurement.device_model ?? null,
      device_manufacturer: measurement.device_manufacturer ?? null,
      app_build_number: measurement.app_build_number ?? null,
      os_version: measurement.os_version ?? null,
      wifi_unavailable_reason: sanitizeWifiUnavailableReason(
        measurement.wifi_unavailable_reason,
      ),
      ssid_source: sanitizeSsidSource(measurement.ssid_source),
      device_context: sanitizeDeviceContext(
        measurement.device_context,
      ),
    };
  }
}
