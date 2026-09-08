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
        children: [{ kind: "CallExpression", label: "getUser", children: [] }],
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
      children: [],
    });
  });

  it("explains a variable declaration without an initializer", () => {
    const declaration = getFirstVariableDeclaration("let user;");

    const explanation = explainNode(declaration);

    expect(explanation).toEqual({
      kind: "VariableDeclaration",
      children: [{ kind: "name", label: "user", children: [] }],
    });
  });

  it("falls back to a generic explanation for unhandled node kinds", () => {
    const sourceFile = parseCode("if (true) {}");
    const ifStatement = sourceFile.statements[0];

    const explanation = explainNode(ifStatement);

    expect(explanation.kind).toBe("IfStatement");
  });

  it("explains an identifier on its own", () => {
    const sourceFile = parseCode("user;");
    const statement = sourceFile.statements[0] as ts.ExpressionStatement;
    const identifier = statement.expression as ts.Identifier;

    const explanation = explainNode(identifier);

    expect(explanation).toEqual({ kind: "Identifier", label: "user", children: [] });
  });
});
