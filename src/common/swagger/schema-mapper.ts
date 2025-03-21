import { OpenAPIObject } from '@nestjs/swagger';
import { OperationObject, PathItemObject, ContentObject, ResponseObject, RequestBodyObject } from './types';
import { getSchemaNameFromRef } from './utils';

/**
 * Build a map of which schemas are used by which endpoints
 */
export function buildEndpointSchemaMap(document: OpenAPIObject): Record<string, string[]> {
  const schemaMap: Record<string, string[]> = {};
  
  // Helper to recursively find all schema references in an object
  const findSchemaRefs = (obj: any, schemas: Set<string>): void => {
    if (!obj || typeof obj !== 'object') return;
    
    // If this is a reference, extract the schema name and add it
    if (obj.$ref) {
      const schemaName = getSchemaNameFromRef(obj.$ref);
      if (schemaName) schemas.add(schemaName);
      return;
    }
    
    // Process allOf, oneOf, anyOf arrays
    ['allOf', 'oneOf', 'anyOf'].forEach(key => {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(item => findSchemaRefs(item, schemas));
      }
    });
    
    // Process array items
    if (obj.items) {
      findSchemaRefs(obj.items, schemas);
    }
    
    // Process object properties
    if (obj.properties) {
      Object.values(obj.properties).forEach(prop => {
        findSchemaRefs(prop, schemas);
      });
    }
    
    // Process additionalProperties
    if (obj.additionalProperties && typeof obj.additionalProperties === 'object') {
      findSchemaRefs(obj.additionalProperties, schemas);
    }
    
    // Check array items
    if (Array.isArray(obj)) {
      obj.forEach(item => findSchemaRefs(item, schemas));
      return;
    }
    
    // Check object properties
    Object.values(obj).forEach(value => {
      findSchemaRefs(value, schemas);
    });
  };
  
  // Process all paths and their operations
  if (document.paths) {
    Object.entries(document.paths).forEach(([path, pathItem]) => {
      // Process each HTTP method
      Object.entries(pathItem as PathItemObject).forEach(([method, operation]) => {
        if (typeof operation !== 'object' || !operation) return;
        
        // Skip non-operation properties like 'parameters'
        if (['parameters', 'servers', 'summary', 'description'].includes(method)) return;
        
        // Form the endpoint key (path + method)
        const endpoint = `${path}:${method.toUpperCase()}`;
        const schemaSet = new Set<string>();
        
        // Process responses to find schema references
        const op = operation as OperationObject;
        if (op.responses) {
          Object.values(op.responses).forEach(resp => {
            const response = resp as ResponseObject;
            if (!response || typeof response !== 'object') return;
            
            // Check content types (application/json, etc.)
            if (response.content) {
              Object.values(response.content).forEach(contentObj => {
                const content = contentObj as ContentObject;
                if (content.schema) {
                  findSchemaRefs(content.schema, schemaSet);
                }
              });
            }
          });
        }
        
        // Process request body to find schema references
        if (op.requestBody) {
          const requestBody = op.requestBody as RequestBodyObject;
          if (requestBody.content) {
            Object.values(requestBody.content).forEach(contentObj => {
              const content = contentObj as ContentObject;
              if (content.schema) {
                findSchemaRefs(content.schema, schemaSet);
              }
            });
          }
        }
        
        // Convert Set to Array for easier manipulation
        const schemaArray = Array.from(schemaSet);
        schemaMap[endpoint] = schemaArray;
      });
    });
  }
  
  return schemaMap;
}

/**
 * Find all nested schema dependencies
 */
export function findAllSchemaDependencies(
  schemas: Record<string, any>,
  initialSchemas: Set<string>
): Set<string> {
  const allDependencies = new Set<string>(initialSchemas);
  const processed = new Set<string>();
  const toProcess = Array.from(initialSchemas);
  
  // Helper to find references in a schema
  const findRefsInSchema = (schema: any, refs: Set<string>): void => {
    if (!schema || typeof schema !== 'object') return;
    
    // If this is a reference, extract the schema name
    if (schema.$ref) {
      const schemaName = getSchemaNameFromRef(schema.$ref);
      if (schemaName) refs.add(schemaName);
      return;
    }
    
    // Process allOf, oneOf, anyOf arrays
    ['allOf', 'oneOf', 'anyOf'].forEach(key => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach(item => findRefsInSchema(item, refs));
      }
    });
    
    // Process array items
    if (schema.items) {
      findRefsInSchema(schema.items, refs);
    }
    
    // Process object properties
    if (schema.properties) {
      Object.values(schema.properties).forEach(prop => {
        findRefsInSchema(prop, refs);
      });
    }
    
    // Process additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      findRefsInSchema(schema.additionalProperties, refs);
    }
  };
  
  // Process all schemas to find their dependencies
  while (toProcess.length > 0) {
    const schemaName = toProcess.pop();
    
    if (!schemaName || processed.has(schemaName)) continue;
    processed.add(schemaName);
    
    const schema = schemas[schemaName];
    if (!schema) continue;
    
    const refs = new Set<string>();
    findRefsInSchema(schema, refs);
    
    // Add new dependencies to the processing queue
    refs.forEach(ref => {
      if (!processed.has(ref)) {
        allDependencies.add(ref);
        toProcess.push(ref);
      }
    });
  }
  
  return allDependencies;
}

/**
 * Resolves a schema reference to the actual schema
 * @param schemas All schemas in the document
 * @param ref Reference string in the format "#/components/schemas/SchemaName"
 * @returns The resolved schema or null if not found
 */
export function resolveSchemaRef(schemas: Record<string, any>, ref: string): any {
  if (!ref || typeof ref !== 'string') return null;
  
  // Extract schema name from reference
  const schemaName = getSchemaNameFromRef(ref);
  if (!schemaName) return null;
  
  // Return the schema if it exists
  return schemas[schemaName] || null;
}
