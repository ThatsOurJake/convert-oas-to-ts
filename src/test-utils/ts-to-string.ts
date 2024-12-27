import ts from "typescript";

export const instructionsToString = (instructions: ts.Statement[]) => {
  const srcFile = ts.factory.createSourceFile(instructions, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(srcFile).replace(/(?:\r\n|\r|\n)/g, ' ').replace( /  +/g, ' ').trim();
};

export const propertyToString = (instruction: ts.PropertySignature) => {
  const srcFile = ts.factory.createSourceFile([], ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printNode(ts.EmitHint.Unspecified, instruction, srcFile).replace(/(?:\r\n|\r|\n)/g, ' ').replace( /  +/g, ' ').trim();
};
