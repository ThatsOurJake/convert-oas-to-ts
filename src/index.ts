import path from 'path';
import OpenAPIParser from '@readme/openapi-parser';
import * as ts from "typescript";
import fs from 'fs';

type methods = 'get' | 'post' | 'put' | 'delete';
type swaggerTypes = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

type properties = {
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

const swaggerTypeToTsType = (type: swaggerTypes) => {
  switch (type) {
    case 'string':
      return ts.SyntaxKind.StringKeyword;
    case 'number':
    case 'integer':
      return ts.SyntaxKind.NumberKeyword;
    case 'boolean':
      return ts.SyntaxKind.BooleanKeyword;
    default:
      return ts.SyntaxKind.UnknownKeyword;
  }
}

const pathToInterfaceName = (pth: string) => {
  const parts = pth.replace(/\//g, '~').replace(/-/g, '~').split('~');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
};

(async () => {
  const file = path.join('spec.yaml');
  const parsed = await OpenAPIParser.dereference(file);
  const instructions = [];

  const { paths, info: { title } } = parsed;

  for (let p in paths) {
    const path = paths[p];
    
    const baseInterfaceName = pathToInterfaceName(p);

    const baseInterfacePropsInstructions = [];

    baseInterfacePropsInstructions.push(ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier('name'),
      undefined,
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(title)),
    ));

    baseInterfacePropsInstructions.push(ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier('url'),
      undefined,
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(p)),
    ));

    for (let m in path) {
      const method = path[m as methods] as Method;
      const mStr = pathToInterfaceName(m);
      const methodBaseInterfaceName = `${baseInterfaceName}${mStr}`;

      const methodInstructions: {
        responseInstructions: ts.InterfaceDeclaration[],
        requestInstructions: ts.InterfaceDeclaration[],
      } = {
        responseInstructions: [],
        requestInstructions: [],
      };

      for (let r in method.responses) {
        const response = method.responses[r]!;
        const { content } = response;
        const interfaceName = `${methodBaseInterfaceName}Response${r}`;

        const subInstructions = [];

        for (let c in content) {
          const schema = content[c]!.schema;
          const { properties } = schema;

          for (let p in properties) {
            const prop = properties[p];

            subInstructions.push(ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier(p),
              undefined,
              ts.factory.createKeywordTypeNode(swaggerTypeToTsType(prop!.type)),
            ));
          }
        }

        methodInstructions.responseInstructions.push(ts.factory.createInterfaceDeclaration(
          undefined,
          ts.factory.createIdentifier(interfaceName),
          undefined,
          undefined,
          subInstructions,
        ));
      }

      instructions.push(ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(`${baseInterfaceName}Responses`),
        undefined,
        ts.factory.createUnionTypeNode(methodInstructions.responseInstructions.map(i => ts.factory.createTypeReferenceNode(i.name as ts.Identifier))),
      ));

      instructions.push(...methodInstructions.responseInstructions);
      instructions.push(...methodInstructions.requestInstructions);
 
      const members: ts.TypeElement[] = [];

      if (methodInstructions.requestInstructions.length > 0) {
        members.push(ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier('request'),
          undefined,
          ts.factory.createTypeReferenceNode(`${baseInterfaceName}Request${mStr}`),
        ));
      }

      if (methodInstructions.responseInstructions.length > 0) {
        members.push(ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier('responses'),
          undefined,
          ts.factory.createTypeReferenceNode(`${baseInterfaceName}Responses`),
        ));
      }

      baseInterfacePropsInstructions.push(ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(m),
        undefined,
        ts.factory.createTypeLiteralNode(members)
      ));
    }

    instructions.push(ts.factory.createInterfaceDeclaration(
      undefined,
      ts.factory.createIdentifier(baseInterfaceName),
      undefined,
      undefined,
      baseInterfacePropsInstructions,
    ));
  }

  const sourceFile = ts.factory.createSourceFile(
    instructions,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None,
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  console.log(printer.printFile(sourceFile));
  fs.writeFileSync('output.d.ts', printer.printFile(sourceFile));
})();
