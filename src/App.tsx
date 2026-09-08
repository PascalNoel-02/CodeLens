import { useState } from "react";
import { explainNode, type Explanation } from "./analysis/explainNode";
import { findNodeAtPosition, findRelevantStatement, parseCode } from "./analysis/parseCode";
import { AnalysisView } from "./components/AnalysisView";
import { CodeInput } from "./components/CodeInput";
import "./App.css";

const EXAMPLE_CODE = "const user = getUser();\n";

function App() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [explanation, setExplanation] = useState<Explanation | null>(() =>
    explainNode(findRelevantStatement(findNodeAtPosition(parseCode(EXAMPLE_CODE), 0))),
  );

  function analyze(newCode: string, cursorPosition: number) {
    setCode(newCode);
    const sourceFile = parseCode(newCode);
    const node = findNodeAtPosition(sourceFile, cursorPosition);
    setExplanation(explainNode(findRelevantStatement(node)));
  }

  return (
    <main className="container">
      <h1>CodeLens</h1>
      <CodeInput code={code} onChange={analyze} />
      <AnalysisView explanation={explanation} />
    </main>
  );
}

export default App;
