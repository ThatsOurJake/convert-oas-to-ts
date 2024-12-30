import ts from "typescript";

import pascalCase from "./pascal-case";
import createInterface from "./create-interface";

const MAP = {
  string: () => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  number: () => ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  boolean: () => ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
  default: () => ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
};

const tsArray = (arrName: string, arr: Array<unknown>, prefix: string = '') => {
  const types = new Set<string>();

  const keywordTypes: ts.TypeNode[] = [];
  const interfaces: ts.InterfaceDeclaration[] = [];
  let index = 0;

  for (let value of arr) {
    const t = typeof value;

    const valueHash = JSON.stringify(value);

    if (types.has(t) || types.has(valueHash)) {
      continue;
    }

    t === "object" ? types.add(valueHash) : types.add(t);

    if (t === "object") {
      const propName = prefix ? `${prefix}${pascalCase(arrName)}` : pascalCase(arrName);
      const interfaceName = arr.length > 1 ? `${propName} Arr${index}` : `${propName}Arr`;
      const childInterfaceName = pascalCase(interfaceName);
      const childInterface = createInterface(
        value as Record<string, unknown>,
        childInterfaceName,
        interfaces
      );
      interfaces.push(childInterface);
      keywordTypes.push(
        ts.factory.createTypeReferenceNode(childInterface.name)
      );
      index++;
      continue;
    }

    switch (t) {
      case "string":
        keywordTypes.push(MAP.string());
        break;
      case "bigint":
      case "number":
        keywordTypes.push(MAP.number());
        break;
      case "boolean":
        keywordTypes.push(MAP.boolean());
        break;
      default:
        keywordTypes.push(MAP.default());
        break;
    }
  }

  if (keywordTypes.length === 0) {
    return {
      interfaces,
      property: ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(arrName),
        undefined,
        ts.factory.createArrayTypeNode(MAP.default())
      ),
    };
  }

  const propType =
    keywordTypes.length > 1
      ? ts.factory.createParenthesizedType(
          ts.factory.createUnionTypeNode(keywordTypes)
        )
      : keywordTypes[0]!;

  return {
    interfaces,
    property: ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(arrName),
      undefined,
      ts.factory.createArrayTypeNode(propType)
    ),
  };
};

export default tsArray;
