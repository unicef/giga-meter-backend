import { resolveSchemaRef } from './schema-mapper';

/**
 * Filters schema properties based on inclusion and exclusion rules
 * @param schema The schema to filter
 * @param excludeRules Array of exclusion rules
 * @param includeRules Array of inclusion rules (prioritized over exclude)
 * @param endpointExcludeRules Endpoint-specific exclusion rules
 * @param endpointIncludeRules Endpoint-specific inclusion rules
 * @param allSchemas All schemas for resolving references
 */
export function filterSchemaProperties(
  schema: any, 
  excludeRules: string[] = [],
  includeRules: string[] = [],
  endpointExcludeRules: string[] = [],
  endpointIncludeRules: string[] = [],
  allSchemas: Record<string, any> = {}
): Set<string> {
  if (!schema || !schema.properties) return new Set<string>();
  
  // Keep track of all removed schemas
  const removedSchemaRefs = new Set<string>();
  
  // Helper function to get schema name from reference
  const getSchemaNameFromRef = (ref: string): string | null => {
    if (ref && typeof ref === 'string') {
      const parts = ref.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };
  
  // Combine global and endpoint-specific rules
  const combinedExcludeRules = [...excludeRules, ...endpointExcludeRules];
  const combinedIncludeRules = [...includeRules, ...endpointIncludeRules];
  
  // If include rules are specified, they take precedence over exclude rules
  if (combinedIncludeRules.length > 0) {
    // First, convert include rules into a set of property paths
    const includePaths = new Set<string>();
    
    // Process direct properties and nested properties
    combinedIncludeRules.forEach(rule => {
      if (!rule.includes('.') && !rule.includes('[')) {
        // Simple property
        includePaths.add(rule);
      } else {
        // For nested properties, include the top-level property
        if (rule.includes('.')) {
          includePaths.add(rule.split('.')[0]);
        } else if (rule.includes('[')) {
          includePaths.add(rule.split('[')[0]);
        }
      }
    });
    
    // Check properties against the include list
    const propertiesToKeep = {};
    
    Object.keys(schema.properties).forEach(propName => {
      if (includePaths.has(propName)) {
        propertiesToKeep[propName] = schema.properties[propName];
        
        // Handle nested includes for this property
        const nestedIncludes = combinedIncludeRules
          .filter(rule => rule.startsWith(`${propName}.`) || rule.startsWith(`${propName}[`));
        
        if (nestedIncludes.length > 0 && 
            (schema.properties[propName].properties || 
             (schema.properties[propName].type === 'array' && schema.properties[propName].items))) {
          
          // If it's an object with properties
          if (schema.properties[propName].properties) {
            const nestedSchema = schema.properties[propName];
            
            // Process nested includes
            const strippedRules = nestedIncludes.map(rule => {
              const parts = rule.split('.');
              return parts.slice(1).join('.');
            });
            
            // Keep track of which nested properties to include
            const nestedIncludePaths = new Set<string>();
            strippedRules.forEach(rule => {
              if (!rule.includes('.')) {
                nestedIncludePaths.add(rule);
              }
            });
            
            // Filter nested properties
            if (nestedIncludePaths.size > 0) {
              const nestedPropertiesToKeep = {};
              Object.keys(nestedSchema.properties).forEach(nestedProp => {
                if (nestedIncludePaths.has(nestedProp)) {
                  nestedPropertiesToKeep[nestedProp] = nestedSchema.properties[nestedProp];
                }
              });
              nestedSchema.properties = nestedPropertiesToKeep;
            }
          }
          // If it's an array with items
          else if (schema.properties[propName].type === 'array' && schema.properties[propName].items) {
            const arraySchema = schema.properties[propName];
            
            // Extract item property names from array include rules
            const itemProps = new Set<string>();
            nestedIncludes.forEach(rule => {
              const match = rule.match(/\[\]\.(.+)/);
              if (match && match[1]) {
                itemProps.add(match[1].split('.')[0]);
              }
            });
            
            // Filter array item properties
            if (itemProps.size > 0 && arraySchema.items.properties) {
              const itemPropertiesToKeep = {};
              Object.keys(arraySchema.items.properties).forEach(itemProp => {
                if (itemProps.has(itemProp)) {
                  itemPropertiesToKeep[itemProp] = arraySchema.items.properties[itemProp];
                }
              });
              arraySchema.items.properties = itemPropertiesToKeep;
            }
          }
        }
      }
    });
    
    // Replace original properties with filtered ones
    schema.properties = propertiesToKeep;
  }
  // Otherwise, use exclude rules
  else if (combinedExcludeRules.length > 0) {
    // Process each exclusion rule
    combinedExcludeRules.forEach(excludeRule => {
      // Handle simple property exclusion (no dots or brackets)
      if (!excludeRule.includes('.') && !excludeRule.includes('[') && 
          schema.properties[excludeRule]) {
        
        // If the property is a reference, track it for removal
        if (schema.properties[excludeRule].$ref) {
          const refName = getSchemaNameFromRef(schema.properties[excludeRule].$ref);
          if (refName) {
            removedSchemaRefs.add(refName);
          }
        }
        
        delete schema.properties[excludeRule];
        
        // Also remove from required array if present
        if (schema.required) {
          const requiredIndex = schema.required.indexOf(excludeRule);
          if (requiredIndex !== -1) {
            schema.required.splice(requiredIndex, 1);
          }
        }
      }
      // Handle nested property exclusion (with dots)
      else if (excludeRule.includes('.')) {
        const parts = excludeRule.split('.');
        const topLevelProp = parts[0];
        
        // Check if the top-level property exists and is a nested object
        if (schema.properties[topLevelProp] && 
            (schema.properties[topLevelProp].type === 'object' || 
             schema.properties[topLevelProp].properties)) {
          // If it's a nested object with properties, recursively filter it
          if (schema.properties[topLevelProp].properties) {
            const nestedPropName = parts.slice(1).join('.');
            const nestedProps = schema.properties[topLevelProp].properties;
            
            if (parts.length === 2 && nestedProps[parts[1]]) {
              // If it's a direct child property, remove it
              // If the property is a reference, track it for removal
              if (nestedProps[parts[1]].$ref) {
                const refName = getSchemaNameFromRef(nestedProps[parts[1]].$ref);
                if (refName) {
                  removedSchemaRefs.add(refName);
                }
              }
              
              delete nestedProps[parts[1]];
              
              // Also remove from required array if present
              if (schema.properties[topLevelProp].required) {
                const requiredIndex = schema.properties[topLevelProp].required.indexOf(parts[1]);
                if (requiredIndex !== -1) {
                  schema.properties[topLevelProp].required.splice(requiredIndex, 1);
                }
              }
            }
          }
          // If it's a reference to another schema
          else if (schema.properties[topLevelProp].$ref && allSchemas) {
            const refSchema = resolveSchemaRef(
              allSchemas,
              schema.properties[topLevelProp].$ref
            );
            
            if (refSchema && parts.length === 2) {
              // Create a new schema that extends the reference
              const newSchema = { ...refSchema };
              
              // Create a new properties object without the excluded property
              if (newSchema.properties && newSchema.properties[parts[1]]) {
                // If the property is a reference, track it for removal
                if (newSchema.properties[parts[1]].$ref) {
                  const refName = getSchemaNameFromRef(newSchema.properties[parts[1]].$ref);
                  if (refName) {
                    removedSchemaRefs.add(refName);
                  }
                }
                
                newSchema.properties = { ...refSchema.properties };
                delete newSchema.properties[parts[1]];
                
                // Update the required array if present
                if (newSchema.required) {
                  const requiredIndex = newSchema.required.indexOf(parts[1]);
                  if (requiredIndex !== -1) {
                    newSchema.required = [...newSchema.required];
                    newSchema.required.splice(requiredIndex, 1);
                  }
                }
                
                // Replace the reference with the inline schema
                schema.properties[topLevelProp] = newSchema;
              }
            }
          }
        }
      }
      // Handle array property exclusion (with brackets)
      else if (excludeRule.includes('[')) {
        const arrayMatch = excludeRule.match(/^([^\[]+)\[([^\]]*)\](.*)$/);
        if (arrayMatch) {
          const [, arrayName, , rest] = arrayMatch;
          
          // Check if the array property exists
          if (schema.properties[arrayName] && 
              schema.properties[arrayName].type === 'array' && 
              schema.properties[arrayName].items) {
            
            // If there's a property after the array notation (e.g., ".deviceId")
            if (rest && rest.startsWith('.')) {
              const propName = rest.substring(1);
              const itemsSchema = schema.properties[arrayName].items;
              
              // If items is a reference, we can't modify it directly
              if (!itemsSchema.$ref && itemsSchema.properties && itemsSchema.properties[propName]) {
                // If the property is a reference, track it for removal
                if (itemsSchema.properties[propName].$ref) {
                  const refName = getSchemaNameFromRef(itemsSchema.properties[propName].$ref);
                  if (refName) {
                    removedSchemaRefs.add(refName);
                  }
                }
                
                delete itemsSchema.properties[propName];
                
                // Also remove from required array if present
                if (itemsSchema.required) {
                  const requiredIndex = itemsSchema.required.indexOf(propName);
                  if (requiredIndex !== -1) {
                    itemsSchema.required.splice(requiredIndex, 1);
                  }
                }
              }
              // If items is a reference, try to resolve it
              else if (itemsSchema.$ref && allSchemas) {
                const refSchema = resolveSchemaRef(
                  allSchemas,
                  itemsSchema.$ref
                );
                
                // We can't modify the reference directly, but we can create a new schema
                // that extends the reference but excludes the specified property
                if (refSchema && refSchema.properties && refSchema.properties[propName]) {
                  // Create a new schema that extends the reference
                  const newSchema = { ...refSchema };
                  
                  // Create a new properties object without the excluded property
                  newSchema.properties = { ...refSchema.properties };
                  
                  // If the property is a reference, track it for removal
                  if (newSchema.properties[propName].$ref) {
                    const refName = getSchemaNameFromRef(newSchema.properties[propName].$ref);
                    if (refName) {
                      removedSchemaRefs.add(refName);
                    }
                  }
                  
                  delete newSchema.properties[propName];
                  
                  // Update the required array if present
                  if (newSchema.required) {
                    const requiredIndex = newSchema.required.indexOf(propName);
                    if (requiredIndex !== -1) {
                      newSchema.required = [...newSchema.required];
                      newSchema.required.splice(requiredIndex, 1);
                    }
                  }
                  
                  // Replace the reference with the inline schema
                  schema.properties[arrayName].items = newSchema;
                }
              }
            }
          }
        }
      }
    });
  }
  
  return removedSchemaRefs;
}
