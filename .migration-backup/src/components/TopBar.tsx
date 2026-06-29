import { useState } from 'react';
import {
  Play,
  Download,
  Share2,
  MoreVertical,
  FolderDown,
  FileCode,
  Users,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

interface TopBarProps {
  projectName: string;
  onRun: () => void;
  onExport: () => void;
  onShare: () => void;
  participants?: Array<{ id: string; name: string; color: string }>;
  onSaveStatus?: 'saving' | 'saved' | 'unsaved';
}

export function TopBar({
  projectName,
  onRun,
  onExport,
  onShare,
  participants = [],
  onSaveStatus = 'saved'
}: TopBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="h-12 bg-slate-800 border-b border-slate-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-medium text-white">{projectName}</h1>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>
            {onSaveStatus === 'saving' && 'Saving...'}
            {onSaveStatus === 'saved' && 'Saved'}
            {onSaveStatus === 'unsaved' && 'Unsaved changes'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {participants.length > 0 && (
          <div className="flex items-center -space-x-2">
            {participants.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="w-7 h-7 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                +{participants.length - 4}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRun}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
        >
          <Play className="w-4 h-4" />
          Run
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
        >
          <Share2 className="w-4 h-4" />
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
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onExport();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Project
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onExport();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <FolderDown className="w-4 h-4" />
                  Export as ZIP
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
