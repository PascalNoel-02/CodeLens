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

  if (ts.isForStatement(node)) {
    const children: Explanation[] = [];
    if (node.initializer) {
      children.push({ kind: "initializer", children: [explainNode(node.initializer)] });
    }
    if (node.condition) {
      children.push({ kind: "condition", children: [explainNode(node.condition)] });
    }
    if (node.incrementor) {
      children.push({ kind: "incrementor", children: [explainNode(node.incrementor)] });
    }
    children.push({ kind: "body", children: [explainNode(node.statement)] });
    return { kind: "ForStatement", summary: "Schleife wird ausgeführt", children };
  }

  if (ts.isWhileStatement(node)) {
    return {
      kind: "WhileStatement",
      summary: "Schleife läuft, solange die Bedingung erfüllt ist",
      children: [
        { kind: "condition", children: [explainNode(node.expression)] },
        { kind: "body", children: [explainNode(node.statement)] },
      ],
    };
  }

  if (ts.isDoStatement(node)) {
    return {
      kind: "DoStatement",
      summary: "Schleife wird mindestens einmal ausgeführt",
      children: [
        { kind: "body", children: [explainNode(node.statement)] },
        { kind: "condition", children: [explainNode(node.expression)] },
      ],
    };
  }

  if (ts.isArrowFunction(node)) {
    return {
      kind: "ArrowFunction",
      summary: "Arrow-Funktion wird definiert",
      children: [
        { kind: "parameters", children: node.parameters.map(explainNode) },
        { kind: "body", children: [explainNode(node.body)] },
      ],
    };
  }

  if (ts.isFunctionExpression(node)) {
    return {
      kind: "FunctionExpression",
      summary: "Funktion wird als Ausdruck definiert",
      children: [
        { kind: "parameters", children: node.parameters.map(explainNode) },
        { kind: "body", children: [explainNode(node.body)] },
      ],
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
