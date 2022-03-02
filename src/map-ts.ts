import { Schema, BaseSchema } from "swagger-schema-official";
import { getRefName, isSchema, isRequired, mapType, isNullable } from './utils';
import { TSSchema, SwaggerSchemaType, SwaggerSchemaFormat } from "./types";
import { Schema as SwaggerSchema } from "swagger-schema-official";

/**
 * Map swagger types to TypeScript types
 * @param schema
 * @param required
 */
export default function mapTS(schema: Schema | BaseSchema, required: boolean = false) {
  const tsSchema: TSSchema = {
    type: mapType(schema.type as SwaggerSchemaType, schema.format as SwaggerSchemaFormat),
    isRequired: required,
    isArray: false,
    isRef: false,
    isNullable: isNullable(schema),
    enum: [],
    allOf: [],
    properties: {},
  };

  // Has enum values
  if (schema.enum) {
    tsSchema.enum = schema.enum;
    return tsSchema;
  }

  // Has schema
  if (isSchema(schema)) {
    if (schema.$ref) {
      const name = getRefName(schema.$ref);
      tsSchema.isRef = true;
      tsSchema.type = name;
    }
    if (schema.properties) {
      tsSchema.properties = Object.keys(schema.properties).reduce(
        (res, key) => {
          const property = schema.properties![key] as Schema;
          res[key] = mapTS(property, isRequired(schema, key));
          return res;
        },
        {} as any
      );
    }

    // allOf
    const swschema: SwaggerSchema = schema as SwaggerSchema;
    if (swschema.allOf !== undefined) {
      tsSchema.allOf = swschema.allOf.map((x) => mapTS(x, required));
    }

    return tsSchema;
  }

  // Has array type
  if (schema.type === "array") {
    const parsed = mapTS(schema.items as Schema);
    tsSchema.type = parsed.type;
    tsSchema.isArray = true;
    tsSchema.isRef = parsed.isRef;
    tsSchema.properties = parsed.properties;
    return tsSchema;
  }

  return tsSchema;
}
