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

export enum Category {
  PUBLIC = 'PUBLIC',
  GOV = 'GOV',
  GIGA_METER = 'GIGA_METER',
  GIGA_APPS = 'GIGA_APPS',
  ADMIN = 'ADMIN',
}

// Default configuration for categories
export const DEFAULT_CATEGORY_CONFIG: CategoryConfigType[] = [
  {
    id: 1,
    name: Category.PUBLIC,
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
    swagger: {
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: Category.GOV,
    isDefault: false,
    allowedAPIs: [
      { url: '/api/v1/dailycheckapp_schools', methods: ['GET'] },
      { url: '/api/v1/dailycheckapp_countries', methods: ['GET'] },
      { url: '/api/v1/measurements', methods: ['GET'] },
    ],
    notAllowedAPIs: [],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: ['ip_address', 'school_id'],
      include: [],
      endpoints: {}
    },
    swagger: {
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: Category.GIGA_METER,
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
      include: [],
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {}
    },
    swagger: {
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    name: Category.GIGA_APPS,
    isDefault: false,
    allowedAPIs: [
      { url: '/api/v1/dailycheckapp_schools', methods: ['GET'] },
      { url: '/api/v1/dailycheckapp_countries', methods: ['GET'] },
      { url: '/api/v1/measurements', methods: ['GET'] },
    ],
    notAllowedAPIs: [],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: [],
      include: [],
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {}
    },
    swagger:{
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    name: Category.ADMIN,
    isDefault: false,
    allowedAPIs: [],
    notAllowedAPIs: [],
    responseFilters: {
      // Global exclusions for all endpoints
      exclude: [],
      include: [],
      // But can still have some endpoint-specific exclusions if needed
      endpoints: {
      }
    },
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
export const DEFAULT_CATEGORY = DEFAULT_CATEGORY_CONFIG.find(config => config.isDefault)?.name || Category.PUBLIC;

// all categories
export let CATEGORY_CONFIG = DEFAULT_CATEGORY_CONFIG;