import * as ts from "typescript";
import {
  ContentTypes,
  JointReqRes,
  Methods,
  ParsedSpec,
  Schema,
} from "./utils/parse-open-api-spec";
import tsObject from "./utils/ts-object";
import pascalCase from "./utils/pascal-case";
import tsArray from "./utils/ts-array";
import { sanitiseInterfaceName, sanitisePropKey } from "./utils/sanitise-keys";

const processSchema = (componentKey: string, component: Schema): ts.Node[] => {
  const propertyName = pascalCase(componentKey);

  switch (component.type) {
    case "object":
      return tsObject(component.properties!, propertyName);
    case "string":
      return processStringSchema(component.enum);
    case "array":
      return tsArray(component.items!, componentKey);
    default:
      return [];
  }
};

const processStringSchema = (enumValues?: string[]): ts.Node[] => {
  if (!enumValues) {
    return [
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    ];
  } else {
    return [
      ts.factory.createUnionTypeNode(
        enumValues.map((value) =>
          ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(value))
        )
      )
    ];
  }
};

const processComponents = (
  componentSchemas: Record<string, Schema>,
  instructions: ts.Node[],
  sharedInterfaces: Map<string, ts.InterfaceDeclaration>
) => {
  for (const componentKey in componentSchemas) {
    if (Object.prototype.hasOwnProperty.call(componentSchemas, componentKey)) {
      const component = componentSchemas[componentKey]!;
      const propertyName = pascalCase(componentKey);
      const componentInterfaces = processSchema(componentKey, component);

      instructions.push(...componentInterfaces);

      if (component.type === "object") {
        const rootInterface = componentInterfaces[componentInterfaces.length - 1]!;
        sharedInterfaces.set(propertyName, rootInterface as ts.InterfaceDeclaration);
      }
    }
  }
};

const processPaths = (
  methods: Record<string, JointReqRes>,
  urlInterfaceName: string,
  instructions: ts.Node[],
  sharedInterfaces: Map<string, ts.InterfaceDeclaration>
): ts.PropertySignature[] => {
  const urlInterfacePropertyMembers: ts.PropertySignature[] = [];

  for (const method in methods) {
    if (Object.prototype.hasOwnProperty.call(methods, method)) {
      const methodInterfaceName = pascalCase(`${urlInterfaceName}-${method}`);
      const methodProperties = processMethod(methods[method as Methods]!, methodInterfaceName, instructions, sharedInterfaces);

      urlInterfacePropertyMembers.push(
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(method),
          undefined,
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(methodInterfaceName))
        )
      );

      instructions.push(
        ts.factory.createInterfaceDeclaration(
          [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
          ts.factory.createIdentifier(sanitiseInterfaceName(methodInterfaceName)),
          undefined,
          undefined,
          methodProperties
        )
      );
    }
  }

  return urlInterfacePropertyMembers;
};

const processMethod = (
  requestResponse: JointReqRes,
  methodInterfaceName: string,
  instructions: ts.Node[],
  sharedInterfaces: Map<string, ts.InterfaceDeclaration>
): ts.PropertySignature[] => {
  const { responses, requestBody } = requestResponse;
  const requestPropertyMembers = processRequestBody(requestBody, methodInterfaceName, instructions, sharedInterfaces);
  const responsePropertyMembers = processResponses(responses, methodInterfaceName, instructions, sharedInterfaces);

  return [...requestPropertyMembers, ...responsePropertyMembers];
};

const processRequestBody = (
  requestBody: JointReqRes["requestBody"],
  methodInterfaceName: string,
  instructions: ts.Node[],
  sharedInterfaces: Map<string, ts.InterfaceDeclaration>
): ts.PropertySignature[] => {
  if (!requestBody) return [];

  const { content } = requestBody;
  const requestBodyInterfaceName = pascalCase(`${methodInterfaceName}-Payload`);
  const requestPropKey = ts.factory.createIdentifier("request");

  if (!content) {
    return [
      ts.factory.createPropertySignature(
        undefined,
        requestPropKey,
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      ),
    ];
  } else {
    const possibleTypes: Map<string, ts.TypeNode> = new Map();

    for (const contentType in content) {
      if (Object.prototype.hasOwnProperty.call(content, contentType)) {
        const { schema } = content[contentType as ContentTypes]!;
        const schemaName = schema.$ref ? pascalCase(schema.$ref.split("/").pop()!) : requestBodyInterfaceName;

        if (!sharedInterfaces.has(schemaName)) {
          const componentInterfaces = processSchema(schemaName, schema);

          const interfaces = componentInterfaces.filter((node) => ts.isInterfaceDeclaration(node));
          instructions.push(...interfaces);

          const typeNode = componentInterfaces.find((node) => ts.isTypeNode(node));

          if (typeNode) {
            const name = ts.isTypeAliasDeclaration(typeNode) ? typeNode.name : ts.factory.createIdentifier(schemaName);
            possibleTypes.set(name.text, typeNode);
          } else if (!typeNode) {
            const lastItem = componentInterfaces[componentInterfaces.length - 1];

            if (lastItem && ts.isInterfaceDeclaration(lastItem)) {
              const name = lastItem.name;
              possibleTypes.set(name.text, ts.factory.createTypeReferenceNode(name));
            }
          }
        } else {
          const sharedInterface = sharedInterfaces.get(schemaName)!;
          const name = sharedInterface.name;
          possibleTypes.set(name.text, ts.factory.createTypeReferenceNode(name));
        }
      }
    }

    const propertyType = possibleTypes.size > 1 ? ts.factory.createUnionTypeNode([...possibleTypes.values()]) : [...possibleTypes.values()][0];

    return [
      ts.factory.createPropertySignature(
        undefined,
        requestPropKey,
        undefined,
        propertyType
      ),
    ];
  }
};

