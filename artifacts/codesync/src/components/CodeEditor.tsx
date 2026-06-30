import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Clipboard,
  Scissors,
  FileText,
  Search,
  AlignLeft,
  CheckSquare,
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

interface ContextMenuState {
  x: number;
  y: number;
  hasSelection: boolean;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  java: 'java', c: 'c', cpp: 'cpp', csharp: 'csharp', go: 'go',
  rust: 'rust', ruby: 'ruby', php: 'php', swift: 'swift', kotlin: 'kotlin',
  html: 'html', css: 'css', scss: 'scss', less: 'less', json: 'json',
  xml: 'xml', yaml: 'yaml', markdown: 'markdown', sql: 'sql',
  shell: 'shell', dockerfile: 'dockerfile',
};

export function CodeEditor({
  language, value, onChange, onSave, onCursorChange, readOnly = false, collaborators = [],
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('on');
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<'on' | 'off' | 'relative'>('on');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Close context menu on outside click / scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ lineNumber: e.position.lineNumber, column: e.position.column });
    });

    // Keyboard shortcuts
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => onSave?.(),
    });
    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => editor.getAction('editor.action.formatDocument')?.run(),
    });

    // Intercept right-click to show custom context menu
    editor.onContextMenu((e) => {
      const nativeEvent = e.event.browserEvent;
      nativeEvent.preventDefault();
      nativeEvent.stopPropagation();
      const sel = editor.getSelection();
      const hasSelection = !!(sel && !sel.isEmpty());
      // Clamp menu inside viewport
      const x = Math.min(nativeEvent.clientX, window.innerWidth - 220);
      const y = Math.min(nativeEvent.clientY, window.innerHeight - 320);
      setContextMenu({ x, y, hasSelection });
    });

    editor.updateOptions({ fontSize, wordWrap, minimap: { enabled: minimapEnabled }, lineNumbers });
  }, [fontSize, wordWrap, minimapEnabled, lineNumbers, onCursorChange, onSave]);

  const handleChange: OnChange = useCallback((val) => {
    onChange?.(val || '');
  }, [onChange]);

  useEffect(() => { editorRef.current?.updateOptions({ fontSize }); }, [fontSize]);
  useEffect(() => { editorRef.current?.updateOptions({ wordWrap }); }, [wordWrap]);
  useEffect(() => { editorRef.current?.updateOptions({ minimap: { enabled: minimapEnabled } }); }, [minimapEnabled]);
  useEffect(() => { editorRef.current?.updateOptions({ lineNumbers }); }, [lineNumbers]);

  // --- Context menu actions ---
  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const ctxCopy = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = editor.getSelection();
    const selectedText = sel && !sel.isEmpty()
      ? editor.getModel()?.getValueInRange(sel) || ''
      : '';
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText);
      showFeedback('Copied!');
    }
    setContextMenu(null);
  }, []);

  const ctxCopyAll = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const all = editor.getModel()?.getValue() || '';
    await navigator.clipboard.writeText(all);
    showFeedback('All copied!');
    setContextMenu(null);
  }, []);

  const ctxCut = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = editor.getSelection();
    if (sel && !sel.isEmpty()) {
      const text = editor.getModel()?.getValueInRange(sel) || '';
      await navigator.clipboard.writeText(text);
      // Delete selected text
      editor.executeEdits('cut', [{ range: sel, text: '', forceMoveMarkers: true }]);
    }
    setContextMenu(null);
  }, []);

  const ctxPaste = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setContextMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const sel = editor.getSelection();
      if (!sel) return;
      // Normalize line endings — \r\n → \n
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      editor.executeEdits('paste', [{
        range: sel,
        text: normalized,
        forceMoveMarkers: true,
      }]);
      editor.focus();
    } catch {
      // Clipboard API not permitted — fallback: focus editor so Ctrl+V still works
      editor.focus();
    }
  }, []);

  const ctxSelectAll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const range = editor.getModel()?.getFullModelRange();
    if (range) editor.setSelection(range);
    setContextMenu(null);
    editor.focus();
  }, []);

  const ctxFormat = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
    setContextMenu(null);
  }, []);

  const ctxFind = useCallback(() => {
    editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
    setContextMenu(null);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full">
      {/* Editor settings button */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            showSettings ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400 hover:text-white'
          )}
          title="Editor Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Copy feedback toast */}
      {copyFeedback && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded-full shadow-lg pointer-events-none animate-pulse-subtle">
          {copyFeedback}
        </div>
      )}

      {/* Editor settings panel */}
      {showSettings && (
        <div className="absolute top-10 right-2 z-20 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Font Size: {fontSize}px</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setFontSize((s) => Math.max(s - 2, 8))} className="p-1 hover:bg-slate-700 rounded">
                <ZoomOut className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={() => setFontSize(14)} className="p-1 hover:bg-slate-700 rounded">
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={() => setFontSize((s) => Math.min(s + 2, 32))} className="p-1 hover:bg-slate-700 rounded">
                <ZoomIn className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Word Wrap</span>
            <button
              onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
              className={clsx('px-2 py-1 text-xs rounded transition-colors', wordWrap === 'on' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400')}
            >
              {wordWrap === 'on' ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Minimap</span>
            <button
              onClick={() => setMinimapEnabled(!minimapEnabled)}
              className={clsx('px-2 py-1 text-xs rounded transition-colors', minimapEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400')}
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

      {/* Monaco Editor */}
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
          guides: { bracketPairs: true, indentation: true },
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
          // Disabled to prevent paste from breaking line structure
          formatOnPaste: false,
          formatOnType: false,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: { other: true, comments: false, strings: true },
          parameterHints: { enabled: true },
          renderWhitespace: 'selection',
          // Disable Monaco's built-in context menu — we use our own
          contextmenu: false,
          mouseWheelZoom: true,
          multiCursorModifier: 'alt',
          accessibilitySupport: 'auto',
        }}
      />

      {/* Custom right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[9999] min-w-[200px] bg-slate-800 border border-slate-600/80 rounded-xl shadow-2xl overflow-hidden py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Cut */}
          <ContextMenuItem
            icon={<Scissors className="w-3.5 h-3.5" />}
            label="Cut"
            shortcut="Ctrl+X"
            disabled={!contextMenu.hasSelection || readOnly}
            onClick={ctxCut}
          />

          {/* Copy */}
          <ContextMenuItem
            icon={<Copy className="w-3.5 h-3.5" />}
            label="Copy"
            shortcut="Ctrl+C"
            disabled={!contextMenu.hasSelection}
            onClick={ctxCopy}
          />

          {/* Copy All */}
          <ContextMenuItem
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Copy All"
            shortcut="—"
            onClick={ctxCopyAll}
          />

          {/* Paste */}
          <ContextMenuItem
            icon={<Clipboard className="w-3.5 h-3.5" />}
            label="Paste"
            shortcut="Ctrl+V"
            disabled={readOnly}
            onClick={ctxPaste}
          />

          <div className="my-1 border-t border-slate-700/60" />

          {/* Select All */}
          <ContextMenuItem
            icon={<CheckSquare className="w-3.5 h-3.5" />}
            label="Select All"
            shortcut="Ctrl+A"
            onClick={ctxSelectAll}
          />

          <div className="my-1 border-t border-slate-700/60" />

          {/* Format Document */}
          <ContextMenuItem
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            label="Format Document"
            shortcut="Ctrl+Shift+F"
            disabled={readOnly}
            onClick={ctxFormat}
          />

          {/* Find & Replace */}
          <ContextMenuItem
            icon={<Search className="w-3.5 h-3.5" />}
            label="Find / Replace"
            shortcut="Ctrl+H"
            onClick={ctxFind}
          />
        </div>
      )}

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

// ---- Reusable menu item ----
interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
}

function ContextMenuItem({ icon, label, shortcut, onClick, disabled }: ContextMenuItemProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
        disabled
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-slate-200 hover:bg-slate-700/70 hover:text-white cursor-pointer'
      )}
    >
      <span className={clsx('shrink-0', disabled ? 'text-slate-600' : 'text-slate-400')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className="text-[10px] text-slate-500 font-mono shrink-0">{shortcut}</span>
    </button>
  );
}
