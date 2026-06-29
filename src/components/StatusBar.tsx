import { GitBranch, Wifi, WifiOff, AlertCircle, Check } from 'lucide-react';
import clsx from 'clsx';

interface StatusBarProps {
  line?: number;
  column?: number;
  language?: string;
  connected?: boolean;
  branch?: string;
  errors?: number;
  warnings?: number;
}

export function StatusBar({
  line = 1,
  column = 1,
  language = 'JavaScript',
  connected = true,
  branch = 'main',
  errors = 0,
  warnings = 0,
}: StatusBarProps) {
  return (
    <div className="h-6 bg-slate-900 border-t border-slate-700/50 flex items-center justify-between px-3 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          <span>{branch}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {(errors > 0 || warnings > 0) && (
          <div className="flex items-center gap-2">
            {errors > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors}</span>
              </div>
            )}
            {warnings > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{warnings}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span>Ln {line}, Col {column}</span>
        <span>{language}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
