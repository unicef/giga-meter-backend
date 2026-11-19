import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { facility_type } from '@prisma/client';

/**
 * Shared service for resolving facility_type rows by name or code.
 * The two known rows ("school" / "health") are cached in memory on first load
 * to avoid a DB round-trip on every inbound request.
 */
@Injectable()
export class FacilityTypeService implements OnModuleInit {
  private readonly logger = new Logger(FacilityTypeService.name);
  private cache: Map<string, facility_type> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.warmCache();
  }

  /** Returns a single facility_type by its code (e.g. "school" | "health"). */
  async getByCode(code: string): Promise<facility_type | null> {
    if (this.cache.size === 0) {
      await this.warmCache();
    }
    return this.cache.get(code?.toLowerCase()) ?? null;
  }

  /** Returns a single facility_type by its numeric PK. */
  async getById(id: number): Promise<facility_type | null> {
    if (this.cache.size === 0) {
      await this.warmCache();
    }
    for (const row of this.cache.values()) {
      if (row.id === id) return row;
    }
    return null;
  }

  /** Resolves a code string to its numeric id, or throws if not found. */
  async resolveIdByCode(code: string): Promise<number> {
    const row = await this.getByCode(code);
    if (!row) {
      throw new Error(`Unknown facility_type code: "${code}"`);
    }
    return row.id;
  }

  private async warmCache(): Promise<void> {
    try {
      const rows = await this.prisma.facility_type.findMany();
      this.cache.clear();
      for (const row of rows) {
        // Index by code AND name (lowercased) — tolerant of the legacy seed
        // variant that stored codes as 'SCHL'/'HLTH' before the
        // normalize_facility_type_codes migration runs.
        this.cache.set(row.code?.toLowerCase(), row);
        if (row.name) {
          this.cache.set(row.name.toLowerCase(), row);
        }
      }
      this.logger.log(
        `FacilityTypeService cache warmed with ${rows.length} row(s)`,
      );
    } catch (err) {
      this.logger.error('Failed to warm FacilityTypeService cache', err);
    }
  }
}
