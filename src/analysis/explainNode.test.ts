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

    expect(ifStatement.kind).toBe("IfStatement");
    expect(ifStatement.summary).toBe("Bedingte Verzweigung");
    expect(ifStatement.children).toEqual([
      {
        kind: "condition",
        children: [
          {
            kind: "BinaryExpression",
            summary: "Vergleich/Berechnung von zwei Werten",
            children: [
              {
                kind: "PropertyAccessExpression",
                summary: "Zugriff auf eine Eigenschaft",
                children: [
                  {
                    kind: "object",
                    children: [{ kind: "Identifier", label: "user", children: [] }],
                  },
                  { kind: "property", label: "age", children: [] },
                ],
              },
              { kind: "FirstLiteralToken", children: [] },
            ],
          },
        ],
      },
      {
        kind: "then",
        children: [
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
        ],
      },
    ]);

    expect(fallbackReturn).toEqual({
      kind: "ReturnStatement",
      summary: "Rückgabewert der Funktion",
      children: [{ kind: "StringLiteral", children: [] }],
    });
  });

  it("explains an if statement with condition, then and else branches", () => {
    const sourceFile = parseCode(
      `if (age > 18) {
        return "adult";
      } else {
        return "minor";
      }`,
    );
    const ifStatement = sourceFile.statements[0] as ts.IfStatement;

    const explanation = explainNode(ifStatement);

    expect(explanation.kind).toBe("IfStatement");
    expect(explanation.summary).toBe("Bedingte Verzweigung");
    expect(explanation.children).toEqual([
      {
        kind: "condition",
        children: [
          {
            kind: "BinaryExpression",
            summary: "Vergleich/Berechnung von zwei Werten",
            children: [
              { kind: "Identifier", label: "age", children: [] },
              { kind: "FirstLiteralToken", children: [] },
            ],
          },
        ],
      },
      {
        kind: "then",
        children: [
          {
            kind: "Block",
            children: [
              {
                kind: "ReturnStatement",
                summary: "Rückgabewert der Funktion",
                children: [{ kind: "StringLiteral", children: [] }],
              },
            ],
          },
        ],
      },
      {
        kind: "else",
        children: [
          {
            kind: "Block",
            children: [
              {
                kind: "ReturnStatement",
                summary: "Rückgabewert der Funktion",
                children: [{ kind: "StringLiteral", children: [] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("explains an object literal with its properties", () => {
    const sourceFile = parseCode(
      `const user = {
        name: "Alice",
        age: 30
      };`,
    );
    const statement = sourceFile.statements[0] as ts.VariableStatement;
    const objectLiteral = statement.declarationList.declarations[0]
      .initializer as ts.ObjectLiteralExpression;

    const explanation = explainNode(objectLiteral);

    expect(explanation.kind).toBe("ObjectLiteralExpression");
    expect(explanation.summary).toBe("Objekt wird erstellt");
    expect(explanation.children).toEqual([
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "name", children: [] },
          { kind: "StringLiteral", children: [] },
        ],
      },
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "age", children: [] },
          { kind: "FirstLiteralToken", children: [] },
        ],
      },
    ]);
  });

  it("explains an array literal with all of its elements", () => {
    const sourceFile = parseCode("const users = [user, admin, guest];");
    const statement = sourceFile.statements[0] as ts.VariableStatement;
    const arrayLiteral = statement.declarationList.declarations[0]
      .initializer as ts.ArrayLiteralExpression;

    const explanation = explainNode(arrayLiteral);

    expect(explanation.kind).toBe("ArrayLiteralExpression");
    expect(explanation.summary).toBe("Array wird erstellt");
    expect(explanation.children).toEqual([
      { kind: "Identifier", label: "user", children: [] },
      { kind: "Identifier", label: "admin", children: [] },
      { kind: "Identifier", label: "guest", children: [] },
    ]);
  });

  it("explains a for statement with initializer, condition, incrementor and body", () => {
    const sourceFile = parseCode("for (let i = 0; i < 3; i++) {\n  console.log(i);\n}");
    const forStatement = sourceFile.statements[0] as ts.ForStatement;

    const explanation = explainNode(forStatement);

    expect(explanation.kind).toBe("ForStatement");
    expect(explanation.summary).toBe("Schleife wird ausgeführt");

    const [initializer, condition, incrementor, body] = explanation.children;
    expect(initializer.kind).toBe("initializer");
    expect(condition.kind).toBe("condition");
    expect(condition.children).toEqual([
      {
        kind: "BinaryExpression",
        summary: "Vergleich/Berechnung von zwei Werten",
        children: [
          { kind: "Identifier", label: "i", children: [] },
          { kind: "FirstLiteralToken", children: [] },
        ],
      },
    ]);
    expect(incrementor.kind).toBe("incrementor");
    expect(body.kind).toBe("body");
  });

  it("explains a while statement with condition and body", () => {
    const sourceFile = parseCode("while (count > 0) {\n  count = count - 1;\n}");
    const whileStatement = sourceFile.statements[0] as ts.WhileStatement;

    const explanation = explainNode(whileStatement);

    expect(explanation.kind).toBe("WhileStatement");
    expect(explanation.summary).toBe("Schleife läuft, solange die Bedingung erfüllt ist");
    expect(explanation.children[0]).toEqual({
      kind: "condition",
      children: [
        {
          kind: "BinaryExpression",
          summary: "Vergleich/Berechnung von zwei Werten",
          children: [
            { kind: "Identifier", label: "count", children: [] },
            { kind: "FirstLiteralToken", children: [] },
          ],
        },
      ],
    });

    const body = explanation.children[1];
    expect(body.kind).toBe("body");
    expect(body.children[0].kind).toBe("Block");
    expect(body.children[0].children.length).toBe(1);
  });

  it("explains a do-while statement with body and condition", () => {
    const sourceFile = parseCode("do {\n  count = count - 1;\n} while (count > 0);");
    const doStatement = sourceFile.statements[0] as ts.DoStatement;

    const explanation = explainNode(doStatement);

    expect(explanation.kind).toBe("DoStatement");
    expect(explanation.summary).toBe("Schleife wird mindestens einmal ausgeführt");
    expect(explanation.children.map((child) => child.kind)).toEqual(["body", "condition"]);
  });

  it("explains an arrow function with parameters and an expression body", () => {
    const declaration = getFirstVariableDeclaration("const double = (value) => value * 2;");
    const arrowFunction = declaration.initializer as ts.ArrowFunction;

    const explanation = explainNode(arrowFunction);

    expect(explanation.kind).toBe("ArrowFunction");
    expect(explanation.summary).toBe("Arrow-Funktion wird definiert");
    expect(explanation.children).toEqual([
      {
        kind: "parameters",
        children: [
          { kind: "Parameter", children: [{ kind: "Identifier", label: "value", children: [] }] },
        ],
      },
      {
        kind: "body",
        children: [
          {
            kind: "BinaryExpression",
            summary: "Vergleich/Berechnung von zwei Werten",
            children: [
              { kind: "Identifier", label: "value", children: [] },
              { kind: "FirstLiteralToken", children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it("explains an arrow function with a block body", () => {
    const declaration = getFirstVariableDeclaration(
      "const getName = (user) => {\n  return user.name;\n};",
    );
    const arrowFunction = declaration.initializer as ts.ArrowFunction;

    const explanation = explainNode(arrowFunction);

    expect(explanation.kind).toBe("ArrowFunction");
    const body = explanation.children[1];
    expect(body.kind).toBe("body");
    expect(body.children[0].kind).toBe("Block");
    expect(body.children[0].children).toEqual([
      {
        kind: "ReturnStatement",
        summary: "Rückgabewert der Funktion",
        children: [
          {
            kind: "PropertyAccessExpression",
            summary: "Zugriff auf eine Eigenschaft",
            children: [
              { kind: "object", children: [{ kind: "Identifier", label: "user", children: [] }] },
              { kind: "property", label: "name", children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it("explains a function expression with parameters and body", () => {
    const declaration = getFirstVariableDeclaration(
      "const handler = function (user) {\n  return user.name;\n};",
    );
    const functionExpression = declaration.initializer as ts.FunctionExpression;

    const explanation = explainNode(functionExpression);

    expect(explanation.kind).toBe("FunctionExpression");
    expect(explanation.summary).toBe("Funktion wird als Ausdruck definiert");
    expect(explanation.children).toEqual([
      {
        kind: "parameters",
        children: [
          { kind: "Parameter", children: [{ kind: "Identifier", label: "user", children: [] }] },
        ],
      },
      {
        kind: "body",
        children: [
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
        ],
      },
    ]);
  });

  it("explains a function combining if, for, object and array literals", () => {
    const sourceFile = parseCode(
      `function processUser(user) {
        if (user.active) {
          for (let i = 0; i < 3; i++) {
            console.log(user.name);
          }

          return {
            name: user.name,
            active: true
          };
        }

        return {
          name: "Unknown",
          active: false
        };
      }`,
    );
    const functionDeclaration = sourceFile.statements[0] as ts.FunctionDeclaration;

    const explanation = explainNode(functionDeclaration);

    expect(explanation.kind).toBe("FunctionDeclaration");
    expect(explanation.label).toBe("processUser");

    const [ifStatement, fallbackReturn] = explanation.children;
    expect(ifStatement.kind).toBe("IfStatement");

    const [, thenBranch] = ifStatement.children;
    const [block] = thenBranch.children;
    const [forStatement, returnStatement] = block.children;

    expect(forStatement.kind).toBe("ForStatement");
    expect(forStatement.summary).toBe("Schleife wird ausgeführt");
    expect(forStatement.children.map((child) => child.kind)).toEqual([
      "initializer",
      "condition",
      "incrementor",
      "body",
    ]);

    expect(returnStatement.kind).toBe("ReturnStatement");
    expect(returnStatement.children[0].kind).toBe("ObjectLiteralExpression");
    expect(returnStatement.children[0].children).toEqual([
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "name", children: [] },
          {
            kind: "PropertyAccessExpression",
            summary: "Zugriff auf eine Eigenschaft",
            children: [
              { kind: "object", children: [{ kind: "Identifier", label: "user", children: [] }] },
              { kind: "property", label: "name", children: [] },
            ],
          },
        ],
      },
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "active", children: [] },
          { kind: "TrueKeyword", children: [] },
        ],
      },
    ]);

    expect(fallbackReturn.kind).toBe("ReturnStatement");
    expect(fallbackReturn.children[0].children).toEqual([
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "name", children: [] },
          { kind: "StringLiteral", children: [] },
        ],
      },
      {
        kind: "PropertyAssignment",
        children: [
          { kind: "Identifier", label: "active", children: [] },
          { kind: "FalseKeyword", children: [] },
        ],
      },
    ]);
  });
});
