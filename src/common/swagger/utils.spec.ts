import {
    pathMatchesPattern,
    getSchemaNameFromRef,
    findSchemaReferences,
    isSchemaReferenced,
  } from './utils';
  
  describe('Swagger Utils', () => {
    describe('pathMatchesPattern', () => {
      it('should return true for an exact match', () => {
        expect(pathMatchesPattern('/users', '/users')).toBe(true);
      });
  
      it('should return true for a match with a trailing slash', () => {
        expect(pathMatchesPattern('/users/', '/users')).toBe(true);
      });
  
      it('should return true for a wildcard pattern', () => {
        expect(pathMatchesPattern('/users/123', '/users/*')).toBe(true);
        expect(pathMatchesPattern('/users/123/posts', '/users/*')).toBe(true);
      });
  
      it('should return false for a non-matching path', () => {
        expect(pathMatchesPattern('/posts', '/users')).toBe(false);
      });
  
      it('should return false when wildcard is not at the end', () => {
          expect(pathMatchesPattern('/api/users/123', '/api/*/123')).toBe(false);
      });
    });
  
    describe('getSchemaNameFromRef', () => {
      it('should extract the schema name from a valid ref', () => {
        expect(getSchemaNameFromRef('#/components/schemas/User')).toBe('User');
      });
  
      it('should return null for an invalid or empty ref', () => {
        expect(getSchemaNameFromRef('')).toBe(null);
        expect(getSchemaNameFromRef(null)).toBe(null);
        expect(getSchemaNameFromRef('invalid-ref')).toBe('invalid-ref');
      });
    });
  
    describe('findSchemaReferences', () => {
      it('should find a direct reference', () => {
        const schema = { $ref: '#/components/schemas/User' };
        const refs = findSchemaReferences(schema);
        expect(refs).toEqual(new Set(['User']));
      });
  
      it('should find references in object properties', () => {
        const schema = {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            post: { $ref: '#/components/schemas/Post' },
          },
        };
        const refs = findSchemaReferences(schema);
        expect(refs).toEqual(new Set(['User', 'Post']));
      });
  
      it('should find references in array items', () => {
        const schema = {
          type: 'array',
          items: { $ref: '#/components/schemas/Tag' },
        };
        const refs = findSchemaReferences(schema);
        expect(refs).toEqual(new Set(['Tag']));
      });
  
      it('should find references in allOf, oneOf, anyOf', () => {
        const schema = {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { properties: { user: { $ref: '#/components/schemas/User' } } },
          ],
        };
        const refs = findSchemaReferences(schema);
        expect(refs).toEqual(new Set(['Base', 'User']));
      });
  
      it('should return an empty set if no references are found', () => {
        const schema = { type: 'object', properties: { name: { type: 'string' } } };
        const refs = findSchemaReferences(schema);
        expect(refs).toEqual(new Set());
      });
    });
  
    describe('isSchemaReferenced', () => {
      const schemas = {
        User: { properties: { address: { $ref: '#/components/schemas/Address' } } },
        Address: { type: 'object' },
        Post: { type: 'object' },
        Orphan: { type: 'object' },
      };
  
      const endpointSchemaMap = {
        '/users:GET': ['User'],
        '/posts:GET': ['Post'],
      };
  
      it('should return true if a schema is used directly by an endpoint', () => {
        expect(isSchemaReferenced('Post', schemas, endpointSchemaMap)).toBe(true);
      });
  
      it('should return true if a schema is referenced by another schema', () => {
        expect(isSchemaReferenced('Address', schemas, endpointSchemaMap)).toBe(true);
      });
  
      it('should return false if a schema is not referenced', () => {
        expect(isSchemaReferenced('Orphan', schemas, endpointSchemaMap)).toBe(false);
      });
    });
  });