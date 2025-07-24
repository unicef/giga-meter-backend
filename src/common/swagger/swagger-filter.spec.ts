import { filterSwaggerDocByCategory } from './swagger-filter';
import { OpenAPIObject } from '@nestjs/swagger';
import { CategoryConfigType } from '../category.config';

describe('filterSwaggerDocByCategory', () => {
  let mockDocument: OpenAPIObject;

  beforeEach(() => {
    mockDocument = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0', description: 'Original Description' },
      paths: {
        '/users': {
          get: { responses: { '200': { description: 'User Response', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } },
          post: { responses: { '201': { description: 'User Response', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } },
        },
        '/posts/{postId}': {
          get: { responses: { '200': { description: 'Post Response', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } } } },
        },
        '/admin': {
          get: { responses: { '200': { description: 'Admin data' } } },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' }, password: { type: 'string' } } },
          Post: { type: 'object', properties: { postId: { type: 'number' }, content: { type: 'string' } } },
        },
      },
    };
  });

  it('should return the original document if category config is null', () => {
    const filtered = filterSwaggerDocByCategory(mockDocument, null);
    expect(filtered).toEqual(mockDocument);
  });

  it('should return empty paths if swagger.visible is false', () => {
    const config: CategoryConfigType = {
      name: 'hidden',
      swagger: { visible: false },
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    expect(filtered.paths).toEqual({});
  });

  it('should update swagger info based on category config', () => {
    const config: CategoryConfigType = {
      name: 'custom-info',
      swagger: { visible: true, title: 'Custom Title', description: 'Custom Description' },
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    expect(filtered.info.title).toBe('Custom Title');
    expect(filtered.info.description).toBe('Custom Description');
  });

  it('should filter paths based on allowedAPIs', () => {
    const config: CategoryConfigType = {
      name: 'user-only',
      swagger: { visible: true },
      allowedAPIs: [{ url: '/users', methods: ['GET'] }],
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    expect(filtered.paths).toHaveProperty('/users');
    expect(filtered.paths['/users']).toHaveProperty('get');
    expect(filtered.paths['/users']).not.toHaveProperty('post');
    expect(filtered.paths).not.toHaveProperty('/posts/{postId}');
    expect(filtered.paths).not.toHaveProperty('/admin');
  });

  it('should filter paths based on notAllowedAPIs', () => {
    const config: CategoryConfigType = {
      name: 'no-admin',
      swagger: { visible: true },
      notAllowedAPIs: [{ url: '/admin', methods: ['*'] }],
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    expect(filtered.paths).toHaveProperty('/users');
    expect(filtered.paths).toHaveProperty('/posts/{postId}');
    expect(filtered.paths).not.toHaveProperty('/admin');
  });

  it('should filter schemas based on allowed paths', () => {
    const config: CategoryConfigType = {
      name: 'post-viewer',
      swagger: { visible: true },
      allowedAPIs: [{ url: '/posts/{postId}', methods: ['GET'] }],
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    expect(filtered.components.schemas).toHaveProperty('Post');
    expect(filtered.components.schemas).not.toHaveProperty('User');
  });

  it('should filter schema properties based on responseFilters', () => {
    const config: CategoryConfigType = {
      name: 'user-viewer',
      swagger: { visible: true },
      allowedAPIs: [{ url: '/users', methods: ['GET'] }],
      responseFilters: { exclude: ['password'] },
    } as any;
    const filtered = filterSwaggerDocByCategory(mockDocument, config);
    const userSchema = filtered.components.schemas.User as any;
    expect(userSchema.properties).toHaveProperty('id');
    expect(userSchema.properties).toHaveProperty('name');
    expect(userSchema.properties).not.toHaveProperty('password');
  });
});