import { CATEGORY_CONFIG, CATEGORIES } from './category.config';
import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Filters the Swagger documentation based on the specified category
 * @param document The Swagger document to filter
 * @param category The category to filter by (public, gov, admin, etc.)
 * @returns Filtered Swagger document
 */
export function filterSwaggerDocByCategory(
  document: OpenAPIObject,
  category: string,
): OpenAPIObject {
  // If category doesn't exist in config, return original document
  if (!CATEGORY_CONFIG[category]) {
    return document;
  }

  const categoryConfig = CATEGORY_CONFIG[category];
  
  // Check if swagger should be visible for this category
  if (!categoryConfig.swagger.visible) {
    return { ...document, paths: {} }; // Return empty paths if not visible
  }
  
  // Create a copy of the document to modify
  const filteredDocument = { 
    ...document,
    // If the category has custom swagger title/description, apply it
    info: {
      ...document.info,
      title: categoryConfig.swagger.title || document.info.title,
      description: categoryConfig.swagger.description || document.info.description
    }
  };
  
  // If category has full access (no API restrictions), return full document with potentially updated info
  const hasFullAccess = categoryConfig.allowedAPIs === null && 
                       categoryConfig.notAllowedAPIs === null;
  
  if (hasFullAccess) {
    return filteredDocument;
  }
  
  // Create a copy of the paths to modify
  filteredDocument.paths = { ...document.paths };
  
  // If allowedAPIs is specified, only include those paths
  if (categoryConfig.allowedAPIs) {
    // Get patterns of paths that should be kept
    const allowedUrlPatterns = categoryConfig.allowedAPIs.map(api => api.url);
    
    // Filter out paths that aren't in the allowed list
    Object.keys(filteredDocument.paths).forEach(path => {
      // Check if any allowed pattern matches this path
      const matchingPattern = allowedUrlPatterns.find(pattern => 
        pathMatchesPattern(path, pattern));
      
      // If path is not allowed, remove it
      if (!matchingPattern) {
        delete filteredDocument.paths[path];
      } else {
        // Filter out methods that aren't allowed for this path
        const allowedApi = categoryConfig.allowedAPIs?.find(api => 
          api.url === matchingPattern);
          
        if (allowedApi) {
          const pathObj = filteredDocument.paths[path];
          
          // HTTP methods in lowercase as used in OpenAPI spec
          const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
          
          // Filter methods for this path
          httpMethods.forEach(method => {
            if (pathObj[method] && !allowedApi.methods.includes(method.toUpperCase())) {
              delete pathObj[method];
            }
          });
          
          // If no methods left, remove the entire path
          if (Object.keys(pathObj).filter(key => httpMethods.includes(key)).length === 0) {
            delete filteredDocument.paths[path];
          }
        }
      }
    });
  }
  
  // If notAllowedAPIs is specified, remove those paths/methods
  if (categoryConfig.notAllowedAPIs) {
    categoryConfig.notAllowedAPIs.forEach(api => {
      // Find matching paths
      Object.keys(filteredDocument.paths).forEach(path => {
        if (pathMatchesPattern(path, api.url)) {
          // If all methods should be blocked, remove the entire path
          if (api.methods.includes('*')) {
            delete filteredDocument.paths[path];
          } else {
            // Remove only specific methods
            const pathObj = filteredDocument.paths[path];
            api.methods.forEach(method => {
              delete pathObj[method.toLowerCase()];
            });
            
            // If no methods left, remove the entire path
            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            if (Object.keys(pathObj).filter(key => httpMethods.includes(key)).length === 0) {
              delete filteredDocument.paths[path];
            }
          }
        }
      });
    });
  }
  
  // Filter out schemas that should not be visible to this category
  // This is useful for hiding models that contain sensitive fields
  if (filteredDocument.components && filteredDocument.components.schemas) {
    // TODO: If needed, add logic to filter out specific schemas based on category
    // This would be determined by which endpoints use which schemas
  }
  
  return filteredDocument;
}

/**
 * Helper function to determine if a Swagger path matches a category config pattern
 */
function pathMatchesPattern(swaggerPath: string, configPattern: string): boolean {
  // Exact match
  if (swaggerPath === configPattern) {
    return true;
  }

  // If the Swagger path is exactly the pattern with trailing slash
  if (swaggerPath === `${configPattern}/`) {
    return true;
  }

  // Pattern with wildcard at end
  if (configPattern.endsWith('*')) {
    const prefix = configPattern.slice(0, -1);
    return swaggerPath.startsWith(prefix);
  }

  // Swagger paths often include parameters like /api/users/{id}
  // Check if the base path matches (ignoring parameters)
  const swaggerBasePath = swaggerPath.split('{')[0].replace(/\/$/, '');
  const configBasePath = configPattern.replace(/\/$/, '');
  
  if (swaggerBasePath === configBasePath) {
    return true;
  }

  // Check if the Swagger path starts with the config pattern
  return swaggerPath.startsWith(`${configPattern}/`);
}
