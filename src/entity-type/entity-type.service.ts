import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { entity_type } from '@prisma/client';

/**
 * Shared service for resolving entity_type rows by name or code.
 * The two known rows ("school" / "health") are cached in memory on first load
 * to avoid a DB round-trip on every inbound request.
 */
@Injectable()
export class EntityTypeService implements OnModuleInit {
  private readonly logger = new Logger(EntityTypeService.name);
  private cache: Map<string, entity_type> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.warmCache();
  }

  /** Returns a single entity_type by its code (e.g. "school" | "health"). */
  async getByCode(code: string): Promise<entity_type | null> {
    if (this.cache.size === 0) {
      await this.warmCache();
    }
    return this.cache.get(code) ?? null;
  }

  /** Returns a single entity_type by its numeric PK. */
  async getById(id: number): Promise<entity_type | null> {
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
      throw new Error(`Unknown entity_type code: "${code}"`);
    }
    return row.id;
  }

  private async warmCache(): Promise<void> {
    try {
      const rows = await this.prisma.entity_type.findMany();
      this.cache.clear();
      for (const row of rows) {
        this.cache.set(row.code, row);
      }
      this.logger.log(`EntityTypeService cache warmed with ${rows.length} row(s)`);
    } catch (err) {
      this.logger.error('Failed to warm EntityTypeService cache', err);
    }
  }
}
