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

export type CategoryConfigType = Pick<CategoryConfig, 'id' | 'name' | 'isDefault' | 'createdAt' | 'updatedAt'> & { swagger: CategorySwaggerConfig, allowedAPIs: CategoryApiEndpoint[], notAllowedAPIs: CategoryApiEndpoint[], responseFilters: CategoryResponseFilters, allowedCountries: string[] }

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
      exclude: ['ip_address', 'school_id'],
      endpoints: {}
    },
    allowedCountries: [],
    swagger: {
      visible: true
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
      exclude: ['ip_address', 'school_id'],
      endpoints: {}
    },
    allowedCountries: ['BR'],
      swagger: {
      visible: true
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
    notAllowedAPIs: [{
      // category, contact, delete api
      url: '/api/v1/category-config*',
      methods: ['*']
    }, {
      url: '/api/v1/messages*',
      methods: ['*']
    }, {
      url: '/api/v1/*',
      methods: ['DELETE']
    }],
    responseFilters: {
      // giga_meter sees all fields by default
      exclude: [],
      
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {}
    },
    allowedCountries: [],
    swagger: {
      visible: true
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
    allowedCountries: [],
    swagger:{
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    name: 'admin',
    isDefault: false,
    allowedAPIs: [],
    notAllowedAPIs: [],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: [],
      
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {
      }
    },
    allowedCountries: [],
    swagger:{
      visible: true
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