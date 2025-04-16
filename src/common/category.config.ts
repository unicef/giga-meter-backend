import { CategoryConfig } from "@prisma/client";

export interface CategoryApiEndpoint {
  url: string;
  methods: string[];
}

export interface CategoryResponseFilters {
  include?: string[]; // Fields to include (if specified, all other fields are excluded)
  exclude?: string[]; // Fields to exclude (if include is not specified)
  endpoints?: {
    [path: string]: {
      include?: string[];  // Path-specific fields to include
      exclude?: string[];  // Path-specific fields to exclude
    }
  };
}

export interface CategorySwaggerConfig {
  visible: boolean; // Whether this category's Swagger docs should be available
  title?: string; // Custom title for this category's Swagger docs
  description?: string; // Custom description for this category's Swagger docs
}

export type CategoryConfigType = Pick<CategoryConfig, 'id' | 'name' | 'isDefault' | 'createdAt' | 'updatedAt'> & { swagger: CategorySwaggerConfig, allowedAPIs: CategoryApiEndpoint[], notAllowedAPIs: CategoryApiEndpoint[], responseFilters: CategoryResponseFilters }

// Default configuration for categories
export const DEFAULT_CATEGORY_CONFIG: CategoryConfigType[] = [
  {
    id: 1,
    name: 'public',
    isDefault: true,
    allowedAPIs: [
      { url: '/api/v1/dailycheckapp_schools', methods: ['GET'] },
      { url: '/api/v1/dailycheckapp_countries', methods: ['GET'] },
      { url: '/api/v1/measurements', methods: ['GET'] },
    ],
    notAllowedAPIs: [],
    responseFilters: {
      // Global exclusions for all endpoints in this category
      exclude: ['IP', 'ClientInfo.ISP', 'ClientInfo.Hostname', 'ClientInfo.Region', 'BrowserID', 'ServerInfo'],
      // Endpoint-specific filters
      endpoints: {
        '/api/v1/measurements': {
          exclude: ['annotation', 'ip_address'],
        }
      }
    },
    swagger: {
      visible: true,
      title: 'Giga Meter API',
      description: 'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
        '<b>License</b>: The dataset accessed through this API is made available under the <a target="_blank" href="https://opendatacommons.org/licenses/odbl/1-0/">Open Data Commons Open Database License (ODbL)</a>. You are free to copy, distribute, transmit and adapt our data, as long as you credit Giga and its contributors. If you alter or build upon our data, you may distribute the result only under the same license. The full legal code explains your rights and responsibilities.'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: 'gov',
    isDefault: false,
    allowedAPIs: [],
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
      title: 'Giga Meter Government API',
      description: 'Government access API endpoints for GIGA Meter data'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: 'giga_meter',
    isDefault: false,
    // giga_meter has access to everything
    allowedAPIs: [],
    notAllowedAPIs: [
      
  ],
    responseFilters: {
      // giga_meter sees all fields by default
      exclude: [],
      
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {
      }
    },
    swagger: {
      visible: true,
      title: 'GIGA Meter API',
      description: 'API documentation for GIGA Meter'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    name: 'giga_apps',
    isDefault: false,
    allowedAPIs: [],
    notAllowedAPIs: [{
      url: '/api/v1/category-config*',
      methods: ['*']
    }],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: [],
      
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {
      }
    },
    swagger: {
      visible: true,
      title: 'Giga Meter Apps APIs',
      description: 'API documentation for GIGA Apps'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// // List of all supported categories
export const CATEGORIES = DEFAULT_CATEGORY_CONFIG.map(config => config.name);

// // Default category to use when none is specified
export const DEFAULT_CATEGORY = DEFAULT_CATEGORY_CONFIG.find(config => config.isDefault)?.name || CATEGORIES[0];

// all categories
export let CATEGORY_CONFIG = DEFAULT_CATEGORY_CONFIG;