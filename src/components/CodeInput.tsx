type CodeInputProps = {
  code: string;
  onChange: (code: string, cursorPosition: number) => void;
};

export function CodeInput({ code, onChange }: CodeInputProps) {
  return (
    <textarea
      className="code-input"
      value={code}
      spellCheck={false}
      rows={10}
      onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
      onClick={(e) => onChange(code, e.currentTarget.selectionStart)}
      onKeyUp={(e) => onChange(code, e.currentTarget.selectionStart)}
    />
  );
}
