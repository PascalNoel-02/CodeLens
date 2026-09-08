import ts from "typescript";

export type Explanation = {
  kind: string;
  label?: string;
  summary?: string;
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
    return { kind: "VariableDeclaration", summary: "Variable wird erstellt", children };
  }

  if (ts.isCallExpression(node)) {
    return {
      kind: "CallExpression",
      label: node.expression.getText(),
      summary: "Funktion wird aufgerufen",
      children: [],
    };
  }

  if (ts.isIdentifier(node)) {
    return { kind: "Identifier", label: node.text, children: [] };
  }

  if (ts.isPropertyAccessExpression(node)) {
    return {
      kind: "PropertyAccessExpression",
      summary: "Zugriff auf eine Eigenschaft",
      children: [
        { kind: "object", children: [explainNode(node.expression)] },
        { kind: "property", label: node.name.text, children: [] },
      ],
    };
  }

  if (ts.isBinaryExpression(node)) {
    return {
      kind: "BinaryExpression",
      summary: "Vergleich/Berechnung von zwei Werten",
      children: [explainNode(node.left), explainNode(node.right)],
    };
  }

  if (ts.isReturnStatement(node)) {
    return {
      kind: "ReturnStatement",
      summary: "Rückgabewert der Funktion",
      children: node.expression ? [explainNode(node.expression)] : [],
    };
  }

  if (ts.isFunctionDeclaration(node)) {
    return {
      kind: "FunctionDeclaration",
      label: node.name?.text,
      summary: "Funktion wird definiert",
      children: node.body ? node.body.statements.map(explainNode) : [],
    };
  }

  if (ts.isIfStatement(node)) {
    const children: Explanation[] = [
      { kind: "condition", children: [explainNode(node.expression)] },
      { kind: "then", children: [explainNode(node.thenStatement)] },
    ];
    if (node.elseStatement) {
      children.push({ kind: "else", children: [explainNode(node.elseStatement)] });
    }
    return { kind: "IfStatement", summary: "Bedingte Verzweigung", children };
  }

  if (ts.isObjectLiteralExpression(node)) {
    return {
      kind: "ObjectLiteralExpression",
      summary: "Objekt wird erstellt",
      children: node.properties.map(explainNode),
    };
  }

  if (ts.isArrayLiteralExpression(node)) {
    return {
      kind: "ArrayLiteralExpression",
      summary: "Array wird erstellt",
      children: node.elements.map(explainNode),
    };
  }

  // No specific explanation for this node kind yet: fall back to all of its
  // direct children so the user still sees something instead of a dead end.
  const children: ts.Node[] = [];
  ts.forEachChild(node, (child) => {
    children.push(child);
  });
  return { kind: ts.SyntaxKind[node.kind], children: children.map(explainNode) };
}
