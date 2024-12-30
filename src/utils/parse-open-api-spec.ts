import { readFileSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

export type swaggerTypes = 'object' | 'array' | 'string' | 'number' | 'boolean';

export interface Schema {
  type: swaggerTypes;
  example?: any;
  $ref?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
}

export type contentTypes = 'application/json';

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

const parseOpenApiSpec = (fileName: string): ParsedSpec => {
  // TODO replace with passed in path location
  const specPath = path.join(fileName);
  const contents = Buffer.from(readFileSync(specPath)).toString('utf-8');
  const swagger = parseYaml(contents) as OpenApiSpec;

  const parsedSchemaComponents: Record<string, Schema> = {};

  Object.entries(swagger.components.schemas).forEach(([key, value]) => {
    parsedSchemaComponents[key] = value;
  });

  Object.entries(parsedSchemaComponents).forEach(([_, value]) => {
    recursiveResolveRef(value, parsedSchemaComponents);
  });

  const paths = swagger.paths;

  Object.entries(paths).forEach(([_, value]) => {
    Object.entries(value).forEach(([_, _method]) => {
      const method = _method as JointReqRes;

      // TODO: Add support for other methods
      if (method.requestBody) {
        method.requestBody.content['application/json'].schema = recursiveResolveRef(method.requestBody.content['application/json'].schema, parsedSchemaComponents);
      }

      Object.entries(method.responses).forEach(([_, response]) => {
        response.content['application/json'].schema = recursiveResolveRef(response.content['application/json'].schema, parsedSchemaComponents);
      });
    });
  });

  return {
    info: swagger.info,
    components: {
      schemas: parsedSchemaComponents
    },
    paths,
  };
};

export default parseOpenApiSpec;
