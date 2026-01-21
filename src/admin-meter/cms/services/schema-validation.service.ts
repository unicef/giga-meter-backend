import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  SectionSchema,
  SectionData,
  PageContent,
} from '../interfaces/content.interface';

@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name);

  /**
   * Validate content against schema definitions
   */
  validateContent(
    pages: PageContent[],
    schemas: Map<string, SectionSchema>,
  ): void {
    for (const page of pages) {
      for (const section of page.sections) {
        this.validateSection(section, schemas);
      }
    }
  }

  /**
   * Validate a single section against its schema
   */
  private validateSection(
    section: SectionData,
    schemas: Map<string, SectionSchema>,
  ): void {
    const schema = schemas.get(section.schemaId);

    if (!schema) {
      throw new BadRequestException(
        `Schema not found for section: ${section.schemaId}`,
      );
    }

    // Validate all required fields are present
    for (const field of schema.fields) {
      if (field.required && !section.data[field.key]) {
        throw new BadRequestException(
          `Required field '${field.key}' is missing in section '${section.id}' (schema: ${section.schemaId})`,
        );
      }

      // Validate field type if value exists
      if (section.data[field.key] !== undefined) {
        this.validateFieldType(
          field.key,
          field.type,
          section.data[field.key],
          section.id,
        );
      }
    }

    this.logger.debug(
      `Section '${section.id}' validated successfully against schema '${section.schemaId}'`,
    );
  }

  /**
   * Validate field type matches expected type
   */
  private validateFieldType(
    fieldKey: string,
    expectedType: 'text' | 'image' | 'list',
    value: any,
    sectionId: string,
  ): void {
    switch (expectedType) {
      case 'text':
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Field '${fieldKey}' in section '${sectionId}' must be a string`,
          );
        }
        break;

      case 'image':
        if (typeof value !== 'string' && typeof value !== 'object') {
          throw new BadRequestException(
            `Field '${fieldKey}' in section '${sectionId}' must be a string (image ID) or object (image data)`,
          );
        }
        // If it's an object, validate it has required image properties
        if (typeof value === 'object') {
          if (!value.id || !value.url) {
            throw new BadRequestException(
              `Image field '${fieldKey}' in section '${sectionId}' must have 'id' and 'url' properties`,
            );
          }
        }
        break;

      case 'list':
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Field '${fieldKey}' in section '${sectionId}' must be an array`,
          );
        }
        break;

      default:
        throw new BadRequestException(
          `Unknown field type '${expectedType}' for field '${fieldKey}'`,
        );
    }
  }

  /**
   * Validate schema definition itself
   */
  validateSchema(schema: SectionSchema): void {
    if (!schema.id || !schema.name) {
      throw new BadRequestException(
        'Schema must have both id and name properties',
      );
    }

    if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
      throw new BadRequestException(
        `Schema '${schema.id}' must have at least one field`,
      );
    }

    for (const field of schema.fields) {
      if (!field.key || !field.type) {
        throw new BadRequestException(
          `Invalid field definition in schema '${schema.id}': missing key or type`,
        );
      }

      if (!['text', 'image', 'list'].includes(field.type)) {
        throw new BadRequestException(
          `Invalid field type '${field.type}' in schema '${schema.id}'. Must be 'text', 'image', or 'list'`,
        );
      }

      if (typeof field.required !== 'boolean') {
        throw new BadRequestException(
          `Field '${field.key}' in schema '${schema.id}' must have a boolean 'required' property`,
        );
      }
    }

    this.logger.debug(`Schema '${schema.id}' validated successfully`);
  }

  /**
   * Build schema map from content structure
   */
  buildSchemaMap(contentJson: any): Map<string, SectionSchema> {
    const schemaMap = new Map<string, SectionSchema>();

    if (!contentJson.pages || !Array.isArray(contentJson.pages)) {
      return schemaMap;
    }

    for (const page of contentJson.pages) {
      if (page.schema && Array.isArray(page.schema)) {
        for (const schema of page.schema) {
          schemaMap.set(schema.id, schema);
        }
      }
    }

    return schemaMap;
  }
}
