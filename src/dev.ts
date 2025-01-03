import ts from "typescript";
import createTypes from "./create-types";
import parseOpenApiSpec from "./utils/parse-open-api-spec";
import { writeFileSync } from "fs";
import path from "path";

(async () => {
  const res = parseOpenApiSpec({
    filePath: 'spec.yaml',
  });

  const { info: { title, version }} = res;
  const fileName = `${title}-${version}.ts`;

  const instructions = createTypes(res);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const result = printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(instructions), ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest),);

  console.log(result);
  writeFileSync(path.resolve('dev', fileName), result);
})();
