import { filterSchemaProperties } from './schema-filter';
import { SchemaObject } from './types';

describe('filterSchemaProperties', () => {
  let baseSchema: SchemaObject;
  let allSchemas: Record<string, SchemaObject>;

  beforeEach(() => {
    const AddressSchema: SchemaObject = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
      required: ['street', 'city'],
    };

    baseSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            username: { type: 'string' },
          },
        },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tagId: { type: 'number' },
              tagName: { type: 'string' },
            },
          },
        },
        address: { $ref: '#/components/schemas/Address' },
      },
      required: ['id', 'name', 'user'],
    };

    allSchemas = {
      Address: AddressSchema,
    };
  });

  it('should exclude a simple property', () => {
    const schemaCopy = JSON.parse(JSON.stringify(baseSchema));
    filterSchemaProperties(schemaCopy, ['name'], [], [], [], allSchemas);
    expect(schemaCopy.properties).not.toHaveProperty('name');
    expect(schemaCopy.required).not.toContain('name');
  });

  it('should exclude a nested property', () => {
    const schemaCopy = JSON.parse(JSON.stringify(baseSchema));
    filterSchemaProperties(schemaCopy, ['user.username'], [], [], [], allSchemas);
    expect(schemaCopy.properties.user.properties).not.toHaveProperty('username');
  });

  it('should handle inclusion rules', () => {
    const schemaCopy = JSON.parse(JSON.stringify(baseSchema));
    filterSchemaProperties(schemaCopy, [], ['id', 'user.userId'], [], [], allSchemas);
    expect(Object.keys(schemaCopy.properties).sort()).toEqual(['id', 'user'].sort());
    expect(Object.keys(schemaCopy.properties.user.properties)).toEqual(['userId']);
  });
});
