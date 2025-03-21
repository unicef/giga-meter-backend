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
