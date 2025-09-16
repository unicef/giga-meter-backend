import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

/**
 * Utility service for geolocation-related operations
 */
@Injectable()
export class GeolocationUtility {
  // Distance and accuracy thresholds in meters
  private readonly DISTANCE_THRESHOLD = 1000; // 1km
  private readonly ACCURACY_THRESHOLD = 1000; // 1km

  constructor(private prisma: PrismaService) {}

  /**
   * Gets school coordinates by giga_id_school
   * 
   * @param giga_id_school The GIGA ID of the school
   * @returns School data including latitude and longitude
   */
  async getSchoolCoordinates(giga_id_school: string): Promise<{ latitude: number; longitude: number }> {
    // If not found in master_sync_school_static, try to extract from geopoint in school table
    const school = await this.prisma.school.findFirst({
      where: { 
        giga_id_school: giga_id_school?.toLowerCase().trim() 
      },
      select: {
        geopoint: true
      }
    });
    
    if (school?.geopoint) {
      // Parse geopoint which might be in format "lat,lng"
      try {
        const [lat, lng] = school.geopoint.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      } catch (e) {
        console.error(`Error parsing geopoint for school ${giga_id_school}: ${e}`);
      }
    }
    
    return { latitude: null, longitude: null };
  }

  /**
   * Calculates the distance between two geographic points using PostGIS
   * 
   * @param deviceLat Latitude of the device location
   * @param deviceLon Longitude of the device location
   * @param schoolLat Latitude of the school location
   * @param schoolLon Longitude of the school location
   * @returns Distance in meters between the two points
   */
  async calculateDistance(
    deviceLat: number,
    deviceLon: number, 
    schoolLat: number, 
    schoolLon: number
  ): Promise<number | null> {
    try {
      // If any coordinate is missing, return null
      if (!deviceLat || !deviceLon || !schoolLat || !schoolLon) {
        return null;
      }

      // Use PostGIS to calculate distance
      const result = await this.prisma.$queryRaw<
        { distance_meters: number }[]
      >`
        SELECT ST_Distance(
          ST_SetSRID(ST_MakePoint(${deviceLon}, ${deviceLat}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${schoolLon}, ${schoolLat}), 4326)::geography
        ) AS distance_meters
      `;

      return result[0]?.distance_meters ?? null;
    } catch (error) {
      console.error('Error calculating distance with PostGIS:', error);
      return null;
    }
  }

  /**
   * Calculates distance between device and school location and determines if it should be flagged
   * 
   * @param giga_id_school School ID
   * @param deviceLocation Device location coordinates
   * @param deviceAccuracy Device location accuracy in meters
   * @returns Object with distance and flag status
   */
  async calculateDistanceAndSetFlag(
    giga_id_school: string,
    deviceLocation: { lat: number; lng: number },
    deviceAccuracy: number
  ): Promise<{
    distance: number | null;
    accuracy: number | null;
    isFlagged: boolean | null;
  }> {
    try {
      // Get school coordinates
      const schoolCoords = await this.getSchoolCoordinates(giga_id_school);
      
      // If school coordinates not available, return null values
      if (!schoolCoords || !schoolCoords.latitude || !schoolCoords.longitude) {
        console.warn(`School coordinates not found for giga_id_school: ${giga_id_school}`);
        return {
          distance: null,
          accuracy: deviceAccuracy,
          isFlagged: null
        };
      }
      
      // Calculate distance
      const distance = await this.calculateDistance(
        deviceLocation.lat,
        deviceLocation.lng,
        schoolCoords.latitude,
        schoolCoords.longitude
      );
      
      // Determine if the location should be flagged
      const isFlagged = distance !== null && 
                      deviceAccuracy !== null && 
                      distance > this.DISTANCE_THRESHOLD && 
                      deviceAccuracy > this.ACCURACY_THRESHOLD;
      
      return {
        distance,
        accuracy: deviceAccuracy,
        isFlagged
      };
    } catch (error) {
      console.error('Error in calculateDistanceAndSetFlag:', error);
      return {
        distance: null,
        accuracy: deviceAccuracy,
        isFlagged: null
      };
    }
  }

  /**
   * Creates a PostGIS point from latitude and longitude
   * 
   * @param tableName The database table name
   * @param idField The ID field name
   * @param id The record ID
   * @param lat Latitude
   * @param lng Longitude
   * @param fieldName The field to update with the PostGIS point
   */
  async createPostGISPoint(
    tableName: string,
    idField: string,
    id: string | number | bigint,
    lat: number,
    lng: number,
    fieldName: string = 'detected_coordinates'
  ): Promise<void> {
    try {
      // Using string interpolation for table and field names since Prisma doesn't support
      // parameterized identifiers in raw queries
      if(!lat || !lng) return;
      const query = `
        UPDATE "${tableName}"
        SET "${fieldName}" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        WHERE "${idField}" = $3
      `;
      
      await this.prisma.$executeRawUnsafe(query, lng, lat, id);
    } catch (error) {
      console.error(`Error creating PostGIS point in ${tableName}:`, error);
    }
  }
}
