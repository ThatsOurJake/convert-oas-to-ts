import * as ts from 'typescript';
import {  content, contentTypes, JointReqRes, methods, ParsedSpec, Schema, swaggerTypes } from "./utils/parse-open-api-spec";
import pascalCase from "./utils/pascal-case";
import tsArray from "./utils/ts-array";
import tsObject from "./utils/ts-object";

const swaggerTypeToNativeType = (type: swaggerTypes) => {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    default:
      return type;
  }
};

type dict = { [key: string]: string | number | boolean | ts.PropertySignature | dict };

const recursiveFlatObject = (properties: Record<string, Schema>, parentInstructions: ts.Statement[], parentName: string) => {
  const output: dict = {};

  for (const property in properties) {
    if (Object.prototype.hasOwnProperty.call(properties, property)) {
      const schema = properties[property]!;

  if (schema.type === 'object') {
        const nested = recursiveFlatObject(schema.properties!, parentInstructions, parentName);

        for (const nestedProperty in nested) {
          if (Object.prototype.hasOwnProperty.call(nested, nestedProperty)) {
            const t = nested[nestedProperty]! as swaggerTypes;
            const nativeType = swaggerTypeToNativeType(t);

            if (!output[property]) {
              output[property] = {};
            }

            // If we are here then it means we're still traversing the object and its safe this is an object
            output[property] = {
              ...output[property] as object,
              [nestedProperty]: nativeType
            }
          }
        }
      } else if (schema.type === 'array') {
        const { items } = schema;

        if (!items) {
          throw new Error('Array type must have items property');
        }

        const arrayNested = recursiveFlatObject(items.properties!, parentInstructions, parentName);
        const interfaceArray = tsArray(property, [arrayNested], parentName);
        const { interfaces, property: arrProperty } = interfaceArray;

        parentInstructions.push(...interfaces);

        output[property] = arrProperty!;
      } else {
        const nativeType = swaggerTypeToNativeType(schema.type);
        output[property] = nativeType;
      }
    }
  }

  return output;
};

const parseContentSchema = (content: content, interfaceName: string, parentInstructions: ts.Statement[]) => {
  for (const _contentType in content) {
    const contentType = _contentType as contentTypes;
    
    if (Object.prototype.hasOwnProperty.call(content, contentType)) {
      const { schema } = content[contentType]!;

      if (schema.type === 'object') {
        const flat = recursiveFlatObject(schema.properties!, parentInstructions, interfaceName);

        return {
          interfaces: tsObject(flat, interfaceName)
        };

        // console.log(instructionsToString(interfaceObject));
      }

      // TODO: Handle array types
    }
  }

  return null;
};

const createTypes = (spec: ParsedSpec) => {
  const { paths, info } = spec;
  const instructions: ts.Statement[] = [];

  const pathProperties: ts.PropertySignature[] = [];
  const rootInterfaceName = pascalCase(info.title);

  pathProperties.push(ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier('title'),
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(info.title)),
  ));

  for (const url in paths) {
    const baseInterfaceName = pascalCase(url);

    if (Object.prototype.hasOwnProperty.call(paths, url)) {
      const methods = paths[url]!;
      const interfaceName = `${baseInterfaceName}Requests`;
      
      const methodProperties: ts.PropertySignature[] = [];

      for (const _method in methods) {
        const method = _method as methods;
        const methodInterfaceName = pascalCase(`${baseInterfaceName}-${method}`);
        const methodProps: ts.PropertySignature[] = [];

        if (Object.prototype.hasOwnProperty.call(methods, method)) {
          const action = methods[method]! as JointReqRes;
          const unionName = `${methodInterfaceName}Responses`;

          if (action.requestBody) {
            const { content } = action.requestBody;
            const requestInterfaceName = `${methodInterfaceName}Req`;
            const res = parseContentSchema(content, requestInterfaceName, instructions);

            if (!res) {
              throw new Error('Failed to parse request body');
            }

            const { interfaces: contentInterfaces } = res;
            instructions.push(...contentInterfaces);

            methodProps.push(ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier('request'),
              undefined,
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(requestInterfaceName), undefined
            )));
          }

          const responseIdentifiers: ts.TypeReferenceNode[] = [];

          for (const statusCode in action.responses) {
            const statusInterfaceName = pascalCase(`${methodInterfaceName}${statusCode}Resp`);

            if (Object.prototype.hasOwnProperty.call(action.responses, statusCode)) {
              const { content } = action.responses[statusCode]!;
              const res = parseContentSchema(content, statusInterfaceName, instructions);

              if (!res) {
                const unknownType = ts.factory.createTypeAliasDeclaration(
                  undefined,
                  ts.factory.createIdentifier(statusInterfaceName),
                  undefined,
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
                )
                instructions.push(unknownType);
                responseIdentifiers.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(statusInterfaceName), undefined));
                continue;
              }

              const { interfaces: contentInterfaces } = res;
              instructions.push(...contentInterfaces);

              responseIdentifiers.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(statusInterfaceName), undefined));
            }
          }

          const union = ts.factory.createUnionTypeNode(responseIdentifiers);
          const responseProperty = ts.factory.createTypeAliasDeclaration(
            undefined,
            ts.factory.createIdentifier(unionName),
            undefined,
            union,
          );

          instructions.push(responseProperty);

          const responseSignature = ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier('response'),
            undefined,
            ts.factory.createTypeReferenceNode(responseProperty.name, undefined),
          );

          methodProps.push(responseSignature);
        }

        const methodInterface = ts.factory.createInterfaceDeclaration(
          undefined,
          ts.factory.createIdentifier(methodInterfaceName),
          undefined,
          undefined,
          methodProps,
        );

        instructions.push(methodInterface);

        methodProperties.push(ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(method),
          undefined,
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(methodInterfaceName), undefined),
        ));
      }

      const groupMethodsInterface = ts.factory.createInterfaceDeclaration(
        undefined,
        ts.factory.createIdentifier(interfaceName),
        undefined,
        undefined,
        methodProperties,
      );

      instructions.push(groupMethodsInterface);
      
      pathProperties.push(ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(baseInterfaceName),
        undefined,
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(interfaceName), undefined),
      ));
    }
  }

  const rootInterface = ts.factory.createInterfaceDeclaration(
    undefined,
    ts.factory.createIdentifier(rootInterfaceName),
    undefined,
    undefined,
    pathProperties,
  );

  instructions.push(rootInterface);

  return instructions;
};


export default createTypes;
