import { useState } from 'react';
import {
  Play,
  Download,
  Share2,
  MoreVertical,
  FileCode,
  Clock,
  Menu,
} from 'lucide-react';

interface TopBarProps {
  projectName: string;
  onMenuToggle: () => void;
  onRun: () => void;
  onExport: () => void;
  onShare: () => void;
  participants?: Array<{ id: string; name: string; color: string }>;
  onSaveStatus?: 'saving' | 'saved' | 'unsaved';
}

export function TopBar({
  projectName,
  onMenuToggle,
  onRun,
  onExport,
  onShare,
  participants = [],
  onSaveStatus = 'saved',
}: TopBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="h-12 bg-slate-800 border-b border-slate-700/50 flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
        <h1 className="text-sm font-medium text-white truncate max-w-[120px] sm:max-w-none">{projectName}</h1>

        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 shrink-0">
          <Clock className="w-3 h-3" />
          <span>
            {onSaveStatus === 'saving' && 'Saving...'}
            {onSaveStatus === 'saved' && 'Saved'}
            {onSaveStatus === 'unsaved' && 'Unsaved'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {participants.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-2">
            {participants.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                +{participants.length - 3}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRun}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
        >
          <Play className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Run</span>
        </button>

        <button
          onClick={onShare}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setShowMenu(false); onShare(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors sm:hidden"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={() => { setShowMenu(false); onExport(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
