import { OpenAPIObject } from '@nestjs/swagger';

// Define interfaces for type safety
export interface SchemaObject {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  allOf?: any[];
  items?: any;
  $ref?: string;
  example?: any;
}

export interface ContentObject {
  schema?: SchemaObject | ReferenceObject;
}

export interface ResponseObject {
  content?: Record<string, ContentObject>;
}

export interface RequestBodyObject {
  content?: Record<string, ContentObject>;
}

export interface OperationObject {
  responses?: Record<string, ResponseObject>;
  requestBody?: RequestBodyObject;
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

export interface ReferenceObject {
  $ref: string;
}

export interface ResponseFilters {
  include?: string[];
  exclude?: string[];
  endpoints?: Record<string, { include?: string[]; exclude?: string[] }>;
}
