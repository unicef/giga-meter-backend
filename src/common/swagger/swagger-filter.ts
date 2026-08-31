import { OpenAPIObject } from '@nestjs/swagger';
import { pathMatchesPattern, isSchemaReferenced } from './utils';
import { buildEndpointSchemaMap, findAllSchemaDependencies } from './schema-mapper';
import { filterSchemaProperties } from './schema-filter';
import { CategoryConfig } from '@prisma/client';
import { CategoryConfigType } from '../category.config';

/**
 * Filters the Swagger documentation based on the specified category config
 */
export function filterSwaggerDocByCategory(
  document: OpenAPIObject,
  categoryConfig: CategoryConfigType,
): OpenAPIObject {

  // If category doesn't exist in config, return original document
  if (!categoryConfig) {
    return document;
  }

  // Check if swagger should be visible for this category
  if (!categoryConfig.swagger.visible) {
    return { ...document, paths: {} }; // Return empty paths if not visible
  }
  
  // Create a deep copy of the document
  const filteredDocument = JSON.parse(JSON.stringify(document));
  
  // Update the info swagger info if provided
  filteredDocument.info = {
    ...document.info,
    title: categoryConfig.swagger.title || document.info.title,
    description: categoryConfig.swagger.description || document.info.description
  };
  
  // If category has full access, return full document
  const hasFullAccess = !categoryConfig.allowedAPIs?.length && 
                        !categoryConfig.notAllowedAPIs?.length;
  
  if (hasFullAccess) {
    return filteredDocument;
  }
  
  // Create a copy of the paths to modify
  filteredDocument.paths = { ...document.paths };
  
  // If allowedAPIs is specified, only include those paths
  if (categoryConfig.allowedAPIs?.length) {
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
          
          const isAllowAllMethod = allowedApi.methods.includes('*');
          // Filter methods for this path
          if(!isAllowAllMethod) {
            httpMethods.forEach(method => {
              if (pathObj[method] && !allowedApi.methods.includes(method.toUpperCase())) {
                delete pathObj[method];
              }
            });
          }
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
  if (filteredDocument.components && filteredDocument.components.schemas) {
    // Build a map of which schemas are used by which endpoints
    const endpointSchemaMap = buildEndpointSchemaMap(filteredDocument);
    
    // Create a set of allowed schemas for this category
    const allowedSchemas = new Set<string>();
    
    // Add all schemas used by allowed endpoints
    Object.entries(endpointSchemaMap).forEach(([endpoint, schemas]) => {
      const [path, method] = endpoint.split(':');
      
      // Check if this endpoint's path and method are allowed for this category
      let isAllowed = true; // Default to allowed when using notAllowedAPIs
      
      if (categoryConfig.allowedAPIs?.length) {
        // When allowedAPIs is specified, only include listed endpoints
        isAllowed = false;
        for (const api of categoryConfig.allowedAPIs) {
          if (pathMatchesPattern(path, api.url) && 
              (!api.methods || api.methods.includes(method) || api.methods.includes('*'))) {
            isAllowed = true;
            break;
          }
        }
      } else if (categoryConfig.notAllowedAPIs?.length) {
        // When notAllowedAPIs is specified, exclude listed endpoints
        for (const api of categoryConfig.notAllowedAPIs) {
          if (pathMatchesPattern(path, api.url) && 
              (!api.methods || api.methods.includes(method) || api.methods.includes('*'))) {
            isAllowed = false;
            break;
          }
        }
      }
      
      // If this endpoint is allowed, add its schemas to the allowed set
      if (isAllowed) {
        schemas.forEach(schema => allowedSchemas.add(schema));
      }
    });
    
    // Find all nested schema dependencies
    const allRequiredSchemas = findAllSchemaDependencies(
      filteredDocument.components.schemas,
      Array.from(allowedSchemas)
    );
    
    // Get exclude and include lists from response filters
    const globalExcludes = categoryConfig.responseFilters?.exclude || [] as string[];
    const globalIncludes = categoryConfig.responseFilters?.include || [] as string[];
    
    // Filter out schemas that aren't used by allowed endpoints
    const schemasToKeep = {};
    
    // Keep track of all removed schema references
    const allRemovedSchemaRefs = new Set<string>();
    
    // Map of path to endpoint-specific exclusion rules
    const endpointExclusions = categoryConfig.responseFilters?.endpoints || {};
    // Only keep schemas that are in the allowed schemas set
    Object.keys(filteredDocument.components.schemas).forEach(schemaName => {
      if (allRequiredSchemas.has(schemaName)) {
        const schema = filteredDocument.components.schemas[schemaName];
        
        // Add the schema to the list of schemas to keep
        schemasToKeep[schemaName] = schema;
        
        // If the schema has properties, filter them based on the exclusion rules
        if (schema.properties) {
          // Find all endpoints that use this schema
          const usedByEndpoints = Object.entries(endpointSchemaMap)
            .filter(([_, schemas]) => schemas.includes(schemaName))
            .map(([endpoint]) => endpoint.split(':')[0]); // Extract just the path part
          
          // Collect all endpoint-specific rules that apply to this schema
          const endpointSpecificExcludes = [];
          const endpointSpecificIncludes = [];
          usedByEndpoints.forEach(path => {
            if (endpointExclusions[path]) {
              if (endpointExclusions[path].exclude) {
                endpointSpecificExcludes.push(...endpointExclusions[path].exclude);
              }
              if (endpointExclusions[path].include) {
                endpointSpecificIncludes.push(...endpointExclusions[path].include);
              }
            }
          });

          // Apply the property filtering
          const removedSchemaRefs = filterSchemaProperties(
            schema, 
            globalExcludes, 
            globalIncludes,
            endpointSpecificExcludes,
            endpointSpecificIncludes,
            filteredDocument.components.schemas
          );
          
          // Add removed schema references to the list of schemas to be checked
          if (removedSchemaRefs.size > 0) {
            removedSchemaRefs.forEach(ref => allRemovedSchemaRefs.add(ref));
          }
        }
      }
    });
    
    // Replace the schemas with the filtered set
    filteredDocument.components.schemas = schemasToKeep;
    
    // Remove any schemas that were explicitly excluded or aren't referenced anymore
    // We need to do this iteratively until no more schemas are removed
    let schemasRemoved = true;
    while (schemasRemoved) {
      schemasRemoved = false;
      
      // Check each schema to see if it's in the exclusion list or not referenced
      Object.keys(filteredDocument.components.schemas).forEach(schemaName => {
        // If the schema name is in the global exclusion list, remove it
        if (Array.isArray(globalExcludes) && globalExcludes.includes(schemaName)) {
          delete filteredDocument.components.schemas[schemaName];
          schemasRemoved = true;
          return;
        }
        
        // If the schema was referenced by a property that was removed, check if it's still needed
        if (allRemovedSchemaRefs.has(schemaName)) {
          if (!isSchemaReferenced(schemaName, filteredDocument.components.schemas, endpointSchemaMap)) {
            delete filteredDocument.components.schemas[schemaName];
            schemasRemoved = true;
          }
        } else {
          const isReferenced = isSchemaReferenced(
            schemaName, 
            filteredDocument.components.schemas, 
            endpointSchemaMap
          );
          
          if (!isReferenced) {
            delete filteredDocument.components.schemas[schemaName];
            schemasRemoved = true;
          }
        }
      });
    }
  }
  return filteredDocument;
}
