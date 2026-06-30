import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import clsx from 'clsx';
import type { ProjectFile } from '../types';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFileId?: string;
  onSelectFile: (file: ProjectFile) => void;
  onCreateFile: (parentId: string | null, name: string, isFolder: boolean) => void;
  onDeleteFile: (file: ProjectFile) => void;
  onRenameFile: (file: ProjectFile, newName: string) => void;
  onMoveFile?: (file: ProjectFile, newParentId: string | null) => void;
}

interface FileTreeItemProps {
  file: ProjectFile;
  allFiles: ProjectFile[];
  level: number;
  selectedFileId?: string;
  onSelectFile: (file: ProjectFile) => void;
  onCreateFile: (parentId: string | null, name: string, isFolder: boolean) => void;
  onDeleteFile: (file: ProjectFile) => void;
  onRenameFile: (file: ProjectFile, newName: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  mainFileId?: string;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconColors: Record<string, string> = {
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    py: 'text-green-400',
    java: 'text-red-400',
    html: 'text-orange-400',
    css: 'text-blue-400',
    scss: 'text-pink-400',
    json: 'text-yellow-400',
    md: 'text-slate-400',
    sql: 'text-cyan-400',
    go: 'text-cyan-400',
    rs: 'text-orange-400',
  };
  return iconColors[ext || ''] || 'text-slate-400';
}

function FileTreeItem({
  file,
  allFiles,
  level,
  selectedFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  expandedFolders,
  onToggleFolder,
  mainFileId,
}: FileTreeItemProps) {
  const isMain = file.id === mainFileId || file.is_main;
  const [showMenu, setShowMenu] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');
  const isExpanded = expandedFolders.has(file.id);
  const isSelected = selectedFileId === file.id;

  const children = useMemo(() => {
    return allFiles.filter((f) => f.parent_id === file.id);
  }, [allFiles, file.id]);

  const handleCreateFile = () => {
    if (newName.trim()) {
      onCreateFile(file.id, newName.trim(), false);
      setNewName('');
      setShowNewFile(false);
    }
  };

  const handleCreateFolder = () => {
    if (newName.trim()) {
      onCreateFile(file.id, newName.trim(), true);
      setNewName('');
      setShowNewFolder(false);
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) {
      onRenameFile(file, newName.trim());
    }
    setNewName('');
    setShowRename(false);
  };

  if (!file.is_folder) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 mx-1 rounded cursor-pointer group',
          isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectFile(file)}
      >
        <File className={clsx('w-4 h-4 shrink-0', getFileIcon(file.name))} />
        <span className="truncate text-sm">{file.name}</span>
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          {!isMain && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRename(true);
                setNewName(file.name);
              }}
              className="p-0.5 hover:bg-slate-600 rounded"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
          {isMain ? (
            <span className="px-1 text-[9px] text-cyan-500/70 font-medium select-none" title="Main file — cannot be deleted">MAIN</span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file);
              }}
              className="p-0.5 hover:bg-slate-600 rounded text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {showRename && !isMain && (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setShowRename(false);
            }}
            className="absolute bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-sm w-32 z-50"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 mx-1 rounded cursor-pointer group',
          isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onToggleFolder(file.id)}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-yellow-400" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-yellow-400" />
        )}
        <span className="truncate text-sm">{file.name}</span>
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNewFile(true);
            }}
            className="p-0.5 hover:bg-slate-600 rounded"
            title="New File"
          >
            <FilePlus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNewFolder(true);
            }}
            className="p-0.5 hover:bg-slate-600 rounded"
            title="New Folder"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRename(true);
              setNewName(file.name);
            }}
            className="p-0.5 hover:bg-slate-600 rounded"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(file);
            }}
            className="p-0.5 hover:bg-slate-600 rounded text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showNewFile && (
        <div
          className="flex items-center gap-1 px-2 py-1 mx-1"
          style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
        >
          <File className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreateFile}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') setShowNewFile(false);
            }}
            placeholder="filename.ext"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-sm min-w-0"
            autoFocus
          />
        </div>
      )}

      {showNewFolder && (
        <div
          className="flex items-center gap-1 px-2 py-1 mx-1"
          style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
        >
          <Folder className="w-4 h-4 text-yellow-400" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setShowNewFolder(false);
            }}
            placeholder="folder name"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-sm min-w-0"
            autoFocus
          />
        </div>
      )}

      {isExpanded && children.length > 0 && (
        <div>
          {children
            .sort((a, b) => {
              if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileTreeItem
                key={child.id}
                file={child}
                allFiles={allFiles}
                level={level + 1}
                selectedFileId={selectedFileId}
                onSelectFile={onSelectFile}
                onCreateFile={onCreateFile}
                onDeleteFile={onDeleteFile}
                onRenameFile={onRenameFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                mainFileId={mainFileId}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  selectedFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileExplorerProps) {
  const mainFileId = useMemo(() => files.find((f) => f.is_main)?.id, [files]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newName, setNewName] = useState('');

  const rootFiles = useMemo(() => {
    return files.filter((f) => !f.parent_id);
  }, [files]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateFile = () => {
    if (newName.trim()) {
      onCreateFile(null, newName.trim(), false);
      setNewName('');
      setShowNewFile(false);
    }
  };

  const handleCreateFolder = () => {
    if (newName.trim()) {
      onCreateFile(null, newName.trim(), true);
      setNewName('');
      setShowNewFolder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowNewFile(true)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            title="New File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNewFile && (
        <div className="flex items-center gap-1 px-2 py-1 mx-1 border-b border-slate-700/50">
          <File className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreateFile}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') setShowNewFile(false);
            }}
            placeholder="filename.ext"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-sm min-w-0"
            autoFocus
          />
        </div>
      )}

      {showNewFolder && (
        <div className="flex items-center gap-1 px-2 py-1 mx-1 border-b border-slate-700/50">
          <Folder className="w-4 h-4 text-yellow-400" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setShowNewFolder(false);
            }}
            placeholder="folder name"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-sm min-w-0"
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-auto py-1">
        {rootFiles
          .sort((a, b) => {
            if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((file) => (
            <FileTreeItem
              key={file.id}
              file={file}
              allFiles={files}
              level={0}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              mainFileId={mainFileId}
            />
          ))}
      </div>
    </div>
  );
}
