import ts from "typescript";

import { properties, swaggerTypes } from ".";
import tsArray from "./utils/ts-array";
import tsObject from "./utils/ts-object";

const convertObject = (key: string, type: swaggerTypes) => {
  switch(type) {
    case "string":
      return {
        [key]: 'string',
      }
    case "number":
    case "integer":
      return {
        [key]: 0
      }
    case "boolean":
      return {
        [key]: false
      }
    default:
      return {
        [key]: () => {}
      }
  }
};

const convertArray = (type: swaggerTypes) => {
  switch(type) {
    case "string":
      return ['string']
    case "number":
    case "integer":
      return [0];
    case "boolean":
      return [false];
    default:
      return [() => {}]
  }
};

const createTypes = (rootType: swaggerTypes, typeName: string, baseInstructions: ts.TypeElement[], properties: Record<string, properties>) => {
  if (rootType === 'string') {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(typeName),
      undefined,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    );
  }

  if (rootType === 'number' || rootType === 'integer') {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(typeName),
      undefined,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
    );
  }

  if (rootType === 'boolean') {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(typeName),
      undefined,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
    );
  }

  // if (rootType === 'array') {
  // }

  // if (rootType === 'object') {
  //   let obj = {};

  //   for (const key in properties) {
  //     if (Object.prototype.hasOwnProperty.call(properties, key)) {
  //       const element = properties[key];
        
  //       obj = {
  //         ...obj,
  //         ...convertObject(key, element!.type),
  //       }
  //     }
  //   }

  //   return tsObject(obj, typeName);
  // }

  return [];
};

export default createTypes;
