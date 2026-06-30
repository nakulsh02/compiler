import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  Settings, ZoomIn, ZoomOut, RotateCcw,
  Copy, Clipboard, Scissors, FileText, Search, AlignLeft, CheckSquare,
} from 'lucide-react';
import clsx from 'clsx';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  onCursorChange?: (position: { lineNumber: number; column: number }) => void;
  readOnly?: boolean;
  collaborators?: Array<{ id: string; name: string; color: string; selection?: { start: number; end: number } }>;
}

interface ContextMenuState {
  x: number;
  y: number;
  hasSelection: boolean;
  showAbove: boolean;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  java: 'java', c: 'c', cpp: 'cpp', csharp: 'csharp', go: 'go',
  rust: 'rust', ruby: 'ruby', php: 'php', swift: 'swift', kotlin: 'kotlin',
  html: 'html', css: 'css', scss: 'scss', less: 'less', json: 'json',
  xml: 'xml', yaml: 'yaml', markdown: 'markdown', sql: 'sql',
  shell: 'shell', dockerfile: 'dockerfile',
};

const MENU_H = 295; // approximate menu height in px
const MENU_W = 210;

// ---- Clipboard helpers with fallbacks ----
async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // execCommand fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    // Fallback: show a prompt as last resort
    return '';
  }
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function CodeEditor({
  language, value, onChange, onSave, onCursorChange, readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('on');
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<'on' | 'off' | 'relative'>('on');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      setContextMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [contextMenu]);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1600);
  };

  const handleEditorMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    ed.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ lineNumber: e.position.lineNumber, column: e.position.column });
    });

    ed.addAction({
      id: 'save-file', label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => onSave?.(),
    });
    ed.addAction({
      id: 'format-document', label: 'Format Document',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => ed.getAction('editor.action.formatDocument')?.run(),
    });

    // --- Attach native DOM events (paste + contextmenu) ---
    const domNode = ed.getDomNode();
    if (domNode) {
      // Intercept Ctrl+V to normalize Windows line endings
      domNode.addEventListener('paste', (e: ClipboardEvent) => {
        const raw = e.clipboardData?.getData('text/plain');
        if (!raw || !raw.includes('\r')) return;
        e.preventDefault();
        e.stopPropagation();
        const normalized = normalizeText(raw);
        const sel = ed.getSelection();
        if (sel) {
          ed.executeEdits('paste', [{ range: sel, text: normalized, forceMoveMarkers: true }]);
          ed.pushUndoStop();
        }
      }, true);

      // Custom right-click context menu — use native event for precise coords
      domNode.addEventListener('contextmenu', (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const sel = ed.getSelection();
        const hasSelection = !!(sel && !sel.isEmpty());

        const clickX = ev.clientX;
        const clickY = ev.clientY;

        // Clamp within the editor's own bounding box (not full viewport)
        const editorBottom = domNode.getBoundingClientRect().bottom;

        // Show above click if not enough space between click and editor bottom
        const showAbove = clickY + MENU_H > editorBottom - 8;
        const y = showAbove ? clickY - MENU_H : clickY;

        // Show left of click if would overflow viewport right edge
        const x = clickX + MENU_W > window.innerWidth ? clickX - MENU_W : clickX;

        setContextMenu({ x: Math.max(4, x), y: Math.max(4, y), hasSelection, showAbove });
      });
    }

    ed.updateOptions({ fontSize, wordWrap, minimap: { enabled: minimapEnabled }, lineNumbers });
  }, [fontSize, wordWrap, minimapEnabled, lineNumbers, onCursorChange, onSave]);

  const handleChange: OnChange = useCallback((val) => onChange?.(val || ''), [onChange]);

  useEffect(() => { editorRef.current?.updateOptions({ fontSize }); }, [fontSize]);
  useEffect(() => { editorRef.current?.updateOptions({ wordWrap }); }, [wordWrap]);
  useEffect(() => { editorRef.current?.updateOptions({ minimap: { enabled: minimapEnabled } }); }, [minimapEnabled]);
  useEffect(() => { editorRef.current?.updateOptions({ lineNumbers }); }, [lineNumbers]);

  // ---- Context menu actions ----
  const ctxCopy = useCallback(async () => {
    const ed = editorRef.current; if (!ed) return;
    const sel = ed.getSelection();
    const text = sel && !sel.isEmpty() ? ed.getModel()?.getValueInRange(sel) || '' : '';
    if (text) { await writeClipboard(text); toast('Copied!'); }
    setContextMenu(null);
  }, []);

  const ctxCopyAll = useCallback(async () => {
    const text = editorRef.current?.getModel()?.getValue() || '';
    await writeClipboard(text);
    toast('All copied!');
    setContextMenu(null);
  }, []);

  const ctxCut = useCallback(async () => {
    const ed = editorRef.current; if (!ed) return;
    const sel = ed.getSelection();
    if (sel && !sel.isEmpty()) {
      const text = ed.getModel()?.getValueInRange(sel) || '';
      await writeClipboard(text);
      ed.executeEdits('cut', [{ range: sel, text: '', forceMoveMarkers: true }]);
    }
    setContextMenu(null);
    ed.focus();
  }, []);

  const ctxPaste = useCallback(async () => {
    const ed = editorRef.current; if (!ed) return;
    setContextMenu(null);
    const raw = await readClipboard();
    if (!raw) {
      // Clipboard read failed — trigger native paste via keyboard shortcut
      ed.focus();
      return;
    }
    const text = normalizeText(raw);
    const sel = ed.getSelection();
    if (sel) {
      ed.executeEdits('paste', [{ range: sel, text, forceMoveMarkers: true }]);
      ed.pushUndoStop();
    }
    ed.focus();
  }, []);

  const ctxSelectAll = useCallback(() => {
    const ed = editorRef.current; if (!ed) return;
    const range = ed.getModel()?.getFullModelRange();
    if (range) ed.setSelection(range);
    setContextMenu(null);
    ed.focus();
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
    <div className="relative h-full">
      {/* Settings toggle */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx('p-1.5 rounded-md transition-colors', showSettings ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400 hover:text-white')}
          title="Editor Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded-full shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-10 right-2 z-20 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Font Size: {fontSize}px</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setFontSize((s) => Math.max(s - 2, 8))} className="p-1 hover:bg-slate-700 rounded"><ZoomOut className="w-4 h-4 text-slate-400" /></button>
              <button onClick={() => setFontSize(14)} className="p-1 hover:bg-slate-700 rounded"><RotateCcw className="w-4 h-4 text-slate-400" /></button>
              <button onClick={() => setFontSize((s) => Math.min(s + 2, 32))} className="p-1 hover:bg-slate-700 rounded"><ZoomIn className="w-4 h-4 text-slate-400" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Word Wrap</span>
            <button onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')} className={clsx('px-2 py-1 text-xs rounded', wordWrap === 'on' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400')}>
              {wordWrap === 'on' ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Minimap</span>
            <button onClick={() => setMinimapEnabled(!minimapEnabled)} className={clsx('px-2 py-1 text-xs rounded', minimapEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400')}>
              {minimapEnabled ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Line Numbers</span>
            <select value={lineNumbers} onChange={(e) => setLineNumbers(e.target.value as typeof lineNumbers)} className="bg-slate-700 text-slate-300 text-sm rounded px-2 py-1 border-none outline-none">
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
          formatOnPaste: false,
          formatOnType: false,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: { other: true, comments: false, strings: true },
          parameterHints: { enabled: true },
          renderWhitespace: 'selection',
          contextmenu: false,
          mouseWheelZoom: true,
          multiCursorModifier: 'alt',
          accessibilitySupport: 'auto',
        }}
      />

      {/* Custom context menu — positioned near click point */}
      {contextMenu && (
        <div
          className="fixed z-[9999] w-52 bg-slate-800 border border-slate-600/70 rounded-xl shadow-2xl overflow-hidden py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MenuItem icon={<Scissors className="w-3.5 h-3.5" />} label="Cut" shortcut="Ctrl+X" disabled={!contextMenu.hasSelection || readOnly} onClick={ctxCut} />
          <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Copy" shortcut="Ctrl+C" disabled={!contextMenu.hasSelection} onClick={ctxCopy} />
          <MenuItem icon={<FileText className="w-3.5 h-3.5" />} label="Copy All" shortcut="" onClick={ctxCopyAll} />
          <MenuItem icon={<Clipboard className="w-3.5 h-3.5" />} label="Paste" shortcut="Ctrl+V" disabled={readOnly} onClick={ctxPaste} />
          <div className="my-1 border-t border-slate-700/60" />
          <MenuItem icon={<CheckSquare className="w-3.5 h-3.5" />} label="Select All" shortcut="Ctrl+A" onClick={ctxSelectAll} />
          <div className="my-1 border-t border-slate-700/60" />
          <MenuItem icon={<AlignLeft className="w-3.5 h-3.5" />} label="Format Document" shortcut="Shift+F" disabled={readOnly} onClick={ctxFormat} />
          <MenuItem icon={<Search className="w-3.5 h-3.5" />} label="Find / Replace" shortcut="Ctrl+H" onClick={ctxFind} />
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

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
}
function MenuItem({ icon, label, shortcut, onClick, disabled }: MenuItemProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
        disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-200 hover:bg-slate-700/70 hover:text-white cursor-pointer'
      )}
    >
      <span className={clsx('shrink-0', disabled ? 'text-slate-600' : 'text-slate-400')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-[10px] text-slate-500 font-mono shrink-0">{shortcut}</span>}
    </button>
  );
}
