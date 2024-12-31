import ts, { Identifier } from "typescript";
import pascalCase from "./pascal-case";
import { Schema } from "./parse-open-api-spec";

const createPropertySignature = (propName: string, typeNode: ts.TypeNode) => 
  ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    typeNode
  );

const MAP = {
  'string': (propName: string) => createPropertySignature(propName, ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
  'number': (propName: string) => createPropertySignature(propName, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
  'boolean': (propName: string) => createPropertySignature(propName, ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)),
  'object': (propName: string, interfaceName: Identifier) => createPropertySignature(propName, ts.factory.createTypeReferenceNode(interfaceName, undefined)),
  'ref': (propName: string, interfaceName: string) => createPropertySignature(propName, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(interfaceName), undefined)),
  'default': (propName: string) => createPropertySignature(propName, ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)),
};

const RESERVED_TYPESCRIPT_CHARACTERS = ['?', '!', '[]', '<', '>'];

const createInterface = (properties: Record<string, Schema>, objectName: string, interfaces: ts.InterfaceDeclaration[]): ts.InterfaceDeclaration => {
  const instructions: ts.PropertySignature[] = [];

  for (const _key of Object.keys(properties)) {
    const value = properties[_key]!;
    const objectNameContainsReservedCharacters = RESERVED_TYPESCRIPT_CHARACTERS.some((char) => _key.includes(char));
    const key = objectNameContainsReservedCharacters ? `"${_key}"` : _key;

    if (value.$ref) {
      const refKey = value.$ref.split('/').pop();
      if (refKey) {
        instructions.push(MAP.ref(key, pascalCase(refKey)));
      }
      continue;
    }

    switch (value.type) {
      case "string":
        instructions.push(MAP.string(key));
        break;
      case "number":
      case "integer":
        instructions.push(MAP.number(key));
        break;
      case "boolean":
        instructions.push(MAP.boolean(key));
        break;
      case "object":
        const childInterfaceName = pascalCase(`${objectName} ${_key}`);
        const childInterface = createInterface(value.properties!, childInterfaceName, interfaces);
        interfaces.push(childInterface);
        instructions.push(MAP.object(key, childInterface.name));
        break;
      default:
        instructions.push(MAP.default(key));
        break;
    }
  }

  return ts.factory.createInterfaceDeclaration(
    undefined,
    ts.factory.createIdentifier(objectName),
    undefined,
    undefined,
    instructions,
  );
};

export default createInterface;
