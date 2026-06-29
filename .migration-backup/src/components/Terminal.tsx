import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Plus, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface TerminalInstance {
  id: string;
  name: string;
  history: string[];
  output: string[];
}

interface TerminalProps {
  onCommand?: (command: string) => string | Promise<string>;
}

export function Terminal({ onCommand }: TerminalProps) {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    { id: '1', name: 'Terminal 1', history: [], output: ['Welcome to CodeSync Terminal', 'Type "help" for available commands', ''] }
  ]);
  const [activeTerminal, setActiveTerminal] = useState('1');
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const historyIndex = useRef<number>(-1);

  const currentTerminal = terminals.find((t) => t.id === activeTerminal);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentTerminal?.output]);

  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    const newHistory = [...(currentTerminal?.history || []), command];
    setTerminals((prev) =>
      prev.map((t) =>
        t.id === activeTerminal
          ? { ...t, history: newHistory }
          : t
      )
    );

    let output: string;
    const cmd = command.trim().toLowerCase();

    if (cmd === 'help') {
      output = `Available commands:
  help      - Show this help message
  clear     - Clear terminal
  ls        - List files (simulated)
  pwd       - Print working directory
  echo      - Print text
  date      - Show current date/time
  whoami    - Show current user`;
    } else if (cmd === 'clear') {
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerminal ? { ...t, output: [] } : t
        )
      );
      return;
    } else if (cmd === 'ls') {
      output = 'src/  public/  package.json  README.md  .gitignore';
    } else if (cmd === 'pwd') {
      output = '/project';
    } else if (cmd.startsWith('echo ')) {
      output = command.slice(5);
    } else if (cmd === 'date') {
      output = new Date().toString();
    } else if (cmd === 'whoami') {
      output = 'developer';
    } else if (cmd.startsWith('npm ')) {
      output = `npm command simulated: ${command}`;
    } else if (cmd.startsWith('git ')) {
      output = `git command simulated: ${command}`;
    } else if (cmd.startsWith('node ')) {
      output = `node command simulated: ${command}`;
    } else if (onCommand) {
      output = await onCommand(command);
    } else {
      output = `Command not found: ${command}`;
    }

    setTerminals((prev) =>
      prev.map((t) =>
        t.id === activeTerminal
          ? {
              ...t,
              output: [...t.output, `$ ${command}`, output, ''],
            }
          : t
      )
    );
  }, [activeTerminal, currentTerminal?.history, onCommand]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
      historyIndex.current = -1;
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
      setInput(input + '    ');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerminal ? { ...t, output: [] } : t
        )
      );
    }
  };

  const addTerminal = () => {
    const newId = Date.now().toString();
    const newTerminal: TerminalInstance = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`,
      history: [],
      output: ['Welcome to CodeSync Terminal', ''],
    };
    setTerminals([...terminals, newTerminal]);
    setActiveTerminal(newId);
  };

  const removeTerminal = (id: string) => {
    if (terminals.length <= 1) return;
    const newTerminals = terminals.filter((t) => t.id !== id);
    setTerminals(newTerminals);
    if (activeTerminal === id) {
      setActiveTerminal(newTerminals[0].id);
    }
  };

  const clearTerminal = () => {
    setTerminals((prev) =>
      prev.map((t) =>
        t.id === activeTerminal ? { ...t, output: [] } : t
      )
    );
  };

  if (!isExpanded) {
    return (
      <div className="h-10 bg-slate-900 border-t border-slate-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TerminalIcon className="w-4 h-4" />
          <span>Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          {terminals.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTerminal(t.id);
                setIsExpanded(true);
              }}
              className={clsx(
                'px-2 py-0.5 text-xs rounded',
                t.id === activeTerminal
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
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
                t.id === activeTerminal
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <button
                onClick={() => setActiveTerminal(t.id)}
                className="flex items-center gap-1"
              >
                <TerminalIcon className="w-3 h-3" />
                <span>{t.name}</span>
              </button>
              {terminals.length > 1 && (
                <button
                  onClick={() => removeTerminal(t.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTerminal}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="New Terminal"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearTerminal}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Clear Terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
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
          <div key={i} className="whitespace-pre-wrap text-slate-300">
            {line}
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
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
