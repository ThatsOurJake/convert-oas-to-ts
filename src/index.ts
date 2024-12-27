import path from 'path';
import OpenAPIParser from '@readme/openapi-parser';
import * as ts from "typescript";
import fs from 'fs';
import pascalCase from './utils/pascal-case';
import createTypes from './create-types';

type methods = 'get' | 'post' | 'put' | 'delete';
export type swaggerTypes = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export type properties = {
  type: 'string';
  description?: string
} | {
  type: 'object',
  description?: string,
  properties: Record<string, properties>;
} | {
  type: 'array',
  description?: string,
  items: properties;
};

interface Method {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  requestBody?: {
    required: boolean;
    content: {
      [key: string]: {
        schema: {
          $ref: string;
        };
      };
    };
  };
  responses: {
    [key: string]: {
      description: string;
      content: Record<string, {
        schema: {
          type: swaggerTypes;
          description?: string;
          properties: Record<string, properties>;
        };
      }>;
    };
  }
}

(async () => {
  const file = path.join('spec.yaml');
  const parsed = await OpenAPIParser.dereference(file);
  const instructions: ts.TypeElement[] = [];

  const { paths, info: { title } } = parsed;

  const baseInterfaceName = pascalCase(title);

  for (const key in paths) {
    const pathValue = paths[key];

    const pathInterfaceName = pascalCase(key);
    const pathInterfaceMembers: ts.TypeElement[] = [];

    for (const httpMethod in pathValue) {
      const method = pathValue[httpMethod as methods] as Method;

      const methodInterfaceName = pascalCase(httpMethod);
      const methodInterfaceMembers = {
        request: [] as ts.TypeElement[],
        response: [] as ts.TypeElement[],
      };

      const { responses } = method;

      if (responses) {
        for (const res in responses) {
          const response = responses[res]!;

          const responseInterfaceName = pascalCase(`${baseInterfaceName}/${methodInterfaceName}/Response/${res}`);
          const responseInterfaceMembers = [];

          const { content } = response;
          const json = content['application/json'];

          if (!json) {
            console.warn('unsupported type');
            continue;
          }

          const { schema: { properties, type: t } } = json;

          const output = createTypes(t, responseInterfaceName, instructions, properties);

          if (Array.isArray(output)) {
            responseInterfaceMembers.push(...output);
          } else {
            responseInterfaceMembers.push(output);
          }

          methodInterfaceMembers.response.push(...responseInterfaceMembers)
        }
      };

      const methodInterface = ts.factory.createInterfaceDeclaration(
        undefined,
        methodInterfaceName,
        undefined,
        undefined,
        methodInterfaceMembers.response,
      );

      pathInterfaceMembers.push(ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier("response"),
        undefined,
        ts.factory.createTypeReferenceNode(methodInterface.name),
      ));
    }

    const pathInterface = ts.factory.createInterfaceDeclaration(
      undefined,
      pathInterfaceName,
      undefined,
      undefined,
      pathInterfaceMembers
    );

    
  }
})();
