import ts from "typescript";
import createInterface from "./create-interface";
import { Schema } from "./parse-open-api-spec";

const tsObject = (properties: Record<string, Schema>, baseObjectName: string) => {
  const interfaces: ts.InterfaceDeclaration[] = [];

  const rootInterface = createInterface(properties, baseObjectName, interfaces);
  interfaces.push(rootInterface);

  return interfaces;
};

export default tsObject;
