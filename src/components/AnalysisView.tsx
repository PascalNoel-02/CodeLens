import type { Explanation } from "../analysis/explainNode";

type AnalysisViewProps = {
  explanation: Explanation | null;
};

export function AnalysisView({ explanation }: AnalysisViewProps) {
  if (!explanation) {
    return <p>Klicke in den Code, um eine Erklärung zu sehen.</p>;
  }

  return (
    <ul className="analysis-view">
      <ExplanationNode explanation={explanation} />
    </ul>
  );
}

function ExplanationNode({ explanation }: { explanation: Explanation }) {
  return (
    <li>
      {explanation.kind}
      {explanation.label ? `: ${explanation.label}` : ""}
      {explanation.children.length > 0 && (
        <ul>
          {explanation.children.map((child, index) => (
            <ExplanationNode key={index} explanation={child} />
          ))}
        </ul>
      )}
    </li>
  );
}
