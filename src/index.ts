import * as ts from 'typescript';

import parseOpenApiSpec from './utils/parse-open-api-spec';
import createTypes from './create-types';
import { writeFileSync } from 'node:fs';

(async () => {
  const res = parseOpenApiSpec('spec.yaml');

  const { info: { title, version }} = res;
  const fileName = `${title}-${version}.d.ts`;

  const instructions = createTypes(res);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const result = printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(instructions), ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest));

  // console.log(result);
  writeFileSync(fileName, result);
})();
