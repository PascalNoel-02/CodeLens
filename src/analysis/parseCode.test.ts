import { describe, expect, it } from "vitest";
import ts from "typescript";
import { findNodeAtPosition, findRelevantStatement, parseCode } from "./parseCode";

describe("parseCode", () => {
  it("parses valid code into a source file", () => {
    const sourceFile = parseCode("const user = getUser();");
    expect(sourceFile.kind).toBe(ts.SyntaxKind.SourceFile);
    expect(sourceFile.statements.length).toBe(1);
  });

  it("does not throw on invalid or incomplete code", () => {
    expect(() => parseCode("const user = ")).not.toThrow();
    expect(() => parseCode("!!! not valid typescript (((")).not.toThrow();
  });
});

describe("findNodeAtPosition", () => {
  it("returns the innermost node at the given position", () => {
    const code = "const user = getUser();";
    const sourceFile = parseCode(code);
    const position = code.indexOf("getUser");

    const node = findNodeAtPosition(sourceFile, position);

    expect(ts.isIdentifier(node)).toBe(true);
    expect(node.getText()).toBe("getUser");
  });

  it("returns the source file itself for a position outside the code", () => {
    const code = "const user = getUser();";
    const sourceFile = parseCode(code);

    const node = findNodeAtPosition(sourceFile, code.length + 100);

    expect(node).toBe(sourceFile);
  });
});

describe("findRelevantStatement", () => {
  it("walks up to the VariableStatement from a node inside the initializer", () => {
    const code = "const user = getUser();";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("getUser"));

    const statement = findRelevantStatement(node);

    expect(ts.isVariableStatement(statement)).toBe(true);
  });

  it("walks up to the ExpressionStatement from a node inside the call", () => {
    const code = "console.log(user);";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("user"));

    const statement = findRelevantStatement(node);

    expect(ts.isExpressionStatement(statement)).toBe(true);
  });

  it("walks up to the ReturnStatement from a node inside the return expression", () => {
    const code = "return user.name;";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("name"));

    const statement = findRelevantStatement(node);

    expect(ts.isReturnStatement(statement)).toBe(true);
  });

  it("walks up to the ReturnStatement instead of the enclosing FunctionDeclaration", () => {
    const code = "function getUser() {\n  return user;\n}";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("user;"));

    const statement = findRelevantStatement(node);

    expect(ts.isReturnStatement(statement)).toBe(true);
  });

  it("walks up to the FunctionDeclaration when no closer statement exists", () => {
    const code = "function getUser() {\n  return user;\n}";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("getUser"));

    const statement = findRelevantStatement(node);

    expect(ts.isFunctionDeclaration(statement)).toBe(true);
  });

  it("returns the node itself when it is already a relevant statement", () => {
    const sourceFile = parseCode("console.log(user);");
    const expressionStatement = sourceFile.statements[0];

    const statement = findRelevantStatement(expressionStatement);

    expect(statement).toBe(expressionStatement);
  });

  it("walks up to the IfStatement from a node inside the condition", () => {
    const code = "if (user.name) {\n  return user.name;\n}";
    const sourceFile = parseCode(code);
    const node = findNodeAtPosition(sourceFile, code.indexOf("user.name"));

    const statement = findRelevantStatement(node);

    expect(ts.isIfStatement(statement)).toBe(true);
  });

  it("falls back to the original node when no relevant ancestor exists", () => {
    const sourceFile = parseCode("type UserId = number;");
    const node = findNodeAtPosition(sourceFile, sourceFile.getText().indexOf("UserId"));

    const statement = findRelevantStatement(node);

    expect(statement).toBe(node);
  });
});
