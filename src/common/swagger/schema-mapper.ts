import { OpenAPIObject } from '@nestjs/swagger';
import { OperationObject, PathItemObject, ContentObject, ResponseObject, RequestBodyObject } from './types';
import { getSchemaNameFromRef, findSchemaReferences } from './utils';

/**
 * Build a map of which schemas are used by which endpoints
 */
export function buildEndpointSchemaMap(document: OpenAPIObject): Record<string, string[]> {
  const schemaMap: Record<string, string[]> = {};
  
  // Process all paths and operations to find schema references
  for (const [path, pathItem] of Object.entries(document.paths)) {
    // Skip if not a valid path item
    if (!pathItem) continue;
    
    // Process each HTTP method in the path
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
    
    for (const method of httpMethods) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation) continue;
      
      const endpointKey = `${path}:${method.toUpperCase()}`;
      
      // Find schemas in responses
      if (operation.responses) {
        for (const response of Object.values(operation.responses)) {
          if (response && response.content) {
            for (const contentType of Object.values(response.content)) {
              if (contentType.schema) {
                const schemaRefs = new Set<string>();
                const refs = findSchemaReferences(contentType.schema, schemaRefs);
                
                // Add to map
                if (!schemaMap[endpointKey]) schemaMap[endpointKey] = [];
                refs.forEach(ref => {
                  if (!schemaMap[endpointKey].includes(ref)) {
                    schemaMap[endpointKey].push(ref);
                  }
                });
              }
            }
          }
        }
      }
      
      // Find schemas in request body
      if (operation.requestBody && operation.requestBody.content) {
        for (const contentType of Object.values(operation.requestBody.content)) {
          if (contentType.schema) {
            const schemaRefs = new Set<string>();
            const refs = findSchemaReferences(contentType.schema, schemaRefs);
            
            // Add to map
            if (!schemaMap[endpointKey]) schemaMap[endpointKey] = [];
            refs.forEach(ref => {
              if (!schemaMap[endpointKey].includes(ref)) {
                schemaMap[endpointKey].push(ref);
              }
            });
          }
        }
      }
    }
  }
  
  return schemaMap;
}

/**
 * Find all schema dependencies for a given set of schema names
 */
export function findAllSchemaDependencies(
  schemas: Record<string, any>,
  schemaNames: string[]
): Set<string> {
  const allDependencies = new Set<string>(schemaNames);
  const toProcess = [...schemaNames];
  const processed = new Set<string>();
  
  // Process all schemas to find their dependencies
  while (toProcess.length > 0) {
    const schemaName = toProcess.pop();
    
    if (!schemaName || processed.has(schemaName)) continue;
    processed.add(schemaName);
    
    const schema = schemas[schemaName];
    if (!schema) continue;
    
    // Find all references in this schema
    const refs = findSchemaReferences(schema);
    
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
 */
export function resolveSchemaRef(schemas: Record<string, any>, ref: string): any {
  if (!ref || typeof ref !== 'string') return null;
  
  // Extract schema name from reference
  const schemaName = getSchemaNameFromRef(ref);
  if (!schemaName) return null;
  
  // Return the schema if it exists
  return schemas[schemaName] || null;
}
