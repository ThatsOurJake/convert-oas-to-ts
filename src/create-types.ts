import * as ts from "typescript";

import {
  contentTypes,
  JointReqRes,
  methods,
  ParsedSpec,
  Schema,
} from "./utils/parse-open-api-spec";
import tsObject from "./utils/ts-object";
import pascalCase from "./utils/pascal-case";
import tsArray from "./utils/ts-array";

const processSchema = (componentKey: string, component: Schema) => {
  const propertyName = pascalCase(componentKey);

  if (component.type === "object") {
    const { properties } = component;
    const componentInterfaces = tsObject(properties!, propertyName);
    // const rootInterface = componentInterfaces[componentInterfaces.length - 1]!;

    // sharedInterfaces.set(propertyName, rootInterface);
    // instructions.push(...componentInterfaces);

    return componentInterfaces;
  }

  if (component.type === "string") {
    const { enum: enumValues } = component;

    if (!enumValues) {
      const typeAlias = ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(componentKey),
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      );

      // instructions.push(typeAlias);
      return [typeAlias];
    } else {
      const unionType = ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(componentKey),
        undefined,
        ts.factory.createUnionTypeNode(
          enumValues.map((value) =>
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral(value)
            )
          )
        )
      );

      // instructions.push(unionType);
      return [unionType];
    }
  }

  if (component.type === "array") {
    const { items } = component;
    const componentArray = tsArray(items!, componentKey);
    // instructions.push(...componentArray);
    return componentArray;
  }

  return [];
};

const createTypes = (spec: ParsedSpec) => {
  const { components, info, paths } = spec;

  const instructions: ts.Node[] = [];
  const sharedInterfaces: Map<string, ts.InterfaceDeclaration> = new Map();

  // This creates all the shared component interfaces
  if (components && components.schemas) {
    const { schemas: componentSchemas } = components;

    for (const componentKey in componentSchemas) {
      if (
        Object.prototype.hasOwnProperty.call(componentSchemas, componentKey)
      ) {
        const component = componentSchemas[componentKey]!;
        const propertyName = pascalCase(componentKey);

        const componentInterfaces = processSchema(componentKey, component);

        instructions.push(...componentInterfaces);

        if (component.type === "object") {
          const rootInterface =
            componentInterfaces[componentInterfaces.length - 1]!;
          sharedInterfaces.set(
            propertyName,
            rootInterface as ts.InterfaceDeclaration
          );
        }
      }
    }
  }

  const rootPropertyMembers: ts.PropertySignature[] = [];

  rootPropertyMembers.push(
    ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier("title"),
      undefined,
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(info.title))
    ),
    ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier("version"),
      undefined,
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(info.version))
    )
  );

  for (const url in paths) {
    const urlInterfaceName = pascalCase(url);
    const urlInterfacePropertyMembers: ts.PropertySignature[] = [];

    if (Object.prototype.hasOwnProperty.call(paths, url)) {
      const methods = paths[url]!;

      for (const method in methods) {
        const methodInterfaceName = pascalCase(`${urlInterfaceName}-${method}`);
        const methodProperties: ts.PropertySignature[] = [];

        if (Object.prototype.hasOwnProperty.call(methods, method)) {
          const requestResponse = methods[method as methods]! as JointReqRes;
          const { responses, requestBody } = requestResponse;

          const requestPropertyMembers: ts.PropertySignature[] = [];
          const responsePropertyMembers: ts.PropertySignature[] = [];

          if (requestBody) {
            const { content } = requestBody;
            const requestBodyInterfaceName = pascalCase(`${methodInterfaceName}-Payload`);
            const requestPropKey = ts.factory.createIdentifier("request");

            if (!content) {
              requestPropertyMembers.push(
                ts.factory.createPropertySignature(
                  undefined,
                  requestPropKey,
                  undefined,
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
                )
              );
            } else {
              const possibleTypes: ts.Identifier[] = [];

              for (const contentType in content) {
                if (Object.prototype.hasOwnProperty.call(content, contentType)) {
                  const { schema } = content[contentType as contentTypes]!;
                  const schemaName = schema.$ref ? pascalCase(schema.$ref.split("/").pop()!) : requestBodyInterfaceName;
                  const schemaIdentifier = ts.factory.createIdentifier(schemaName);

                  if (!sharedInterfaces.has(schemaName)) {
                    const componentInterfaces = processSchema(schemaName, schema);
                    instructions.push(...componentInterfaces);
                  }

                  possibleTypes.push(schemaIdentifier);
                }
              }

              requestPropertyMembers.push(
                ts.factory.createPropertySignature(
                  undefined,
                  requestPropKey,
                  undefined,
                  ts.factory.createUnionTypeNode(
                    possibleTypes.map((type) =>
                      ts.factory.createTypeReferenceNode(type)
                    )
                  )
                )
              );
            }
          }

          if (responses) {
            const responsePropKey = ts.factory.createIdentifier("response");
            const statusCodeMembers: ts.PropertySignature[] = [];

            for (const statusCode in responses) {
              if (Object.prototype.hasOwnProperty.call(responses, statusCode)) {
                const response = responses[statusCode]!;
                const { content } = response;
                const responseInterfaceName = pascalCase(`${methodInterfaceName}-Response-${statusCode}`);

                if (!content) {
                  responsePropertyMembers.push(
                    ts.factory.createPropertySignature(
                      undefined,
                      responsePropKey,
                      undefined,
                      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
                    )
                  );
                } else {
                  for (const contentType in content) {
                    if (Object.prototype.hasOwnProperty.call(content, contentType)) {
                      const { schema } = content[contentType as contentTypes]!;
                      const schemaName = schema.$ref ? pascalCase(schema.$ref.split("/").pop()!) : responseInterfaceName;
                      const schemaIdentifier = ts.factory.createIdentifier(schemaName);

                      if (!sharedInterfaces.has(schemaName)) {
                        const componentInterfaces = processSchema(schemaName, schema);
                        instructions.push(...componentInterfaces);
                      }

                      statusCodeMembers.push(
                        ts.factory.createPropertySignature(
                          undefined,
                          ts.factory.createNumericLiteral(statusCode),
                          undefined,
                          ts.factory.createTypeReferenceNode(schemaIdentifier)
                        )
                      );
                    }
                  }
                }
              }
            }

            responsePropertyMembers.push(
              ts.factory.createPropertySignature(
                undefined,
                responsePropKey,
                undefined,
                ts.factory.createTypeLiteralNode(statusCodeMembers)
              )
            );
          }

          methodProperties.push(...requestPropertyMembers, ...responsePropertyMembers);
        }

        const methodInterface = ts.factory.createInterfaceDeclaration(
          undefined,
          ts.factory.createIdentifier(methodInterfaceName),
          undefined,
          undefined,
          methodProperties
        );

        urlInterfacePropertyMembers.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(method),
            undefined,
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(methodInterfaceName))
          )
        );
        instructions.push(methodInterface);
      }
    }

    const urlInterface = ts.factory.createInterfaceDeclaration(
      undefined,
      ts.factory.createIdentifier(urlInterfaceName),
      undefined,
      undefined,
      urlInterfacePropertyMembers
    );

    rootPropertyMembers.push(
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(urlInterfaceName),
        undefined,
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(urlInterfaceName))
      )
    );
    instructions.push(urlInterface);
  }

  const rootInterface = ts.factory.createInterfaceDeclaration(
    undefined,
    ts.factory.createIdentifier(pascalCase(info.title)),
    undefined,
    undefined,
    rootPropertyMembers
  );

  instructions.push(rootInterface);

  return instructions;
};

export default createTypes;
