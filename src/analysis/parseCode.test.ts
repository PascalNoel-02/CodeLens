import { describe, expect, it } from "vitest";
import ts from "typescript";
import { findNodeAtPosition, parseCode } from "./parseCode";

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
