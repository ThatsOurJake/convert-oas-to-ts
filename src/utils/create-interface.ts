import ts, { Identifier } from "typescript";
import pascalCase from "./pascal-case";

const MAP = {
  'string': (propName: string) => ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  ),
  'number': (propName: string) => ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
  ),
  'boolean': (propName: string) => ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
  ),
  'object': (propName: string, interfaceName: Identifier) => ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    ts.factory.createTypeReferenceNode(
      interfaceName,
      undefined,
    ),
  ),
  'default': (propName: string) => ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier(propName),
    undefined,
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  ),
}

const RESERVED_TYPESCRIPT_CHARACTERS = ['?', '!', '[]', '<', '>'];

const createInterface = (obj: Record<string, unknown>, objectName: string, interfaces: ts.InterfaceDeclaration[]) => {
  const instructions: ts.PropertySignature[] = [];

  for (let _key of Object.keys(obj)) {
    const value = obj[_key]!;

    if (ts.isPropertySignature(value as ts.Node)) {
      instructions.push(value as ts.PropertySignature);
      continue;
    }

    const objectNameContainsReservedCharacters = RESERVED_TYPESCRIPT_CHARACTERS.some((char) => _key.includes(char));
    const key = objectNameContainsReservedCharacters ? `"${_key}"` : _key;

    switch (typeof value) {
      case "string":
        instructions.push(MAP.string(key));
        break;
      case "bigint":
      case "number":
        instructions.push(MAP.number(key));
        break;
      case "boolean":
        instructions.push(MAP.boolean(key));
        break;
      case "object":
        const childInterfaceName = pascalCase(`${objectName} ${_key}`);
        const childInterface = createInterface(value as Record<string, unknown>, childInterfaceName, interfaces);
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
