import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import {
  Operation,
  Path,
  Spec,
  Response,
  Parameter,
  PathParameter,
  QueryParameter,
  BodyParameter
} from "swagger-schema-official";
import {
  isBodyParameter,
  isPathParameter,
  isQueryParameter,
  createOperationName,
  emptySchema,
  snakeToCamel
} from "./utils";
import { HTTPMethod, OperationSchema, GenCodeRequest, DefinitionSchema, TSSchema } from "./types";
import mapTS from "./mapTS";
import { camelToSnake } from "./utils";

/**
 * Options for TSCodeGenerator
 */
export interface CodeGenOptions {
  dist: string;
  definitionDir?: string;
  operationDir?: string;
  camelCase?: boolean;
  templates?: {
    operation?: string;
    definition?: string;
  };
}

/**
 * Generator is code generator for typescript
 *
 * TODO: Handle security schema
 * TODO: Handle shared parameter
 */
export default class Generator {
  operationsDir: string;
  definitionDir: string;

  constructor(private spec: Spec, private options: CodeGenOptions) {
    this.operationsDir = options.operationDir || "requests";
    this.definitionDir = options.definitionDir || "models";
  }

  generate() {
    if (this.spec.swagger !== "2.0") {
      throw new Error(`Only 2.0 is supported. Your version: ${this.spec.swagger}`);
    }

    // Parse spec
    const data = this.parseSpec();

    // Setup templates
    const templates = this.options.templates || {};
    const definitionTmpl =
      templates.definition ||
      fs.readFileSync(path.resolve(__dirname, "../templates/definition.hbs"), "utf-8");
    const operationTmpl =
      templates.operation ||
      fs.readFileSync(path.resolve(__dirname, "../templates/operation.hbs"), "utf-8");

    // Register partial for handlebars
    this.registerPartial();
    this.registerHelper();

    // Setup output directory
    const operationDir = path.resolve(this.dist, this.operationsDir);
    const definitionDir = path.resolve(this.dist, this.definitionDir);
    if (data.operations.length > 0 && !fs.existsSync(operationDir)) {
      fs.mkdirSync(operationDir);
    }
    if (data.definitions.length > 0 && !fs.existsSync(definitionDir)) {
      fs.mkdirSync(definitionDir);
    }

    // Create files and write schema
    this.genFiles([
      ...this.createInterfaces(),
      ...this.createDefinitions(
        data.definitions,
        Handlebars.compile(definitionTmpl),
        definitionDir
      ),
      ...this.createOperations(data.operations, Handlebars.compile(operationTmpl), operationDir)
    ]);
  }

  /**
   * Parse swagger this.spec
   */
  parseSpec() {
    const definitions: DefinitionSchema[] = Object.keys(this.spec.definitions || {}).map(key => {
      return {
        name: key,
        schema: mapTS(this.spec.definitions![key])
      };
    });

    // Parse operations
    const operations = Object.keys(this.spec.paths).reduce((result, path) => {
      let content: Path = this.spec.paths[path];

      // Remove parameters
      delete content.parameters;

      // Loop for Operation
      const operations = Object.keys(content).reduce((result, m) => {
        let method = m.toUpperCase() as HTTPMethod;
        let operation: Operation = (content as any)[m] as Operation;

        // Skip deprecated
        if (operation.deprecated) {
          console.warn("Skip depricated operation", operation.operationId);
          return result;
        }

        // Create request
        const operationSchema: OperationSchema = {
          name: operation.operationId || createOperationName(method, operation),
          path: path,
          method: method,
          response: emptySchema()
        };

        // Parse parameters
        operationSchema.response = this.parseResponse(operation.responses);
        operationSchema.pathParameter = this.parsePathParameter(operation.parameters || []);
        operationSchema.queryParameter = this.parseQueryParameter(operation.parameters || []);
        operationSchema.bodyParameter = this.parseBodyParameter(operation.parameters || []);

        return [...result, operationSchema];
      }, []);

      return [...result, ...operations];
    }, []);

    return {
      operations: operations,
      definitions: definitions
    };
  }

