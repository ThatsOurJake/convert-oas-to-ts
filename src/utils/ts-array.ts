import ts from "typescript";

import pascalCase from "./pascal-case";
import { Schema } from "./parse-open-api-spec";
import tsObject from "./ts-object";

const createUnknownType = (propertyName: string) => {
  return [
    ts.factory.createTypeAliasDeclaration(
      undefined,
      ts.factory.createIdentifier(propertyName),
      undefined,
      ts.factory.createArrayTypeNode(
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      )
    ),
  ];
};

const tsArray = (items: Schema, propertyName: string) => {
  const arrRefName = pascalCase(propertyName);

  if (items.$ref) {
    const ref = items.$ref.split("/").pop()!;
    const refName = pascalCase(ref);

    return [
      ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(arrRefName),
        undefined,
        ts.factory.createArrayTypeNode(
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(refName),
            undefined
          ),
        )
      ),
    ];
  }

  if (items.type === "string") {
    const { enum: enumValues } = items;

    if (!enumValues) {
      return [
        ts.factory.createTypeAliasDeclaration(
          undefined,
          ts.factory.createIdentifier(arrRefName),
          undefined,
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        ),
      ];
    }

    return [
      ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(arrRefName),
        undefined,
        ts.factory.createUnionTypeNode(
          enumValues.map((value) =>
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral(value)
            )
          )
        )
      ),
    ];
  }

  if (items.type === "object") {
    const { properties } = items;

    if (!properties) {
      return createUnknownType(arrRefName);
    }

    const interfaces = tsObject(properties!, pascalCase(`${propertyName}-item`));
    const rootInterface = interfaces[interfaces.length - 1]!;

    const arrayType = ts.factory.createTypeAliasDeclaration(
      undefined,
      ts.factory.createIdentifier(arrRefName),
      undefined,
      ts.factory.createArrayTypeNode(
        ts.factory.createTypeReferenceNode(
          rootInterface.name as ts.Identifier,
          undefined
        )
      )
    );

    return [...interfaces, arrayType];
  }

  if (items.type === "array") {
    return tsArray(items.items!, propertyName);
  }

  return createUnknownType(arrRefName);
};

export default tsArray;
