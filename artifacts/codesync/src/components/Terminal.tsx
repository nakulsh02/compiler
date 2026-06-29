import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Plus, X, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

interface TerminalInstance {
  id: string;
  name: string;
  history: string[];
  output: TerminalLine[];
}

interface TerminalLine {
  text: string;
  type: 'default' | 'error' | 'success' | 'cmd' | 'info';
}

interface TerminalProps {
  currentFile?: { name: string; content?: string; language?: string } | null;
}

export function Terminal({ currentFile }: TerminalProps) {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    {
      id: '1',
      name: 'Terminal 1',
      history: [],
      output: [
        { text: 'Welcome to CodeSync Terminal', type: 'info' },
        { text: 'Type "help" for available commands, or "run" to execute the current file.', type: 'info' },
        { text: '', type: 'default' },
      ],
    },
  ]);
  const [activeTerminal, setActiveTerminal] = useState('1');
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const historyIndex = useRef<number>(-1);

  const currentTerminal = terminals.find((t) => t.id === activeTerminal);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentTerminal?.output]);

  const appendOutput = useCallback((lines: TerminalLine[]) => {
    setTerminals((prev) =>
      prev.map((t) =>
        t.id === activeTerminal ? { ...t, output: [...t.output, ...lines] } : t
      )
    );
  }, [activeTerminal]);

  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setTerminals((prev) =>
      prev.map((t) =>
        t.id === activeTerminal ? { ...t, history: [...t.history, command] } : t
      )
    );

    const cmd = command.trim();
    const cmdLower = cmd.toLowerCase();

    appendOutput([{ text: `$ ${command}`, type: 'cmd' }]);

    if (cmdLower === 'help') {
      appendOutput([
        { text: 'Available commands:', type: 'info' },
        { text: '  run              - Run the currently open file', type: 'default' },
        { text: '  python <file>    - Run a Python file (uses current file content)', type: 'default' },
        { text: '  python3 <file>   - Same as python', type: 'default' },
        { text: '  node <file>      - Run a JavaScript file', type: 'default' },
        { text: '  clear            - Clear terminal', type: 'default' },
        { text: '  ls               - List files', type: 'default' },
        { text: '  pwd              - Print working directory', type: 'default' },
        { text: '  echo <text>      - Print text', type: 'default' },
        { text: '  date             - Show current date/time', type: 'default' },
        { text: '', type: 'default' },
      ]);
      return;
    }

    if (cmdLower === 'clear') {
      setTerminals((prev) =>
        prev.map((t) => (t.id === activeTerminal ? { ...t, output: [] } : t))
      );
      return;
    }

    if (cmdLower === 'ls') {
      appendOutput([{ text: 'src/  index.html  style.css  main.py  README.md', type: 'default' }, { text: '', type: 'default' }]);
      return;
    }

    if (cmdLower === 'pwd') {
      appendOutput([{ text: '/workspace/project', type: 'default' }, { text: '', type: 'default' }]);
      return;
    }

    if (cmd.toLowerCase().startsWith('echo ')) {
      appendOutput([{ text: cmd.slice(5), type: 'default' }, { text: '', type: 'default' }]);
      return;
    }

    if (cmdLower === 'date') {
      appendOutput([{ text: new Date().toString(), type: 'default' }, { text: '', type: 'default' }]);
      return;
    }

    if (cmdLower === 'whoami') {
      appendOutput([{ text: 'developer', type: 'default' }, { text: '', type: 'default' }]);
      return;
    }

    // run / python / python3 / node commands — real execution
    const isRun = cmdLower === 'run';
    const isPython = cmdLower.startsWith('python3 ') || cmdLower.startsWith('python ');
    const isNode = cmdLower.startsWith('node ');

    if (isRun || isPython || isNode) {
      let language = currentFile?.language || 'python';
      let code = currentFile?.content || '';

      if (isPython) language = 'python';
      if (isNode) language = 'javascript';

      if (!code.trim()) {
        appendOutput([
          { text: 'No code to run. Open a file and make sure it has content.', type: 'error' },
          { text: '', type: 'default' },
        ]);
        return;
      }

      if (!['python', 'javascript'].includes(language)) {
        appendOutput([
          { text: `Cannot run "${language}" files. Only Python and JavaScript are supported.`, type: 'error' },
          { text: '', type: 'default' },
        ]);
        return;
      }

      setIsRunning(true);
      appendOutput([{ text: `Running ${currentFile?.name || 'file'}...`, type: 'info' }]);

      try {
        const result = await api.execute(language, code);
        const lines = result.output.split('\n');
        appendOutput([
          ...lines.map((l) => ({ text: l, type: (result.error ? 'error' : 'success') as TerminalLine['type'] })),
          { text: '', type: 'default' },
        ]);
      } catch (err) {
        appendOutput([
          { text: `Error: ${(err as Error).message}`, type: 'error' },
          { text: '', type: 'default' },
        ]);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    appendOutput([
      { text: `command not found: ${cmd.split(' ')[0]}. Type "help" for available commands.`, type: 'error' },
      { text: '', type: 'default' },
    ]);
  }, [activeTerminal, appendOutput, currentFile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isRunning) {
        handleCommand(input);
        setInput('');
        historyIndex.current = -1;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = currentTerminal?.history || [];
      if (history.length > 0) {
        const newIndex = historyIndex.current < history.length - 1 ? historyIndex.current + 1 : historyIndex.current;
        historyIndex.current = newIndex;
        setInput(history[history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = currentTerminal?.history || [];
      if (historyIndex.current > 0) {
        const newIndex = historyIndex.current - 1;
        historyIndex.current = newIndex;
        setInput(history[history.length - 1 - newIndex] || '');
      } else if (historyIndex.current === 0) {
        historyIndex.current = -1;
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setInput(input + '  ');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setTerminals((prev) =>
        prev.map((t) => (t.id === activeTerminal ? { ...t, output: [] } : t))
      );
    }
  };

  const addTerminal = () => {
    const newId = Date.now().toString();
    setTerminals((prev) => [
      ...prev,
      {
        id: newId,
        name: `Terminal ${prev.length + 1}`,
        history: [],
        output: [{ text: 'Welcome to CodeSync Terminal', type: 'info' }, { text: '', type: 'default' }],
      },
    ]);
    setActiveTerminal(newId);
  };

  const removeTerminal = (id: string) => {
    if (terminals.length <= 1) return;
    const newTerminals = terminals.filter((t) => t.id !== id);
    setTerminals(newTerminals);
    if (activeTerminal === id) setActiveTerminal(newTerminals[0].id);
  };

  const lineColor: Record<TerminalLine['type'], string> = {
    default: 'text-slate-300',
    error: 'text-red-400',
    success: 'text-green-400',
    cmd: 'text-cyan-400',
    info: 'text-slate-400',
  };

  if (!isExpanded) {
    return (
      <div className="h-10 bg-slate-900 border-t border-slate-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TerminalIcon className="w-4 h-4" />
          <span>Terminal</span>
          {currentFile && <span className="text-xs text-slate-600">— {currentFile.name}</span>}
        </div>
        <button onClick={() => setIsExpanded(true)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-64 bg-slate-900 border-t border-slate-700/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-1 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 text-xs rounded group',
                t.id === activeTerminal ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <button onClick={() => setActiveTerminal(t.id)} className="flex items-center gap-1">
                <TerminalIcon className="w-3 h-3" />
                <span>{t.name}</span>
              </button>
              {terminals.length > 1 && (
                <button onClick={() => removeTerminal(t.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addTerminal} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="New Terminal">
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentFile && (
            <button
              onClick={() => handleCommand('run')}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50 transition-colors"
              title="Run current file"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : '▶'}
              Run {currentFile.name}
            </button>
          )}
          <button
            onClick={() => setTerminals((prev) => prev.map((t) => (t.id === activeTerminal ? { ...t, output: [] } : t)))}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Clear Terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {currentTerminal?.output.map((line, i) => (
          <div key={i} className={clsx('whitespace-pre-wrap', lineColor[line.type])}>
            {line.text}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-green-400">$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-white caret-cyan-400 ml-1"
            placeholder={isRunning ? 'Running...' : ''}
            disabled={isRunning}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
