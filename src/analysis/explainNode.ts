import ts from "typescript";

export type Explanation = {
  kind: string;
  label?: string;
  children: Explanation[];
};

export function explainNode(node: ts.Node): Explanation {
  if (ts.isVariableDeclaration(node)) {
    const children: Explanation[] = [
      { kind: "name", label: node.name.getText(), children: [] },
    ];
    if (node.initializer) {
      children.push({
        kind: "initializer",
        children: [explainNode(node.initializer)],
      });
    }
    return { kind: "VariableDeclaration", children };
  }

  if (ts.isCallExpression(node)) {
    return {
      kind: "CallExpression",
      label: node.expression.getText(),
      children: [],
    };
  }

  if (ts.isIdentifier(node)) {
    return { kind: "Identifier", label: node.text, children: [] };
  }

  // No specific explanation for this node kind yet: fall back to its first
  // child so the user still sees something instead of a dead end.
  const child = ts.forEachChild(node, (child) => child);
  if (child) {
    return { kind: ts.SyntaxKind[node.kind], children: [explainNode(child)] };
  }
  return { kind: ts.SyntaxKind[node.kind], children: [] };
}
