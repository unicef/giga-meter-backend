import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CategoryConfigProvider } from './category-config.provider';

@Injectable()
export class CategoryResponseInterceptor implements NestInterceptor {
  constructor(private categoryConfigProvider: CategoryConfigProvider) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      map(async (response) => {
        const category = request.category || await this.categoryConfigProvider.getDefaultCategory();
        const path = request.route?.path || request.path;
        // If data is null or undefined, return as is
        if (response === null || response === undefined) {
          return response;
        }
        const data = response?.data;
        // If data is an array, filter each object
        if (Array.isArray(data)) {
          response.data = await Promise.all(data.map(item => this.filterObjectByCategory(item, category, path)));
          return response;
        }
        
        // If data is an object, filter its properties
        if (typeof data === 'object') {
          response.data = this.filterObjectByCategory(data, category, path);
          return response;
        }

        // If data is a primitive value, return as is
        return response;
      }),
    );
  }

  private async filterObjectByCategory(obj: any, category: string, path: string): Promise<any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Get the response filters for this category and endpoint
    const responseFilters = await this.getResponseFilters(category, path);
    
    // Create a new object with filtered fields
    const result = { ...obj };
    
    // Apply category-specific field filtering
    if (responseFilters.include && responseFilters.include.length > 0) {
      // Process includes (whitelist approach)
      this.applyIncludeFilters(result, responseFilters.include);
    } else if (responseFilters.exclude && responseFilters.exclude.length > 0) {
      // Process excludes (blacklist approach)
      this.applyExcludeFilters(result, responseFilters.exclude);
    }
    
    return result;
  }

  /**
   * Apply include filters to keep only the specified fields
   * Supports nested paths with dot notation and array notation
   */
  private applyIncludeFilters(obj: any, includes: string[]): void {
    // First collect all top-level properties to include
    const topLevelProperties = new Set<string>();
    const nestedProperties = new Map<string, string[]>();
    
    // Analyze include paths
    includes.forEach(path => {
      if (path.includes('.') || path.includes('[]')) {
        // This is a nested path
        const topLevel = path.split('.')[0].replace('[]', '');
        topLevelProperties.add(topLevel);
        
        // Store full path for later processing
        const existingPaths = nestedProperties.get(topLevel) || [];
        existingPaths.push(path);
        nestedProperties.set(topLevel, existingPaths);
      } else {
        // This is a top-level property
        topLevelProperties.add(path);
      }
    });
    
    // Remove all properties that are not in the include list
    Object.keys(obj).forEach(key => {
      if (!topLevelProperties.has(key)) {
        delete obj[key];
      }
    });
    
    // Process nested properties
    nestedProperties.forEach((paths, topLevel) => {
      if (obj[topLevel]) {
        if (Array.isArray(obj[topLevel])) {
          // For arrays, filter each item
          obj[topLevel] = obj[topLevel].map(item => {
            if (typeof item === 'object' && item !== null) {
              // Create a new include list for the nested object, removing the prefix
              const nestedIncludes = paths.map(p => {
                // Convert 'array[].prop.subprop' to 'prop.subprop'
                if (p.startsWith(`${topLevel}[].`)) {
                  return p.substring(topLevel.length + 3);
                }
                // Convert 'array.prop.subprop' to 'prop.subprop'
                else if (p.startsWith(`${topLevel}.`)) {
                  return p.substring(topLevel.length + 1);
                }
                return p;
              });

              const result = { ...item };
              this.applyIncludeFilters(result, nestedIncludes);
              return result;
            }
            return item;
          });
        } else if (typeof obj[topLevel] === 'object' && obj[topLevel] !== null) {
          // For objects, filter the properties
          const nestedIncludes = paths.map(p => {
            if (p.startsWith(`${topLevel}.`)) {
              return p.substring(topLevel.length + 1);
            }
            return p;
          });
          
          this.applyIncludeFilters(obj[topLevel], nestedIncludes);
        }
      }
    });
  }

  /**
   * Apply exclude filters to remove the specified fields
   * Supports nested paths with dot notation and array notation
   */
  private applyExcludeFilters(obj: any, excludes: string[]): void {
    // Group excludes by their top-level property
    const topLevelExcludes = new Set<string>();
    const nestedExcludes = new Map<string, string[]>();
    
    // Analyze exclude paths
    excludes.forEach(path => {
      if (path.includes('.') || path.includes('[]')) {
        // This is a nested path
        const topLevel = path.split('.')[0].replace('[]', '');
        
        // Store full path for later processing
        const existingPaths = nestedExcludes.get(topLevel) || [];
        existingPaths.push(path);
        nestedExcludes.set(topLevel, existingPaths);
      } else {
        // This is a top-level property
        topLevelExcludes.add(path);
      }
    });
    
    // Remove top-level excluded properties
    topLevelExcludes.forEach(key => {
      delete obj[key];
    });
    
    // Process nested properties
    nestedExcludes.forEach((paths, topLevel) => {
      if (obj[topLevel]) {
        if (Array.isArray(obj[topLevel])) {
          // For arrays, filter each item
          obj[topLevel] = obj[topLevel].map(item => {
            if (typeof item === 'object' && item !== null) {
              // Create a new exclude list for the nested object, removing the prefix
              const nestedExcludes = paths.map(p => {
                // Convert 'array[].prop.subprop' to 'prop.subprop'
                if (p.startsWith(`${topLevel}[].`)) {
                  return p.substring(topLevel.length + 3);
                }
                // Convert 'array.prop.subprop' to 'prop.subprop'
                else if (p.startsWith(`${topLevel}.`)) {
                  return p.substring(topLevel.length + 1);
                }
                return p;
              });
              
              const result = { ...item };
              this.applyExcludeFilters(result, nestedExcludes);
              return result;
            }
            return item;
          });
        } else if (typeof obj[topLevel] === 'object' && obj[topLevel] !== null) {
          // For objects, filter the properties
          const nestedExcludes = paths.map(p => {
            if (p.startsWith(`${topLevel}.`)) {
              return p.substring(topLevel.length + 1);
            }
            return p;
          });
          
          this.applyExcludeFilters(obj[topLevel], nestedExcludes);
        }
      }
    });
  }

  /**
   * Get response filters for a specific category and endpoint
   */
  private async getResponseFilters(category: string, path: string): Promise<any> {
    const config = await this.categoryConfigProvider.getCategoryConfig(category);
    
    if (!config || !config.responseFilters) {
      return { include: [], exclude: [] };
    }
    const globalExclude = config.responseFilters.exclude || [];
    // Find the most specific filter for this path
    const pathFilter = Array.isArray(config.responseFilters) ? 
      config.responseFilters.find((filter: any) => {
        if (filter.path === '*') {
          return true; // Fallback filter
        }
        
        // Convert the filter path to a regex pattern
        const pattern = filter.path
          .replace(/\//g, '\\/') // Escape forward slashes
          .replace(/\{[^}]+\}/g, '[^/]+') // Replace {param} with regex for any character except /
          .replace(/\*/g, '.*'); // Replace * with regex for any character
        
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(path);
      }) : null;
    
    if (pathFilter) {
      return {
        include: pathFilter.include || [],
        exclude: [...globalExclude, ...pathFilter.exclude],
      };
    }
    
    return { include: [], exclude: [...globalExclude] };
  }
}
