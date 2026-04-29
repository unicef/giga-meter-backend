import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for the sandbox/dummy v2 measurements endpoint.
 *
 * Mirrors `MeasurementV2Dto` (see ../measurement.dto.ts) and adds the
 * polymorphic-entity fields that the upcoming schema migration will
 * introduce on the real `measurements` table:
 *
 *   - entity_type     : "school" | "health"
 *   - giga_id_health  : present on health rows
 *   - registration_id : stringified BigInt FK to the future `registration` table
 *
 * On a health row, `school_id` and `giga_id_school` are null (and vice versa).
 *
 * NOTE: This DTO is intentionally separate from the live `MeasurementV2Dto`.
 * It exists ONLY to back the sandbox endpoint used by external integrators
 * (e.g. Giga Maps) for end-to-end testing before the real migration lands.
 * Do not import this from non-sandbox code paths.
 */
export type EntityType = 'school' | 'health';

export class MeasurementSandboxDto {
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

  @ApiProperty({
    enum: ['school', 'health'],
    description:
      'Discriminator for the new polymorphic measurement model. ' +
      'Returned as the entity-type name (not the FK id).',
  })
  entity_type!: EntityType;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Null on health rows.',
  })
  school_id?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Null on health rows.',
  })
  giga_id_school?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Null on school rows.',
  })
  giga_id_health?: string | null;

  @ApiProperty({
    required: false,
    description:
      'Stringified BigInt id of the registration row that produced this ' +
      'measurement. Stable across measurements from the same install.',
  })
  registration_id?: string;

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

  @ApiProperty({ required: false })
  device_hardware_id?: string;

  @ApiProperty({ required: false })
  windows_username?: string;

  @ApiProperty({ required: false })
  installed_path?: string;

  @ApiProperty({ required: false })
  wifi_connections?: any[];
}
