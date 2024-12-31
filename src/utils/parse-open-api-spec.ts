import { existsSync, readFileSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

export type swaggerTypes = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';

export interface Schema {
  type: swaggerTypes;
  example?: any;
  $ref?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: string[];
}

export type contentTypes = 'application/json' | '*/*';

export type content = {
  [key in contentTypes]: {
    schema: Schema;
  }
}

export interface BaseReqRes {
  summary?: string;
  tags?: string[];
  responses: {
    [key: string]: {
      description: string;
      content: content
    }
  }
}

export interface Post extends BaseReqRes {
  requestBody: {
    content: content;
  }
}

export type JointReqRes = BaseReqRes & Post;

export interface OpenApiPath {
  get?: BaseReqRes;
  post?: Post;
  put?: BaseReqRes;
  delete?: BaseReqRes;
}

export type methods = keyof OpenApiPath;

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

const recursiveResolveRef = (schema: Schema, parsedSchemaComponents: Record<string, Schema>) => {
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
  contents? : string;
  filePath?: string;
  shallow?: boolean;
};

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

  const parsedSchemaComponents: Record<string, Schema> = {};

  Object.entries(swagger.components.schemas).forEach(([key, value]) => {
    parsedSchemaComponents[key] = value;
  });

  const paths = swagger.paths;

  if (!shallow) {
    Object.entries(parsedSchemaComponents).forEach(([_, value]) => {
      recursiveResolveRef(value, parsedSchemaComponents);
    });
  
  
    Object.entries(paths).forEach(([_, value]) => {
      Object.entries(value).forEach(([_, _method]) => {
        const method = _method as JointReqRes;
  
        if (method.requestBody) {
          for (const [key, value] of Object.entries(method.requestBody.content)) {
            method.requestBody.content[key as contentTypes].schema = recursiveResolveRef(value.schema, parsedSchemaComponents);
          }
        }
  
        Object.entries(method.responses).forEach(([_, response]) => {
          if (response.content) {
            for (const [key, value] of Object.entries(response.content)) {
              response.content[key as contentTypes].schema = recursiveResolveRef(value.schema, parsedSchemaComponents
            )};
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
