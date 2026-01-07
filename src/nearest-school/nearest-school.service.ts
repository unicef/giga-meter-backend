import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearestSchoolResponseDto } from './nearest-school.dto';

@Injectable()
export class NearestSchoolService {
  private readonly MAX_DISTANCE_METERS = 1000; // 1km

  constructor(private prisma: PrismaService) {}

  /**
   * Finds the nearest school within 1km of the provided coordinates
   * 
   * @param latitude Latitude of the search location
   * @param longitude Longitude of the search location
   * @returns Nearest school information with distance
   */
  async findNearestSchool(
    latitude: number,
    longitude: number,
  ): Promise<NearestSchoolResponseDto> {
    try {
      // Use PostGIS to find the nearest school within 1km
      // Convert lat/long to PostGIS geometry and use CTE pattern
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

      const school = result[0];

      return {
        id: school.id,
        name: school.name || '',
        giga_id_school: school.giga_id_school || '',
        address: school.address || '',
        country_code: school.country_code || '',
        latitude: school.latitude,
        longitude: school.longitude,
        distance_meters: Math.round(school.distance_meters * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error finding nearest school:', error);
      throw new NotFoundException(
        `Error finding nearest school: ${error.message}`,
      );
    }
  }
}

