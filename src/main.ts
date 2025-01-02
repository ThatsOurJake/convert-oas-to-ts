import * as ts from 'typescript';

import parseOpenApiSpec from './utils/parse-open-api-spec';
import createTypes from './create-types';
import pascalCase from './utils/pascal-case';

export interface Options {
  filePath?: string;
  contents?: string;
}

export interface OpenApiTsResult {
  types: string;
  specInfo: {
    title: string;
    version: string;
    typeRoot: string;
  }
}

export default (options: Options): OpenApiTsResult => {
  const res = parseOpenApiSpec(options);

  const instructions = createTypes(res);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  return {
    types: printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(instructions), ts.createSourceFile('temp.d.ts', '', ts.ScriptTarget.Latest),),
    specInfo: {
      ...res.info,
      typeRoot: pascalCase(res.info.title),
    },
  };
};
