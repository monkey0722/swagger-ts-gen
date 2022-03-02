export type HTTPMethod = "GET" | "PUT" | "POST" | "DELETE" | "OPTIONS" | "HEAD" | "PATCH" | "get" | "put" | "post" | "delete" | "options" | "head" | "patch";

export interface TSSchema {
  type: string;
  isRequired: boolean;
  isNullable: boolean;
  isRef: boolean;
  isArray: boolean;
  enum: any[];
  allOf: TSSchema[];
  properties: { [name: string]: TSSchema };
}

export interface OperationSchema {
  name: string;
  path: string;
  method: HTTPMethod;
  contentType?: string;
  pathParameter?: TSSchema;
  queryParameter?: TSSchema;
  bodyParameter?: TSSchema;
  formDataParameter?: TSSchema;
  response?: TSSchema;
}

export interface DefinitionSchema {
  name: string;
  schema: TSSchema;
}

export interface Context {
  definitions: DefinitionSchema[];
  operations: OperationSchema[];
}

export interface GenCodeRequest {
  filepath: string;
  content: string;
}

export type ProeprtyNaming = 
  | "camelCase"
  | "snake_case"
  | "original"

export type SwaggerSchemaFormat =
  | "int32"
  | "int64"
  | "uint64"
  | "float"
  | "double"
  | "byte"
  | "date"
  | "date-time";

export type SwaggerSchemaType =
  | "Array"
  | "array"
  | "List"
  | "boolean"
  | "string"
  | "int"
  | "float"
  | "number"
  | "long"
  | "short"
  | "char"
  | "double"
  | "object"
  | "integer"
  | "Map"
  | "date"
  | "DateTime"
  | "binary"
  | "ByteArray"
  | "UUID"
  | "File"
  | "Error";
