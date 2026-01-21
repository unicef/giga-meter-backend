import { Test, TestingModule } from '@nestjs/testing';
import { SchemaValidationService } from './schema-validation.service';
import { BadRequestException } from '@nestjs/common';

describe('SchemaValidationService', () => {
  let service: SchemaValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaValidationService],
    }).compile();

    service = module.get<SchemaValidationService>(SchemaValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const schema = {
        id: 'hero',
        name: 'Hero Section',
        fields: [
          {
            key: 'title',
            type: 'text' as const,
            required: true,
            label: 'Title',
          },
        ],
      };

      expect(() => service.validateSchema(schema)).not.toThrow();
    });

    it('should throw error for schema without id', () => {
      const schema = {
        name: 'Hero Section',
        fields: [],
      } as any;

      expect(() => service.validateSchema(schema)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for schema without fields', () => {
      const schema = {
        id: 'hero',
        name: 'Hero Section',
        fields: [],
      };

      expect(() => service.validateSchema(schema)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid field type', () => {
      const schema = {
        id: 'hero',
        name: 'Hero Section',
        fields: [
          {
            key: 'title',
            type: 'invalid' as any,
            required: true,
          },
        ],
      };

      expect(() => service.validateSchema(schema)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateContent', () => {
    it('should validate content against schema', () => {
      const pages = [
        {
          page: 'home',
          sections: [
            {
              id: 'hero_1',
              schemaId: 'hero',
              data: {
                title: 'Welcome',
              },
            },
          ],
        },
      ];

      const schemas = new Map([
        [
          'hero',
          {
            id: 'hero',
            name: 'Hero',
            fields: [
              {
                key: 'title',
                type: 'text' as const,
                required: true,
              },
            ],
          },
        ],
      ]);

      expect(() => service.validateContent(pages, schemas)).not.toThrow();
    });

    it('should throw error for missing required field', () => {
      const pages = [
        {
          page: 'home',
          sections: [
            {
              id: 'hero_1',
              schemaId: 'hero',
              data: {},
            },
          ],
        },
      ];

      const schemas = new Map([
        [
          'hero',
          {
            id: 'hero',
            name: 'Hero',
            fields: [
              {
                key: 'title',
                type: 'text' as const,
                required: true,
              },
            ],
          },
        ],
      ]);

      expect(() => service.validateContent(pages, schemas)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for schema not found', () => {
      const pages = [
        {
          page: 'home',
          sections: [
            {
              id: 'hero_1',
              schemaId: 'nonexistent',
              data: {},
            },
          ],
        },
      ];

      const schemas = new Map();

      expect(() => service.validateContent(pages, schemas)).toThrow(
        BadRequestException,
      );
    });
  });
});