const processResponses = (
  responses: JointReqRes["responses"],
  methodInterfaceName: string,
  instructions: ts.Node[],
  sharedInterfaces: Map<string, ts.InterfaceDeclaration>
): ts.PropertySignature[] => {
  if (!responses) return [];

  const responsePropKey = ts.factory.createIdentifier("response");
  const statusCodeMembers: ts.PropertySignature[] = [];

  for (const statusCode in responses) {
    if (Object.prototype.hasOwnProperty.call(responses, statusCode)) {
      const response = responses[statusCode]!;
      const { content } = response;
      const responseInterfaceName = pascalCase(`${methodInterfaceName}-Response-${statusCode}`);
      const possibleTypes: Map<string, ts.TypeNode> = new Map();

      if (!content) {
        statusCodeMembers.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createStringLiteral(statusCode),
            undefined,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
          )
        );

        continue;
      } else {
        for (const contentType in content) {
          if (Object.prototype.hasOwnProperty.call(content, contentType)) {
            const { schema } = content[contentType as ContentTypes]!;
            const schemaName = schema.$ref ? pascalCase(schema.$ref.split("/").pop()!) : responseInterfaceName;

            if (!sharedInterfaces.has(schemaName)) {
              const componentInterfaces = processSchema(schemaName, schema);

              const interfaces = componentInterfaces.filter((node) => ts.isInterfaceDeclaration(node));
              instructions.push(...interfaces);

              const typeNode = componentInterfaces.find((node) => ts.isTypeNode(node));

              if (typeNode) {
                const name = ts.isTypeAliasDeclaration(typeNode) ? typeNode.name : ts.factory.createIdentifier(schemaName);
                possibleTypes.set(name.text, typeNode);
              } else {
                const lastItem = componentInterfaces[componentInterfaces.length - 1];

                if (lastItem && ts.isInterfaceDeclaration(lastItem)) {
                  const name = lastItem.name;
                  possibleTypes.set(name.text, ts.factory.createTypeReferenceNode(name));
                }
              }
            } else {
              const sharedInterface = sharedInterfaces.get(schemaName)!;
              const name = sharedInterface.name;
              possibleTypes.set(name.text, ts.factory.createTypeReferenceNode(name));
            }
          }
        }
      }

      const propertyType = possibleTypes.size > 1 ? ts.factory.createUnionTypeNode([...possibleTypes.values()]) : [...possibleTypes.values()][0];

      statusCodeMembers.push(
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createStringLiteral(statusCode),
          undefined,
          propertyType,
        )
      );
    }
  }

  return [
    ts.factory.createPropertySignature(
      undefined,
      responsePropKey,
      undefined,
      ts.factory.createTypeLiteralNode(statusCodeMembers)
    ),
  ];
};

const createPropertySignature = (name: string, value: string): ts.PropertySignature => {
  return ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(value))
  );
};

const createTypes = (spec: ParsedSpec): ts.Node[] => {
  const { components, info, paths } = spec;
  const instructions: ts.Node[] = [];
  const sharedInterfaces: Map<string, ts.InterfaceDeclaration> = new Map();

  if (components?.schemas) {
    processComponents(components.schemas, instructions, sharedInterfaces);
  }

  const rootPropertyMembers: ts.PropertySignature[] = [
    createPropertySignature("title", info.title),
    createPropertySignature("version", info.version),
  ];

  for (const url in paths) {
    if (Object.prototype.hasOwnProperty.call(paths, url)) {
      const urlInterfaceName = pascalCase(`${url}-ReqRes`);
      const urlPropName = pascalCase(sanitisePropKey(url));

      const urls = paths[url] as Record<string, JointReqRes>;
      const urlInterfacePropertyMembers = processPaths(urls, urlInterfaceName, instructions, sharedInterfaces);

      rootPropertyMembers.push(
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(urlPropName),
          undefined,
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(urlInterfaceName))
        )
      );

      instructions.push(
        ts.factory.createInterfaceDeclaration(
          [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
          ts.factory.createIdentifier(sanitiseInterfaceName(urlInterfaceName)),
          undefined,
          undefined,
          urlInterfacePropertyMembers
        )
      );
    }
  }

  instructions.push(
    ts.factory.createInterfaceDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(sanitiseInterfaceName(pascalCase(info.title))),
      undefined,
      undefined,
      rootPropertyMembers
    )
  );

  return instructions;
};


export default createTypes;
