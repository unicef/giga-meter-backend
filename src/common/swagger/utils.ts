/**
 * Check if a Swagger path matches a configuration pattern
 */
export function pathMatchesPattern(swaggerPath: string, configPattern: string): boolean {
    // Exact match
    if (swaggerPath === configPattern || swaggerPath === `${configPattern}/`) {
      return true;
    }
  
    // Pattern with wildcard at end
    if (configPattern.endsWith('*')) {
      const prefix = configPattern.slice(0, -1);
      return swaggerPath.startsWith(prefix);
    }
  
    // Swagger paths often include parameters like /api/users/{id}
    // Check if the base path matches (ignoring parameters)
    // const swaggerBasePath = swaggerPath.split('{')[0].replace(/\/$/, '');
    // const configBasePath = configPattern.replace(/\/$/, '');
    
    // if (swaggerBasePath === configBasePath) {
    //   return true;
    // }
  
    return false;
    // Check if the Swagger path starts with the config pattern
    //return swaggerPath.startsWith(`${configPattern}/`);
}

/**
 * Extract schema name from a reference
 */
export function getSchemaNameFromRef(ref: string): string | null {
  if (!ref) return null;
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

/**
 * Find all schema references in a schema or sub-schema
 */
export function findSchemaReferences(schema: any, refs: Set<string> = new Set()): Set<string> {
  if (!schema) return refs;
  
  // Handle direct references
  if (schema.$ref) {
    const schemaName = getSchemaNameFromRef(schema.$ref);
    if (schemaName) refs.add(schemaName);
    return refs;
  }
  
  // Recursively process object properties
  if (typeof schema === 'object') {
    // Process arrays
    if (Array.isArray(schema)) {
      schema.forEach(item => findSchemaReferences(item, refs));
      return refs;
    }
    
    // Process object properties
    for (const key in schema) {
      // Skip properties that usually don't contain schema references
      if (['description', 'type', 'format', 'example', 'title', 'nullable'].includes(key)) {
        continue;
      }
      
      // Special handling for allOf, oneOf, anyOf
      if (['allOf', 'oneOf', 'anyOf'].includes(key) && Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => findSchemaReferences(item, refs));
        continue;
      }
      
      // Recursive call for all other properties
      findSchemaReferences(schema[key], refs);
    }
  }
  
  return refs;
}

/**
 * Check if a schema is referenced by other schemas
 */
export function isSchemaReferenced(schemaName: string, schemas: any, endpointSchemaMap: any): boolean {
  // Check if the schema is directly used by any endpoint
  for (const [_, usedSchemas] of Object.entries(endpointSchemaMap)) {
    if (Array.isArray(usedSchemas) && usedSchemas.includes(schemaName)) {
      return true;
    }
  }
  
  // Check if the schema is referenced by other schemas
  for (const [otherSchemaName, otherSchema] of Object.entries(schemas)) {
    if (otherSchemaName === schemaName) continue; // Skip self
    
    const refs = findSchemaReferences(otherSchema);
    if (refs.has(schemaName)) return true;
  }
  
  return false;
}
