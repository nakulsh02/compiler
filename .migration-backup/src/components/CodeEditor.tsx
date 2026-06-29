import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  Settings,
  Moon,
  Sun,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
} from 'lucide-react';
import clsx from 'clsx';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  onCursorChange?: (position: { lineNumber: number; column: number }) => void;
  readOnly?: boolean;
  collaborators?: Array<{
    id: string;
    name: string;
    color: string;
    selection?: { start: number; end: number };
  }>;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'markdown',
  sql: 'sql',
  shell: 'shell',
  dockerfile: 'dockerfile',
};

export function CodeEditor({
  language,
  value,
  onChange,
  onSave,
  onCursorChange,
  readOnly = false,
  collaborators = [],
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('on');
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<'on' | 'off' | 'relative'>('on');

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        onSave?.();
      },
    });

    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => {
        editor.getAction('editor.action.formatDocument')?.run();
      },
    });

    editor.addAction({
      id: 'search-replace',
      label: 'Search and Replace',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: () => {
        editor.getAction('editor.action.startFindReplaceAction')?.run();
      },
    });

    editor.updateOptions({
      fontSize,
      wordWrap,
      minimap: { enabled: minimapEnabled },
      lineNumbers,
    });
  }, [fontSize, wordWrap, minimapEnabled, lineNumbers, onCursorChange, onSave]);

  const handleChange: OnChange = useCallback((value) => {
    onChange?.(value || '');
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
    }
  }, [fontSize]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap });
    }
  }, [wordWrap]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: minimapEnabled }
      });
    }
  }, [minimapEnabled]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ lineNumbers });
    }
  }, [lineNumbers]);

  const increaseFontSize = () => setFontSize((s) => Math.min(s + 2, 32));
  const decreaseFontSize = () => setFontSize((s) => Math.max(s - 2, 8));
  const resetFontSize = () => setFontSize(14);

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            showSettings
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-slate-700/50 text-slate-400 hover:text-white'
          )}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute top-10 right-2 z-20 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Font Size: {fontSize}px</span>
            <div className="flex items-center gap-1">
              <button
                onClick={decreaseFontSize}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <ZoomOut className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={resetFontSize}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={increaseFontSize}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <ZoomIn className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Word Wrap</span>
            <button
              onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                wordWrap === 'on'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-slate-700 text-slate-400'
              )}
            >
              {wordWrap === 'on' ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Minimap</span>
            <button
              onClick={() => setMinimapEnabled(!minimapEnabled)}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                minimapEnabled
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-slate-700 text-slate-400'
              )}
            >
              {minimapEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Line Numbers</span>
            <select
              value={lineNumbers}
              onChange={(e) => setLineNumbers(e.target.value as typeof lineNumbers)}
              className="bg-slate-700 text-slate-300 text-sm rounded px-2 py-1 border-none outline-none"
            >
              <option value="on">On</option>
              <option value="relative">Relative</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
      )}

      <Editor
        height="100%"
        language={languageMap[language] || 'plaintext'}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontLigatures: true,
          wordWrap,
          minimap: { enabled: minimapEnabled },
          lineNumbers,
          readOnly,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          parameterHints: { enabled: true },
          renderWhitespace: 'selection',
          contextmenu: true,
          mouseWheelZoom: true,
          multiCursorModifier: 'alt',
          accessibilitySupport: 'auto',
        }}
      />

      {readOnly && (
        <div className="absolute inset-0 bg-transparent pointer-events-none flex items-center justify-center">
          <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-slate-300 text-sm">Read-only mode</span>
          </div>
        </div>
      )}
    </div>
  );
}
