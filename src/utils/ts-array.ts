import ts from "typescript";

import pascalCase from "./pascal-case";
import { Schema } from "./parse-open-api-spec";
import tsObject from "./ts-object";

const createArrayTypeNode = (typeNode: ts.TypeNode) =>
  ts.factory.createArrayTypeNode(typeNode);

const createUnknownType = () => [
  createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword))
];

const createUnionTypeNode = (enumValues: string[]) =>
  ts.factory.createUnionTypeNode(
    enumValues.map((value) =>
      ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(value)
      )
    )
  );

const tsArray = (items: Schema, propertyName: string) => {
  if (items.$ref) {
    const refName = pascalCase(items.$ref.split("/").pop()!);
    return [
      createArrayTypeNode(
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(refName),
          undefined
        )
      )
    ];
  }

  if (items.type === "string") {
    const { enum: enumValues } = items;
    return [
      createArrayTypeNode(
        enumValues ? createUnionTypeNode(enumValues) : ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      )
    ];
  }

  if (items.type === "object") {
    const { properties } = items;

    if (!properties) {
      return createUnknownType();
    };

    const interfaces = tsObject(properties, pascalCase(`${propertyName}-item`));
    const rootInterface = interfaces[interfaces.length - 1]!;

    return [
      ...interfaces,
      createArrayTypeNode(
        ts.factory.createTypeReferenceNode(
          rootInterface.name as ts.Identifier,
          undefined
        )
      )
    ];
  }

  if (items.type === "array") {
    return tsArray(items.items!, propertyName);
  }

  return createUnknownType();
};

export default tsArray;
