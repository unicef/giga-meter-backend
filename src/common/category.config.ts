export interface CategoryApiAccessConfig {
  allowedAPIs: ApiEndpoint[] | null;
  notAllowedAPIs: ApiEndpoint[] | null;
  responseFilters: ResponseFilters;
  swagger: SwaggerConfig;
}

export interface ApiEndpoint {
  url: string;
  methods: string[];
}

export interface ResponseFilters {
  include?: string[]; // Fields to include (if specified, all other fields are excluded)
  exclude?: string[]; // Fields to exclude (if include is not specified)
  endpoints?: {
    [path: string]: {
      include?: string[];  // Path-specific fields to include
      exclude?: string[];  // Path-specific fields to exclude
    }
  };
}

export interface SwaggerConfig {
  visible: boolean; // Whether this category's Swagger docs should be available
  title?: string; // Custom title for this category's Swagger docs
  description?: string; // Custom description for this category's Swagger docs
}

export interface CategoryConfig {
  [key: string]: CategoryApiAccessConfig;
}

// List of all supported categories
export const CATEGORIES = ['public', 'gov', 'admin'];

// Default category to use when none is specified
export const DEFAULT_CATEGORY = 'public';

// Default configuration for categories
export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  public: {
    allowedAPIs: [
      { url: '/api/v1/dailycheckapp_schools', methods: ['GET'] },
      { url: '/api/v1/dailycheckapp_countries', methods: ['GET'] },
      { url: '/api/v1/measurements', methods: ['GET'] },
    ],
    notAllowedAPIs: null,
    responseFilters: {
      // Global exclusions for all endpoints in this category
      exclude: ['BrowserID', 'IP', 'deviceId', 'ServerInfo'],
      // Endpoint-specific filters
      endpoints: {
        '/api/v1/dailycheckapp_schools': {
          exclude: ['giga_id_school'],
        }
      }
    },
    swagger: {
      visible: true,
      title: 'Daily Check App API',
      description: 'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
        '<b>License</b>: The dataset accessed through this API is made available under the <a target="_blank" href="https://opendatacommons.org/licenses/odbl/1-0/">Open Data Commons Open Database License (ODbL)</a>. You are free to copy, distribute, transmit and adapt our data, as long as you credit Giga and its contributors. If you alter or build upon our data, you may distribute the result only under the same license. The full legal code explains your rights and responsibilities.'
    }
  },
  gov: {
    allowedAPIs: null,
    // notAllowedAPIs: null,
    notAllowedAPIs: [
      {
        url: '/api/v1/measurements*',
        methods: ['GET']
      },
      {
        url: '/api/v1/schools/features_flags/{giga_id_school}',
        methods: ['PUT']
      },
      {
        url: '/api/v1/dailycheckapp_schools*',
        methods: ['GET']
      },
      {
        url: '/api/v1/dailycheckapp_countries*',
        methods: ['DELETE', 'GET']
      },
      {
        url: '/api/v1/flagged_dailycheckapp_schools*',
        methods: ['POST', 'GET']
      }
   ],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: ['IP', 'BrowserID', 'ServerInfo'],
      
      // Endpoint-specific filters with nested paths
      endpoints: {
        '/api/v1/measurements': {
          exclude: ['IP', 'BrowserID', 'deviceId']
        },
        '/api/v1/dailycheckapp_schools': {
          exclude: []
        }
      }
    },
    swagger: {
      visible: true,
      title: 'Daily Check App Government API',
      description: 'Government access API endpoints for GIGA Meter data'
    }
  },
  admin: {
    // Admin has access to everything
    allowedAPIs: null,
    notAllowedAPIs: null,
    responseFilters: {
      // Admin sees all fields by default
      exclude: [],
      
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {
      }
    },
    swagger: {
      visible: true,
      title: 'GIGA Meter Admin API',
      description: 'Complete API documentation with admin access'
    }
  }
};

// This allows the configuration to be overridden by environment variables or another source
export let CATEGORY_CONFIG = DEFAULT_CATEGORY_CONFIG;

export const updateCategoryConfig = (newConfig: CategoryConfig) => {
  CATEGORY_CONFIG = newConfig;
};

/**
 * Helper function to check if a given category has access to a specific API endpoint
 */
export const hasApiAccess = (category: string, path: string, method: string): boolean => {
  // If category doesn't exist in config, deny access
  if (!CATEGORY_CONFIG[category]) {
    return false;
  }

  const categoryConfig = CATEGORY_CONFIG[category];
  
  // Get the isAdmin status from the config, not hardcoded
  const isAllAccessCategory = categoryConfig.allowedAPIs === null && 
                            categoryConfig.notAllowedAPIs === null;
  
  // If this is an all-access category (like admin), grant access
  if (isAllAccessCategory) {
    return true;
  }
  
  // If notAllowedAPIs is specified, check if this path/method is blocked
  if (categoryConfig.notAllowedAPIs) {
    const isBlocked = categoryConfig.notAllowedAPIs.some(
      api => pathMatches(path, api.url) && api.methods.includes(method)
    );
    
    if (isBlocked) {
      return false;
    }
  }
  
  // If allowedAPIs is null, all endpoints are allowed
  if (categoryConfig.allowedAPIs === null) {
    return true;
  }
  
  // Check if the path and method are in the allowed list
  return categoryConfig.allowedAPIs.some(
    api => pathMatches(path, api.url) && api.methods.includes(method)
  );
};

/**
 * Helper function to determine if a path matches a pattern
 * Supports exact matches and wildcard patterns like '/api/v1/*'
 */
const pathMatches = (path: string, pattern: string): boolean => {
  // Exact match
  console.log(path, pattern, '---pattern match');
  if (path === pattern) {
    return true;
  }

  // Pattern with wildcard at end
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }

  return false;
  // Check if the path starts with the pattern

  // return path.startsWith(`${pattern}/`);
};
