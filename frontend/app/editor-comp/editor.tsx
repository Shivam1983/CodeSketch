import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { editor } from 'monaco-editor';


interface MonacoEditorProps {
  roomId: string;
  socket: WebSocket;
  language: "javascript" | "python" | "cpp";
  onLanguageChange: (lang: "javascript" | "python" | "cpp") => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  roomId,
  socket,
  language,
  onLanguageChange,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [output, setOutput] = useState<string>("");
  const isLocalChange = useRef<boolean>(false);

  const languages = [
    { id: "javascript", label: "JavaScript" },
    { id: "python", label: "Python" },
    { id: "cpp", label: "C++" }
  ] as const;

  // Get default code based on language
  const getDefaultCode = (lang: string): string => {
    switch (lang) {
      case "javascript":
        return 'console.log("Hello, World!");';
      case "python":
        return 'print("Hello, World!")';
      case "cpp":
        return '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}';
      default:
        return "";
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      if (code !== undefined && !isLocalChange.current) {
        socket.send(
          JSON.stringify({
            type: "code_change",
            code,
            roomId,
          })
        );
      }
      isLocalChange.current = false;
    });
  };

  // Handle WebSocket messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "code_change" && message.roomId === roomId) {
        const code = message.code;
        if (editorRef.current && code !== editorRef.current.getValue()) {
          isLocalChange.current = true;
          editorRef.current.setValue(code);
        }
      }     
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [roomId, socket]);

  // Execute code using Piston API
  const runCode = async () => {
    const code = editorRef.current?.getValue();
    if (!code) return;

    const languageMap = {
      javascript: { id: "js", version: "18.15.0" },
      python: { id: "python", version: "3.10.0" },
      cpp: { id: "cpp", version: "10.2.0" },
    };

    const langConfig = languageMap[language];

    try {
      setOutput("Running code...");
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: langConfig.id,
          version: langConfig.version,
          files: [
            {
              content: code,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.run) {
        setOutput(
          `${data.run.stdout || ""}${data.run.stderr ? "\nError: " + data.run.stderr : ""}`
        );
      } else {
        setOutput("Error: Unable to execute code.");
      }
    } catch (error) {
      setOutput("Error: Failed to execute code. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-[#1e1e1e] p-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-white text-sm">Code Editor</span>
          <select value={language} onChange={(e) => onLanguageChange(e.target.value as "javascript" | "python" | "cpp")} className="bg-[#2d2d2d] text-white text-sm px-2 py-1 rounded border border-[#3d3d3d] focus:outline-none focus:border-[#007acc] cursor-pointer">
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={runCode} className="px-4 py-1.5 bg-[#007acc] text-white rounded hover:bg-[#005999] transition-colors">Run Code</button>
      </div>
      <div className="flex-grow min-h-0">
        <Editor
          height="100%"
          defaultValue={getDefaultCode(language)}
          language={language}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            roundedSelection: true,
            automaticLayout: true,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
      <div className="h-48 bg-[#1e1e1e] text-white p-2 font-mono text-sm">
        <div className="mb-2 text-gray-400">Output:</div>
        <div className="whitespace-pre-wrap overflow-y-auto max-h-36">
          {output}
        </div>
      </div>
    </div>
  );
};