'use client';

import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

const languageMap: Record<string, string> = {
  python: 'python',
  java: 'java',
};

const defaultCode: Record<string, string> = {
  python: '# Write your solution here\n\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}\n',
};

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <Editor
        height="500px"
        language={languageMap[language] || 'python'}
        value={value || defaultCode[language] || ''}
        onChange={(val) => onChange(val || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          tabSize: 4,
          renderWhitespace: 'selection',
          contextmenu: false,
        }}
      />
    </div>
  );
}
