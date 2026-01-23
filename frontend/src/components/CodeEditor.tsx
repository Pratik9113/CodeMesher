import React, { useState, useRef, useEffect } from 'react';
import Editor, { useMonaco, type OnChange } from '@monaco-editor/react';
import axios from 'axios';
import TerminalView from './Terminal';
import InstructionBar from './editor/InstructionBar';
import StatusBar from './editor/StatusBar';
import type { SelectionRange, EditorEdit } from '../types/editor';

interface CodeEditorProps {
  initialCode?: string;
  onChange?: (code: string) => void;
  fileName?: string;
  filePath?: string;
  onClose?: () => void;
}

export default function CodeEditor({
  initialCode = '',
  onChange,
  fileName = 'untitled.js',
  filePath,
  onClose
}: CodeEditorProps) {
  const [code, setCode] = useState<string>(initialCode || '');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [instruction, setInstruction] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [terminalHeight, setTerminalHeight] = useState<number>(250);

  const monaco = useMonaco();
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCode(initialCode || '');
  }, [initialCode]);

  const handleEditorDidMount = (editor: import('monaco-editor').editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    const selectionListener = editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      if (!sel) return;
      const start = sel.getStartPosition();
      const end = sel.getEndPosition();
      setSelection({
        start_line: start.lineNumber,
        start_col: start.column,
        end_line: end.lineNumber,
        end_col: end.column,
      });
      setCursorPosition({ line: end.lineNumber, column: end.column });
    });

    const initSel = editor.getSelection();
    if (initSel) {
      const s = initSel.getStartPosition();
      const e = initSel.getEndPosition();
      setSelection({ start_line: s.lineNumber, start_col: s.column, end_line: e.lineNumber, end_col: e.column });
      setCursorPosition({ line: e.lineNumber, column: e.column });
    }

    return () => selectionListener.dispose();
  };

  const onEditorChange: OnChange = (value) => {
    const next = value ?? '';
    setCode(next);
    onChange?.(next);
  };

  const applyEditsToMonaco = (edits: EditorEdit[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    const monacoEdits: import('monaco-editor').editor.IIdentifiedSingleEditOperation[] = edits.map(e => ({
      range: {
        startLineNumber: e.start_line,
        startColumn: e.start_col,
        endLineNumber: e.end_line,
        endColumn: e.end_col,
      },
      text: e.replacement,
    }));
    editor.executeEdits('ai-edit', monacoEdits);
    const updated = editor.getValue();
    setCode(updated);
    onChange?.(updated);
  };

  const apiBase = import.meta.env.VITE_API_URL || 'https://codemesherbackend.onrender.com';

  const sendInstruction = async () => {
    if (!selection || !instruction.trim()) return;
    setIsApplying(true);
    try {
      const payload = {
        system: 'You are a helpful programming assistant.',
        history: [],
        current: code,
        file_path: filePath || fileName || 'untitled.js',
        selection: selection,
        user: instruction,
        mode: 'inline',
      };
      const res = await axios.post(`${apiBase}/edit`, payload, { timeout: 20000 });
      const data = res.data || {};
      if (Array.isArray(data.edits) && data.edits.length > 0) {
        applyEditsToMonaco(data.edits);
        setInstruction('');
      }
    } catch (err) {
      console.error('Edit request failed', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    if (newHeight > 100 && newHeight < containerRect.height - 200) {
      setTerminalHeight(newHeight);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-[#0d1117] overflow-hidden text-sm rounded-xl border border-gray-700 shadow-2xl">
      {/* File Tab Bar */}
      <div className="flex items-center bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-2 bg-[#0d1117] border-r border-gray-800 text-blue-400 text-xs font-medium border-t-2 border-t-blue-500 min-w-max">
          <span className="truncate max-w-[150px]">{fileName}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 hover:bg-gray-800 rounded p-0.5 transition-colors group"
              title="Close"
            >
              <svg className="w-3 h-3 text-gray-500 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onMount={handleEditorDidMount}
          onChange={onEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontLigatures: true,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
            tabSize: 2,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 }
          }}
        />

        <InstructionBar
          value={instruction}
          selection={selection}
          isApplying={isApplying}
          onChange={setInstruction}
          onApply={sendInstruction}
        />

        <StatusBar
          cursorPosition={cursorPosition}
          showTerminal={showTerminal}
          onToggleTerminal={setShowTerminal}
        />
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="flex flex-col border-t border-gray-700 bg-gray-950">
          <div
            onMouseDown={() => setIsDragging(true)}
            className="h-1 cursor-row-resize bg-gray-800 hover:bg-blue-500/50 transition-colors"
          />
          <div className="p-2 overflow-auto" style={{ height: `${terminalHeight}px` }}>
            <TerminalView />
          </div>
        </div>
      )}
    </div>
  );
}
