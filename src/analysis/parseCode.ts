import ts from "typescript";

export function parseCode(code: string): ts.SourceFile {
  return ts.createSourceFile("example.ts", code, ts.ScriptTarget.Latest, true);
}

// Walks down the AST to find the innermost node that contains the given
// character position, e.g. where the user's cursor is in the editor.
export function findNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node {
  function findInChildren(node: ts.Node): ts.Node {
    const child = ts.forEachChild(node, (child) => {
      if (position >= child.getStart(sourceFile) && position < child.getEnd()) {
        return findInChildren(child);
      }
      return undefined;
    });
    return child ?? node;
  }

  return findInChildren(sourceFile);
}

// Walks up from a specific AST node to the nearest enclosing statement or
// declaration that is more useful to explain to the user than the raw node
// under the cursor (e.g. the whole `const user = getUser();` instead of just
// the `getUser` identifier).
export function findRelevantStatement(node: ts.Node): ts.Node {
  let current: ts.Node | undefined = node;
  while (current && !ts.isSourceFile(current)) {
    if (
      ts.isVariableStatement(current) ||
      ts.isExpressionStatement(current) ||
      ts.isReturnStatement(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isIfStatement(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return node;
}
