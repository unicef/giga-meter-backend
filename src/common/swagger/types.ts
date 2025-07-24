import { OpenAPIObject } from '@nestjs/swagger';

// Define interfaces for type safety
export interface SchemaObject {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  allOf?: any[];
  oneOf?: any[];
  anyOf?: any[];
  items?: any;
  $ref?: string;
  example?: any;
  additionalProperties?: boolean | SchemaObject;
  nullable?: boolean;
  description?: string;
  format?: string;
  title?: string;
}

export interface ReferenceObject {
  $ref: string;
}

export interface ContentObject {
  schema?: SchemaObject | ReferenceObject;
}

export interface ResponseObject {
  content?: Record<string, ContentObject>;
  description?: string;
}

export interface RequestBodyObject {
  content?: Record<string, ContentObject>;
  description?: string;
  required?: boolean;
}

export interface OperationObject {
  responses?: Record<string, ResponseObject>;
  requestBody?: RequestBodyObject;
  description?: string;
  summary?: string;
  tags?: string[];
  parameters?: any[];
}

export interface PathItemObject {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  parameters?: any[];
}

// Interface for response filters configuration
export interface ResponseFilters {
  exclude?: string[];
  include?: string[];
  endpoints?: Record<string, {
    exclude?: string[];
    include?: string[];
  }>;
}
