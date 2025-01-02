import ts from "typescript";
import pascalCase from "./pascal-case";
import { Schema } from "./parse-open-api-spec";
import tsObject from "./ts-object";

const createUnknownType = (propertyName: string) => [
  ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(propertyName),
    undefined,
    ts.factory.createArrayTypeNode(
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
    )
  ),
];

const createTypeAliasDeclaration = (
  name: string,
  typeNode: ts.TypeNode
) => ts.factory.createTypeAliasDeclaration(
  undefined,
  ts.factory.createIdentifier(name),
  undefined,
  typeNode
);

const createArrayTypeNode = (typeNode: ts.TypeNode) =>
  ts.factory.createArrayTypeNode(typeNode);

const createUnionTypeNode = (enumValues: string[]) =>
  ts.factory.createUnionTypeNode(
    enumValues.map((value) =>
      ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(value)
      )
    )
  );

const tsArray = (items: Schema, propertyName: string) => {
  const arrRefName = pascalCase(`${propertyName}-items`);

  if (items.$ref) {
    const refName = pascalCase(items.$ref.split("/").pop()!);
    return [
      createTypeAliasDeclaration(
        arrRefName,
        createArrayTypeNode(
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(refName),
            undefined
          )
        )
      ),
    ];
  }

  if (items.type === "string") {
    const { enum: enumValues } = items;
    return [
      createTypeAliasDeclaration(
        arrRefName,
        createArrayTypeNode(
          enumValues ? createUnionTypeNode(enumValues) : ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        )
      ),
    ];
  }

  if (items.type === "object") {
    const { properties } = items;
    if (!properties) return createUnknownType(arrRefName);

    const interfaces = tsObject(properties, pascalCase(`${propertyName}-item`));
    const rootInterface = interfaces[interfaces.length - 1]!;

    return [
      ...interfaces,
      createTypeAliasDeclaration(
        arrRefName,
        createArrayTypeNode(
          ts.factory.createTypeReferenceNode(
            rootInterface.name as ts.Identifier,
            undefined
          )
        )
      ),
    ];
  }

  if (items.type === "array") {
    return tsArray(items.items!, propertyName);
  }

  return createUnknownType(arrRefName);
};

export default tsArray;