  /**
   * Parse response schema
   * @param responses
   */
  private parseResponse(responses: { [key: string]: Response }): TSSchema {
    // Parse response
    if (responses) {
      const response = responses["200"] || responses["201"];
      if (response.schema) {
        return mapTS(response.schema);
      }
    }
    return emptySchema();
  }

  /**
   * Parse path parameters
   * @param parameters
   */
  private parsePathParameter(parameters: Parameter[]): TSSchema {
    // Parse path parameters
    return (parameters || []).filter(isPathParameter).reduce((res, v: PathParameter) => {
      res.properties[v.name] = mapTS(v, v.required);
      return res;
    }, emptySchema());
  }

  /**
   * Parse query parameters
   * @param parameters
   */
  private parseQueryParameter(parameters: Parameter[]): TSSchema {
    // Parse query parameters
    return (parameters || [])
      .filter(v => isQueryParameter(v))
      .reduce((res: TSSchema, v: QueryParameter) => {
        res.properties[v.name] = mapTS(v, v.required);
        return res;
      }, emptySchema());
  }

  /**
   * Parse body parameters
   * @param parameters
   */
  private parseBodyParameter(parameters: Parameter[]): TSSchema {
    // Parse body parameters
    return (parameters || [])
      .filter(v => isBodyParameter(v))
      .map((v: BodyParameter) => mapTS(v.schema!, v.required))[0];
  }

  /**
   * Generate files with requests
   * @param genCodeRequests
   */
  private genFiles(genCodeRequests: GenCodeRequest[]) {
    genCodeRequests.forEach(v => {
      console.log("Generate:", v.filepath);
      fs.writeFileSync(v.filepath, v.content, {
        encoding: "utf-8",
        flag: "w+"
      });
    });
  }

  /**
   * Create emmbedded interfaces
   */
  private createInterfaces(): GenCodeRequest[] {
    return [
      {
        filepath: path.resolve(this.dist, `APIRequest.ts`),
        content: this.embedded("api-request")({})
      }
    ];
  }

  /**
   * Create operations request
   * @param operations
   * @param template
   */
  private createOperations(
    operations: OperationSchema[],
    template: Handlebars.TemplateDelegate,
    directory: string
  ): GenCodeRequest[] {
    return operations.map(v => {
      return {
        filepath: path.resolve(directory, `${v.name}.ts`),
        content: template(v)
      };
    });
  }

  /**
   * Create definitions
   * @param definitions
   * @param template
   */
  private createDefinitions(
    definitions: DefinitionSchema[],
    template: Handlebars.TemplateDelegate,
    directory: string
  ) {
    return definitions.map(v => {
      return {
        filepath: path.resolve(directory, `${v.name}.ts`),
        content: template(v)
      };
    });
  }

  /**
   * Register embbeded partials
   */
  private registerPartial() {
    Handlebars.registerPartial("property", this.embedded("property"));
  }

  /**
   * Register handlebars helpers
   */
  private registerHelper() {
    Handlebars.registerHelper("normalizeCase", (text, _) => {
      if (this.options.camelCase === true) {
        return snakeToCamel(text);
      }
      if (this.options.camelCase === false) {
        return camelToSnake(text);
      }
      return text;
    });
    Handlebars.registerHelper("ifEmpty", function(conditional, options) {
      if (typeof conditional === "object" && Object.keys(conditional).length === 0) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });
    Handlebars.registerHelper("definitionDir", () => {
      return this.definitionDir;
    });
  }

  /**
   * Get embbeded template by name
   * @param name
   */
  private embedded(name: string) {
    return Handlebars.compile(
      fs.readFileSync(path.resolve(__dirname, `../templates/${name}.hbs`), "utf-8")
    );
  }

  /**
   * Get dist path
   */
  get dist(): string {
    return path.resolve(process.cwd(), this.options.dist);
  }
}