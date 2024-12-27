import ts from "typescript";
import createInterface from "./create-interface";

const tsObject = (obj: Record<string, unknown>, baseObjectName: string) => {
  const interfaces: ts.InterfaceDeclaration[] = [];

  const rootInterface = createInterface(obj, baseObjectName, interfaces);
  interfaces.push(rootInterface);

  return interfaces;
};

export default tsObject;
