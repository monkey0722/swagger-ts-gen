import {
  BaseSchema,
  BodyParameter,
  Operation,
  Parameter,
  PathParameter,
  QueryParameter,
  Schema as SwaggerSchema,
  FormDataParameter
} from "swagger-schema-official";
import { TSSchema, SwaggerSchemaType, SwaggerSchemaFormat, ProeprtyNaming } from './types';

// Map swagger types to typescript definitions
// [swagger-type:typescript-type]
export const typeMap: Record<SwaggerSchemaType, string> = {
  Array: "Array",
  array: "Array",
  List: "Array",
  boolean: "boolean",
  string: "string",
  int: "number",
  float: "number",
  number: "number",
  long: "number",
  short: "number",
  char: "string",
  double: "number",
  object: "any",
  integer: "number",
  Map: "any",
  date: "string",
  DateTime: "Date",
  binary: "string", // TODO: binary should be mapped to byte array
  ByteArray: "string",
  UUID: "string",
  File: "any",
  Error: "Error" // TODO: Error is not same as the Javascript Error
};

export function mapType(type?: SwaggerSchemaType, format?: SwaggerSchemaFormat): string {
  if (!type) {
    return "any";
  }

  if (type === "string" && (format === "int64" || format === "uint64")) {
    // TODO: use options
    return "number";
  }

  return typeMap[type || ""] || "any";
}

/**
 * Get ref names from ref path
 * @param schema
 */
export function getRefName(ref: string): string {
  const segments = ref.split("/");
  const type = segments[1];
  if (type === "responses") {
    return responseName(segments[segments.length - 1]);
  }
  return segments[segments.length - 1];
}

/**
 * Check schema is nullable
 * @param schema 
 */
export function isNullable(schema: SwaggerSchema): boolean {
  return (schema as any)["x-nullable"] === true;
}

/**
 * Check type is FormDataParameter with type guard
 */
export function isFormDataParameter(parameter: Parameter): parameter is FormDataParameter {
  return parameter.in === "formData";
}

/**
 * Check type is BodyParameter with type guard
 */
export function isBodyParameter(parameter: Parameter): parameter is BodyParameter {
  return parameter.in === "body";
}

/**
 * Check type is PathParameter with type guard
 */
export function isPathParameter(parameter: Parameter): parameter is PathParameter {
  return parameter.in === "path";
}

/**
 * Check type is QueryParameter with type guard
 */
export function isQueryParameter(parameter: Parameter): parameter is QueryParameter {
  return parameter.in === "query";
}

/**
 * Check paramter is required
 */
export function isRequired(schema: SwaggerSchema, key: string): boolean {
  return (schema.required || []).indexOf(key) !== -1;
}

/**
 * Check passed object is schema or not
 * @param schemaOrBaseSchema
 */
export function isSchema(
  schemaOrBaseSchema: BaseSchema | SwaggerSchema
): schemaOrBaseSchema is SwaggerSchema {
  const schema: SwaggerSchema = schemaOrBaseSchema as SwaggerSchema;
  return (
    schema.$ref !== undefined ||
    schema.allOf !== undefined ||
    schema.additionalProperties !== undefined ||
    schema.properties !== undefined ||
    schema.discriminator !== undefined ||
    schema.readOnly !== undefined ||
    schema.xml !== undefined ||
    schema.externalDocs !== undefined ||
    schema.example !== undefined ||
    schema.required !== undefined
  );
}

/**
 * Normalize path string
 * @param path 
 */
export function normalizePath(path: string): string {
  if (path.charAt(0) === "/") {
    return path;
  }
  return `/${path.slice(1)}`;
}
 
/**
 * Create operation name
 * @param method
 * @param operation
 */
export function createOperationName(operation: Operation, path: string, method: string): string {
  if (operation.operationId) {
    return toUpperCamelCase(operation.operationId.replace(/\./g, ""));
  }
  return toUpperCamelCase(`${method.toLowerCase()}${normalizePath(path).replace(/\//g, "_").replace(/\{|\}/g, "")}`);
}

/**
 * Create default schema
 */
export function emptySchema(): TSSchema {
  return {
    type: "void",
    isRequired: false,
    isRef: false,
    isNullable: false,
    isArray: false,
    properties: {},
    enum: [],
    allOf: [],
  };
}

/**
 * normalize naming
 * @param str 
 */
export function normalizeNaming(str: string, naming: ProeprtyNaming): string {
  switch (naming) {
    case "camelCase":
      return snakeToCamel(str);
    case "snake_case":
      return camelToSnake(str);
    case "original":
      return str;
  }
}

/**
 * snake to camel case
 * @param str
 */
export function toUpperCamelCase(str: string) {
  const camelCase = snakeToCamel(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}


/**
 * snake to camel case
 * @param str
 */
export function snakeToCamel(str: string) {
  return str.replace(/_+(\w){1}|-+(\w){1}/g, (_, group1, group2) => {
    var letter = group1 || group2;
    return letter.toUpperCase();
  });
}

/**
 * camel to snake case
 * @param str
 */
export function camelToSnake(str: string) {
  return str
    .replace(/([a-z]|(?:[A-Z0-9]+))([A-Z0-9]|$)/g, (_, group1, group2) => {
      return group1 + (group2 && "_" + group2);
    })
    .toLowerCase();
}

/**
 * enumerate object
 * @param obj 
 */
export function enumerate<T>(obj: Record<string, T>): { key: string, value: T }[] {
   return Object.keys(obj).map((key) => ({
     key,
     value: obj[key]
   }));
}

/**
 * normalize response
 * @param name 
 */
export function responseName(name: string) {
  return `${name}Response`;
}