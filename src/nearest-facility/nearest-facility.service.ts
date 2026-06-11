import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearestFacilityResponseDto } from './nearest-facility.dto';

@Injectable()
export class NearestFacilityService {
  private readonly MAX_DISTANCE_METERS = parseInt(
    process.env.NEAREST_SCHOOL_MAX_DISTANCE_METERS || '200',
    10,
  );

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public entry point
  // ---------------------------------------------------------------------------

  async findNearest(
    latitude: number,
    longitude: number,
    entity_type: 'school' | 'health',
  ): Promise<NearestFacilityResponseDto> {
    if (entity_type === 'health') {
      return this.findNearestHealth(latitude, longitude);
    }
    return this.findNearestSchool(latitude, longitude);
  }

  // ---------------------------------------------------------------------------
  // School — uses existing geopoint column (same logic as NearestSchoolService)
  // ---------------------------------------------------------------------------

  private async findNearestSchool(
    latitude: number,
    longitude: number,
  ): Promise<NearestFacilityResponseDto> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        giga_id_school: string | null;
        address: string | null;
        country_code: string | null;
        latitude: number;
        longitude: number;
        distance_meters: number;
      }>
    >`
      WITH input_point AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geometry AS geopoint
      )
      SELECT
        s.id::text AS id,
        s.name,
        s.giga_id_school,
        s.address,
        s.country_code,
        ST_Y(s.geopoint::geometry) AS latitude,
        ST_X(s.geopoint::geometry) AS longitude,
        ST_Distance(
          input_point.geopoint::geography,
          s.geopoint::geography
        ) AS distance_meters
      FROM school s, input_point
      WHERE s.geopoint IS NOT NULL
        AND s.deleted IS NULL
        AND ST_DWithin(
          input_point.geopoint::geography,
          s.geopoint::geography,
          ${this.MAX_DISTANCE_METERS}
        )
      ORDER BY distance_meters ASC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `No school found within ${this.MAX_DISTANCE_METERS} meters of the provided location`,
      );
    }

    const s = result[0];
    return {
      id: s.id,
      name: s.name ?? '',
      giga_id: s.giga_id_school ?? '',
      entity_type: 'school',
      latitude: s.latitude,
      longitude: s.longitude,
      country_code: s.country_code ?? '',
      address: s.address ?? undefined,
      distance_meters: Math.round(s.distance_meters * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Health — builds geography inline from plain lat/lon columns
  // ---------------------------------------------------------------------------

  private async findNearestHealth(
    latitude: number,
    longitude: number,
  ): Promise<NearestFacilityResponseDto> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        health_id_giga: string | null;
        country_code: string | null;
        latitude: number;
        longitude: number;
        distance_meters: number;
      }>
    >`
      WITH input_point AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS geo
      )
      SELECT
        h.id::text AS id,
        h.facility_name AS name,
        h.health_id_giga,
        h.country_code,
        h.latitude,
        h.longitude,
        ST_Distance(
          input_point.geo,
          ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography
        ) AS distance_meters
      FROM health h, input_point
      WHERE h.deleted IS NULL
        AND ST_DWithin(
          input_point.geo,
          ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography,
          ${this.MAX_DISTANCE_METERS}
        )
      ORDER BY distance_meters ASC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `No health facility found within ${this.MAX_DISTANCE_METERS} meters of the provided location`,
      );
    }

    const h = result[0];
    return {
      id: h.id,
      name: h.name ?? '',
      giga_id: h.health_id_giga ?? '',
      entity_type: 'health',
      latitude: h.latitude,
      longitude: h.longitude,
      country_code: h.country_code ?? '',
      distance_meters: Math.round(h.distance_meters * 100) / 100,
    };
  }
}
