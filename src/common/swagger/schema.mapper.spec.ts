import { buildEndpointSchemaMap, findAllSchemaDependencies } from './schema-mapper';
import { OpenAPIObject } from '@nestjs/swagger';

describe('Swagger Schema Mapper', () => {
  describe('buildEndpointSchemaMap', () => {
    it('should correctly map schemas from responses and request bodies', () => {
      const mockDocument: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'A list of users',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UserList' },
                    },
                  },
                },
              },
            },
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NewUser' },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'User created',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
          '/health': {
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
        components: {
          schemas: {
            User: { type: 'object' },
            UserList: { type: 'object' },
            NewUser: { type: 'object' },
          },
        },
      };

      const schemaMap = buildEndpointSchemaMap(mockDocument);

      // Sort arrays to make the test order-agnostic
      Object.values(schemaMap).forEach(arr => arr.sort());

      expect(schemaMap).toEqual({
        '/users:GET': ['UserList'],
        '/users:POST': ['NewUser', 'User'].sort(),
      });
    });

    it('should return an empty map for a document with no schemas', () => {
        const mockDocument: OpenAPIObject = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0' },
            paths: {
              '/health': {
                get: {
                  responses: {
                    '200': { description: 'OK' },
                  },
                },
              },
            },
          };

          const schemaMap = buildEndpointSchemaMap(mockDocument);
          expect(schemaMap).toEqual({});
    });
  });

  describe('findAllSchemaDependencies', () => {
    const allSchemas = {
      A: { properties: { b: { $ref: '#/components/schemas/B' } } },
      B: { properties: { c: { $ref: '#/components/schemas/C' } } },
      C: { type: 'object' },
      D: { properties: { a: { $ref: '#/components/schemas/A' } } }, // Causes circular dependency
      E: { type: 'object' }, // No dependencies
    };

    it('should find all transitive dependencies', () => {
      const dependencies = findAllSchemaDependencies(allSchemas, ['A']);
      expect(dependencies).toEqual(new Set(['A', 'B', 'C']));
    });

    it('should handle circular dependencies', () => {
      const dependencies = findAllSchemaDependencies(allSchemas, ['D']);
      expect(dependencies).toEqual(new Set(['D', 'A', 'B', 'C']));
    });

    it('should return only the schema itself if it has no dependencies', () => {
      const dependencies = findAllSchemaDependencies(allSchemas, ['E']);
      expect(dependencies).toEqual(new Set(['E']));
    });

    it('should handle multiple initial schemas', () => {
        const dependencies = findAllSchemaDependencies(allSchemas, ['A', 'E']);
        expect(dependencies).toEqual(new Set(['A', 'B', 'C', 'E']));
    });

    it('should handle schema names that do not exist', () => {
        const dependencies = findAllSchemaDependencies(allSchemas, ['F']);
        expect(dependencies).toEqual(new Set(['F']));
      });
  });
});