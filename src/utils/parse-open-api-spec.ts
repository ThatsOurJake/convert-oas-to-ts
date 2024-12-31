import { existsSync, readFileSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

export type SwaggerTypes = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';

export interface Schema {
  type: SwaggerTypes;
  example?: any;
  $ref?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: string[];
}

export type ContentTypes = 'application/json' | '*/*';

export type Content = {
  [key in ContentTypes]: {
    schema: Schema;
  }
}

export interface BaseReqRes {
  summary?: string;
  tags?: string[];
  responses: {
    [key: string]: {
      description: string;
      content: Content
    }
  }
}

export interface Post extends BaseReqRes {
  requestBody: {
    content: Content;
  }
}

export type JointReqRes = BaseReqRes & Post;

export interface OpenApiPath {
  get?: BaseReqRes;
  post?: Post;
  put?: BaseReqRes;
  delete?: BaseReqRes;
}

export type Methods = keyof OpenApiPath;

interface OpenApiSpec {
  openapi: number;
  info: {
    title: string;
    description: string;
    version: string;
  };
  components: {
    schemas: Record<string, Schema>;
  };
  paths: Record<string, OpenApiPath>;
}

const recursiveResolveRef = (schema: Schema, parsedSchemaComponents: Record<string, Schema>): Schema => {
  if (schema.$ref) {
    const refKey = schema.$ref.split('/').pop();
    if (refKey) {
      const refSchema = parsedSchemaComponents[refKey];
      if (!refSchema) {
        throw new Error(`Schema with key ${refKey} not found`);
      }
      return recursiveResolveRef(refSchema, parsedSchemaComponents);
    }
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      schema.properties![key] = recursiveResolveRef(value, parsedSchemaComponents);
    });
  }

  if (schema.items) {
    schema.items = recursiveResolveRef(schema.items, parsedSchemaComponents);
  }

  return schema;
}

export interface ParsedSpec {
  info: {
    title: string;
    description: string;
    version: string;
  }
  components: {
    schemas: Record<string, Schema>;
  }
  paths: Record<string, OpenApiPath>;
}

interface Options {
  contents?: string;
  filePath?: string;
  shallow?: boolean;
}

const parseOpenApiSpec = (options: Options): ParsedSpec => {
  const { contents, filePath, shallow = true } = options;

  if (!contents && !filePath) {
    throw new Error('Either contents or filePath must be provided');
  }

  let fileContents: string | undefined = contents;

  if (!fileContents && filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`File not found at ${filePath}`);
    }
    fileContents = readFileSync(filePath, 'utf8');
  }

  const swagger = parseYaml(fileContents!) as OpenApiSpec;
  const parsedSchemaComponents: Record<string, Schema> = { ...swagger.components.schemas };
  const paths = swagger.paths;

  if (!shallow) {
    Object.values(parsedSchemaComponents).forEach(value => {
      recursiveResolveRef(value, parsedSchemaComponents);
    });

    Object.values(paths).forEach(path => {
      Object.values(path).forEach(method => {
        const jointMethod = method as JointReqRes;

        if (jointMethod.requestBody) {
          Object.entries(jointMethod.requestBody.content).forEach(([key, value]) => {
            jointMethod.requestBody.content[key as ContentTypes].schema = recursiveResolveRef(value.schema, parsedSchemaComponents);
          });
        }

        Object.values(jointMethod.responses).forEach(response => {
          if (response.content) {
            Object.entries(response.content).forEach(([key, value]) => {
              response.content[key as ContentTypes].schema = recursiveResolveRef(value.schema, parsedSchemaComponents);
            });
          }
        });
      });
    });
  }

  return {
    info: swagger.info,
    components: {
      schemas: parsedSchemaComponents
    },
    paths,
  };
};

export default parseOpenApiSpec;
