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

export enum Category {
  PUBLIC = 'PUBLIC',
  GOV = 'GOV',
  GIGA_METER = 'GIGA_METER',
  GIGA_APPS = 'GIGA_APPS',
  ADMIN = 'ADMIN',
  GIGA_METER_APP = 'GIGA_METER_APP',
}

// Category for the Giga Meter Windows app's key: the routes released versions of
// the app call (v1.0.0 to v2.0.4). Owned by code, see CODE_OWNED_CATEGORY_CONFIG.
export const GIGA_METER_APP_ALLOWED_APIS: CategoryApiEndpoint[] = [
  { url: '/api/v1/dailycheckapp_countries/{code}', methods: ['GET'] },
  { url: '/api/v1/dailycheckapp_schools', methods: ['POST'] },
  { url: '/api/v1/dailycheckapp_schools/deactivate', methods: ['PUT'] },
  { url: '/api/v1/dailycheckapp_schools/{giga_id_school}', methods: ['GET'] },
  { url: '/api/v1/dailycheckapp_schools/checkExistingInstallation/{device_hardware_id}', methods: ['GET'] },
  { url: '/api/v1/dailycheckapp_schools/checkDeviceStatus/{device_hardware_id}/{giga_id_school}', methods: ['GET'] },
  { url: '/api/v1/dailycheckapp_data_fix/{giga_id}', methods: ['GET'] },
  { url: '/api/v1/flagged_dailycheckapp_schools', methods: ['POST'] },
  { url: '/api/v1/schools/country_code_school_id/{country_code}/{school_id}', methods: ['GET'] },
  { url: '/api/v1/schools/features_flags/{giga_id_school}', methods: ['GET'] },
  { url: '/api/v1/measurements', methods: ['POST'] },
  { url: '/api/v1/measurements/multiple', methods: ['POST'] },
  { url: '/api/v1/connectivity/{giga_id_school}', methods: ['POST'] },
  { url: '/api/v1/ip-metadata', methods: ['GET'] },
  { url: '/api/v1/ip-metadata/{ip}', methods: ['GET'] },
  { url: '/api/v1/geolocation/geolocate', methods: ['POST'] },
];

export const GIGA_METER_APP_RESPONSE_FILTERS: CategoryResponseFilters = {
  exclude: [],
  include: [],
  endpoints: {
    // The app only checks whether the list is empty.
    '/api/v1/dailycheckapp_schools/{giga_id_school}': {
      include: ['id', 'giga_id_school'],
    },
  },
};

const GIGA_METER_APP_CONFIG: CategoryConfigType = {
  id: 6,
  name: Category.GIGA_METER_APP,
  isDefault: false,
  allowedAPIs: GIGA_METER_APP_ALLOWED_APIS,
  notAllowedAPIs: [],
  responseFilters: GIGA_METER_APP_RESPONSE_FILTERS,
  allowedCountries: [],
  swagger: {
    visible: false
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Categories always taken from this file, whatever category_config holds: a row
// with the same name is ignored, and no row is needed.
export const CODE_OWNED_CATEGORY_CONFIG: CategoryConfigType[] = [GIGA_METER_APP_CONFIG];

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
      { url: '/api/v1/public/schools', methods: ['GET'] },
      { url: '/api/v1/public/measurements', methods: ['GET'] },
      { url: '/api/v1/public/countries', methods: ['GET'] },
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
    allowedCountries: ['BR'],
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
    allowedCountries: [],
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
    allowedCountries: [],
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
    allowedCountries: [],
    swagger:{
      visible: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  GIGA_METER_APP_CONFIG,
];

// // List of all supported categories
export const CATEGORIES = DEFAULT_CATEGORY_CONFIG.map(config => config.name);

// // Default category to use when none is specified
export const DEFAULT_CATEGORY = DEFAULT_CATEGORY_CONFIG.find(config => config.isDefault)?.name || Category.PUBLIC;

// all categories
export let CATEGORY_CONFIG = DEFAULT_CATEGORY_CONFIG;