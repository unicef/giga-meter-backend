import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

/**
 * Utility service for geolocation-related operations
 */
@Injectable()
export class GeolocationUtility {
  // Distance and accuracy thresholds in meters
  private readonly DISTANCE_THRESHOLD = 4000; // 4km
  private readonly ACCURACY_THRESHOLD = 500; // 500 meter

  constructor(private prisma: PrismaService) {}

  /**
   * Gets school coordinates by giga_id_school
   * 
   * @param giga_id_school The GIGA ID of the school
   * @returns School data including latitude and longitude
   */
  async getSchoolCoordinates(giga_id_school: string): Promise<{ latitude: number; longitude: number }> {
    try {
      // Use raw SQL to extract coordinates from PostGIS geography column
      const result = await this.prisma.$queryRaw<
        { latitude: number; longitude: number }[]
      >`
        SELECT 
          ST_Y(geopoint::geometry) as latitude,
          ST_X(geopoint::geometry) as longitude
        FROM school 
        WHERE giga_id_school = ${giga_id_school?.toLowerCase().trim()}
        AND geopoint IS NOT NULL
        LIMIT 1
      `;
      if (result.length > 0 && result[0].latitude && result[0].longitude) {
        return {
          latitude: result[0].latitude,
          longitude: result[0].longitude
        };
      }
    } catch (error) {
      console.error(`Error getting school coordinates for ${giga_id_school}:`, error);
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
                         (distance > this.DISTANCE_THRESHOLD || 
                          deviceAccuracy > this.ACCURACY_THRESHOLD);
      
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
}
