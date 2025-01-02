import ts from "typescript";
import createTypes from "./create-types";
import parseOpenApiSpec from "./utils/parse-open-api-spec";

(async () => {
  const res = parseOpenApiSpec({
    filePath: 'spec.yaml',
  });

  const { info: { title, version }} = res;
  const fileName = `${title}-${version}.d.ts`;

  const instructions = createTypes(res);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const result = printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(instructions), ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest),);

  console.log(result);
})();
