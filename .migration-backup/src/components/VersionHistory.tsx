import { useState } from 'react';
import {
  GitBranch,
  Clock,
  User,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Eye,
} from 'lucide-react';
import clsx from 'clsx';
import type { Version, ProjectFile } from '../types';

interface VersionHistoryProps {
  versions: Version[];
  files: ProjectFile[];
  onRestoreVersion: (version: Version) => void;
  onCreateVersion: (fileId: string | null, message: string) => void;
  onViewVersion: (version: Version) => void;
}

export function VersionHistory({
  versions,
  files,
  onRestoreVersion,
  onCreateVersion,
  onViewVersion,
}: VersionHistoryProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showCommitMessage, setShowCommitMessage] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const commitMessageRef = useState<string | null>(null);

  const versionsByDate = versions.reduce((acc, version) => {
    const date = new Date(version.created_at).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(version);
    return acc;
  }, {} as Record<string, Version[]>);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const date = new Date(dateString).toDateString();

    if (date === today) return 'Today';
    if (date === yesterday) return 'Yesterday';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreateCommit = () => {
    if (commitMessage.trim()) {
      onCreateVersion(null, commitMessage.trim());
      setCommitMessage('');
      setShowCommitMessage(false);
    }
  };

  const getFileName = (fileId: string | null | undefined) => {
    if (!fileId) return 'Full Snapshot';
    const file = files.find((f) => f.id === fileId);
    return file?.name || 'Unknown File';
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Version History
        </span>
        <button
          onClick={() => setShowCommitMessage(true)}
          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
          title="Create Snapshot"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showCommitMessage && (
        <div className="p-3 border-b border-slate-700/50 space-y-2">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Add a commit message..."
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCommitMessage(false);
                setCommitMessage('');
              }}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCommit}
              disabled={!commitMessage.trim()}
              className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Commit
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2">
        {Object.entries(versionsByDate).map(([date, dateVersions]) => (
          <div key={date} className="mb-4">
            <button
              onClick={() => toggleDate(date)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700/30 rounded"
            >
              {expandedDates.has(date) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Clock className="w-4 h-4 text-slate-500" />
              <span>{formatDate(date)}</span>
              <span className="text-xs text-slate-500 ml-auto">
                {dateVersions.length} commit{dateVersions.length !== 1 && 's'}
              </span>
            </button>

            {expandedDates.has(date) && (
              <div className="ml-6 mt-1 space-y-1">
                {dateVersions.map((version) => (
                  <div
                    key={version.id}
                    className="group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-700/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {version.message || 'No message'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formatTime(version.created_at)}</span>
                        <span>-</span>
                        <span>{getFileName(version.file_id)}</span>
                        {version.user && (
                          <>
                            <span>-</span>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{version.user.display_name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <button
                        onClick={() => onViewVersion(version)}
                        className="p-1 hover:bg-slate-600 rounded text-slate-400"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRestoreVersion(version)}
                        className="p-1 hover:bg-slate-600 rounded text-slate-400"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {versions.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No version history yet</p>
            <p className="text-xs mt-1">Create your first snapshot to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
