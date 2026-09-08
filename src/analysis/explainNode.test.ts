import { describe, expect, it } from "vitest";
import { explainNode } from "./explainNode";
import { parseCode } from "./parseCode";
import ts from "typescript";

function getFirstVariableDeclaration(code: string): ts.VariableDeclaration {
  const sourceFile = parseCode(code);
  const statement = sourceFile.statements[0] as ts.VariableStatement;
  return statement.declarationList.declarations[0];
}

describe("explainNode", () => {
  it("explains a variable declaration with a call expression initializer", () => {
    const declaration = getFirstVariableDeclaration("const user = getUser();");

    const explanation = explainNode(declaration);

    expect(explanation.kind).toBe("VariableDeclaration");
    expect(explanation.children).toEqual([
      { kind: "name", label: "user", children: [] },
      {
        kind: "initializer",
        children: [
          {
            kind: "CallExpression",
            label: "getUser",
            summary: "Funktion wird aufgerufen",
            children: [],
          },
        ],
      },
    ]);
  });

  it("explains a call expression on its own", () => {
    const declaration = getFirstVariableDeclaration("const user = getUser();");
    const callExpression = declaration.initializer as ts.CallExpression;

    const explanation = explainNode(callExpression);

    expect(explanation).toEqual({
      kind: "CallExpression",
      label: "getUser",
      summary: "Funktion wird aufgerufen",
      children: [],
    });
  });

  it("explains a variable declaration without an initializer", () => {
    const declaration = getFirstVariableDeclaration("let user;");

    const explanation = explainNode(declaration);

    expect(explanation).toEqual({
      kind: "VariableDeclaration",
      summary: "Variable wird erstellt",
      children: [{ kind: "name", label: "user", children: [] }],
    });
  });

  it("falls back to a generic explanation for unhandled node kinds", () => {
    const sourceFile = parseCode("if (true) {}");
    const ifStatement = sourceFile.statements[0];

    const explanation = explainNode(ifStatement);

    expect(explanation.kind).toBe("IfStatement");
  });

  it("keeps all children of an unhandled node in the generic fallback", () => {
    const sourceFile = parseCode("[a, b];");
    const statement = sourceFile.statements[0] as ts.ExpressionStatement;
    const arrayLiteral = statement.expression;

    const explanation = explainNode(arrayLiteral);

    expect(explanation.kind).toBe("ArrayLiteralExpression");
    expect(explanation.children).toEqual([
      { kind: "Identifier", label: "a", children: [] },
      { kind: "Identifier", label: "b", children: [] },
    ]);
  });

  it("explains an identifier on its own", () => {
    const sourceFile = parseCode("user;");
    const statement = sourceFile.statements[0] as ts.ExpressionStatement;
    const identifier = statement.expression as ts.Identifier;

    const explanation = explainNode(identifier);

    expect(explanation).toEqual({ kind: "Identifier", label: "user", children: [] });
  });

  it("explains a property access expression", () => {
    const sourceFile = parseCode("user.name;");
    const statement = sourceFile.statements[0] as ts.ExpressionStatement;
    const propertyAccess = statement.expression as ts.PropertyAccessExpression;

    const explanation = explainNode(propertyAccess);

    expect(explanation).toEqual({
      kind: "PropertyAccessExpression",
      summary: "Zugriff auf eine Eigenschaft",
      children: [
        { kind: "object", children: [{ kind: "Identifier", label: "user", children: [] }] },
        { kind: "property", label: "name", children: [] },
      ],
    });
  });

  it("explains a binary expression with both operands", () => {
    const sourceFile = parseCode("x > 10;");
    const statement = sourceFile.statements[0] as ts.ExpressionStatement;
    const binaryExpression = statement.expression as ts.BinaryExpression;

    const explanation = explainNode(binaryExpression);

    expect(explanation.kind).toBe("BinaryExpression");
    expect(explanation.summary).toBe("Vergleich/Berechnung von zwei Werten");
    expect(explanation.children).toEqual([
      { kind: "Identifier", label: "x", children: [] },
      { kind: "FirstLiteralToken", children: [] },
    ]);
  });

  it("explains a return statement with its expression", () => {
    const sourceFile = parseCode("function f() { return user.name; }");
    const functionDeclaration = sourceFile.statements[0] as ts.FunctionDeclaration;
    const returnStatement = functionDeclaration.body!.statements[0] as ts.ReturnStatement;

    const explanation = explainNode(returnStatement);

    expect(explanation.kind).toBe("ReturnStatement");
    expect(explanation.summary).toBe("Rückgabewert der Funktion");
    expect(explanation.children).toEqual([
      {
        kind: "PropertyAccessExpression",
        summary: "Zugriff auf eine Eigenschaft",
        children: [
          { kind: "object", children: [{ kind: "Identifier", label: "user", children: [] }] },
          { kind: "property", label: "name", children: [] },
        ],
      },
    ]);
  });

  it("explains a function declaration with its body statements", () => {
    const sourceFile = parseCode("function getUser() { return user; }");
    const functionDeclaration = sourceFile.statements[0] as ts.FunctionDeclaration;

    const explanation = explainNode(functionDeclaration);

    expect(explanation.kind).toBe("FunctionDeclaration");
    expect(explanation.label).toBe("getUser");
    expect(explanation.summary).toBe("Funktion wird definiert");
    expect(explanation.children).toEqual([
      {
        kind: "ReturnStatement",
        summary: "Rückgabewert der Funktion",
        children: [{ kind: "Identifier", label: "user", children: [] }],
      },
    ]);
  });

  it("explains a function combining a condition, property access and return statements", () => {
    const sourceFile = parseCode(
      `function getUserName(user) {
        if (user.age > 18) {
          return user.name;
        }
        return "unknown";
      }`,
    );
    const functionDeclaration = sourceFile.statements[0] as ts.FunctionDeclaration;

    const explanation = explainNode(functionDeclaration);

    expect(explanation.kind).toBe("FunctionDeclaration");
    expect(explanation.label).toBe("getUserName");

    const [ifStatement, fallbackReturn] = explanation.children;

    // IfStatement has no dedicated case yet, so it falls back to all of its
    // direct children: the condition (a BinaryExpression, which still
    // explains both operands) and the "then" block containing the return.
    expect(ifStatement.kind).toBe("IfStatement");
    expect(ifStatement.children).toEqual([
      {
        kind: "BinaryExpression",
        summary: "Vergleich/Berechnung von zwei Werten",
        children: [
          {
            kind: "PropertyAccessExpression",
            summary: "Zugriff auf eine Eigenschaft",
            children: [
              { kind: "object", children: [{ kind: "Identifier", label: "user", children: [] }] },
              { kind: "property", label: "age", children: [] },
            ],
          },
          { kind: "FirstLiteralToken", children: [] },
        ],
      },
      {
        kind: "Block",
        children: [
          {
            kind: "ReturnStatement",
            summary: "Rückgabewert der Funktion",
            children: [
              {
                kind: "PropertyAccessExpression",
                summary: "Zugriff auf eine Eigenschaft",
                children: [
                  {
                    kind: "object",
                    children: [{ kind: "Identifier", label: "user", children: [] }],
                  },
                  { kind: "property", label: "name", children: [] },
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(fallbackReturn).toEqual({
      kind: "ReturnStatement",
      summary: "Rückgabewert der Funktion",
      children: [{ kind: "StringLiteral", children: [] }],
    });
  });
});
