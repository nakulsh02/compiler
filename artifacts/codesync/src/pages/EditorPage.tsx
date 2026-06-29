import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { StatusBar } from '../components/StatusBar';
import { FileExplorer } from '../components/FileExplorer';
import { CodeEditor } from '../components/CodeEditor';
import { Terminal } from '../components/Terminal';
import { Preview } from '../components/Preview';
import { ChatPanel } from '../components/ChatPanel';
import { SearchPanel } from '../components/SearchPanel';
import { VersionHistory } from '../components/VersionHistory';
import { SettingsPanel } from '../components/SettingsPanel';
import { Files, Search, GitBranch, MessageSquare, Settings, X } from 'lucide-react';
import type { Project, ProjectFile, ChatMessage, Version } from '../types';

const WEB_LANGUAGES = new Set(['html', 'css', 'scss', 'less', 'javascript']);

interface EditorPageProps {
  project: Project;
  onBackToDashboard: () => void;
}

export function EditorPage({ project, onBackToDashboard }: EditorPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'files' | 'search' | 'git' | 'chat' | 'settings'>('files');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unsaved'>('saved');
  const [showPreview, setShowPreview] = useState(false);
  const [leftWidth, setLeftWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const fileContentRef = useRef<Map<string, string>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWebFile = selectedFile ? WEB_LANGUAGES.has(selectedFile.language || '') : false;
  const canShowPreview = isWebFile || files.some((f) => WEB_LANGUAGES.has(f.language || ''));

  useEffect(() => {
    loadFiles();
    loadMessages();
    loadVersions();

    const socket = io('/', { path: '/api/socket.io' });
    socketRef.current = socket;
    socket.emit('join-project', project.id);

    socket.on('chat-message', (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));
    socket.on('file-change', ({ fileId, content }: { fileId: string; content: string }) => {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content } : f)));
      fileContentRef.current.set(fileId, content);
    });

    return () => {
      socket.emit('leave-project', project.id);
      socket.disconnect();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [project.id]);

  async function loadFiles() {
    try {
      const data = await api.files.list(project.id);
      setFiles(data);
      const main = data.find((f) => f.name === 'index.html' || f.name === 'index.js' || f.name === 'main.py');
      if (main) { setSelectedFile(main); setOpenFiles([main]); }
    } catch {}
  }
  async function loadMessages() { try { setMessages(await api.messages.list(project.id)); } catch {} }
  async function loadVersions() { try { setVersions(await api.versions.list(project.id)); } catch {} }

  const handleSelectFile = useCallback((file: ProjectFile) => {
    if (file.is_folder) return;
    setSelectedFile(file);
    setOpenFiles((prev) => prev.find((f) => f.id === file.id) ? prev : [...prev, file]);
    setMobileDrawerOpen(false);
  }, []);

  const closeFile = useCallback((e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (selectedFile?.id === fileId) setSelectedFile(next[0] || null);
      return next;
    });
  }, [selectedFile]);

  const createFile = async (parentId: string | null, name: string, isFolder: boolean) => {
    const parent = parentId ? files.find((f) => f.id === parentId) : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;
    const language = isFolder ? undefined : getLang(name);
    try {
      const file = await api.files.create(project.id, { name, path, is_folder: isFolder, language, parent_id: parentId || undefined, content: isFolder ? undefined : '' });
      setFiles((prev) => [...prev, file]);
      if (!isFolder) handleSelectFile(file);
    } catch {}
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      await api.files.delete(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setOpenFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedFile?.id === file.id) setSelectedFile(openFiles.find((f) => f.id !== file.id) || null);
    } catch {}
  };

  const renameFile = async (file: ProjectFile, newName: string) => {
    const parent = file.parent_id ? files.find((f) => f.id === file.parent_id) : null;
    const path = parent ? `${parent.path}/${newName}` : `/${newName}`;
    try {
      await api.files.update(file.id, { name: newName, path, language: getLang(newName) });
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, name: newName, path } : f));
      setOpenFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, name: newName, path } : f));
    } catch {}
  };

  const handleContentChange = useCallback((value: string) => {
    if (!selectedFile) return;
    fileContentRef.current.set(selectedFile.id, value);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.files.update(selectedFile.id, { content: value });
        setFiles((prev) => prev.map((f) => f.id === selectedFile.id ? { ...f, content: value } : f));
        setSaveStatus('saved');
        socketRef.current?.emit('file-change', { projectId: project.id, fileId: selectedFile.id, content: value });
      } catch { setSaveStatus('unsaved'); }
    }, 800);
  }, [selectedFile, project.id]);

  const handleSave = useCallback(() => {
    if (!selectedFile) return;
    const content = fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? '';
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    api.files.update(selectedFile.id, { content })
      .then(() => { setFiles((prev) => prev.map((f) => f.id === selectedFile.id ? { ...f, content } : f)); setSaveStatus('saved'); })
      .catch(() => setSaveStatus('unsaved'));
  }, [selectedFile]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    try {
      const msg = await api.messages.create(project.id, content);
      setMessages((prev) => [...prev, msg]);
      socketRef.current?.emit('chat-message', { projectId: project.id, message: msg });
    } catch {}
  };

  const createVersion = async (fileId: string | null, message: string) => {
    if (!user) return;
    try {
      const v = await api.versions.create(project.id, { file_id: fileId || undefined, content: selectedFile?.content, message });
      setVersions((prev) => [v, ...prev]);
    } catch {}
  };

  const restoreVersion = async (version: Version) => {
    if (!version.file_id || !version.content) return;
    try {
      await api.files.update(version.file_id, { content: version.content });
      setFiles((prev) => prev.map((f) => f.id === version.file_id ? { ...f, content: version.content } : f));
    } catch {}
  };

  const getPreviewContent = () => {
    const htmlFile = files.find((f) => f.name.endsWith('.html'));
    const cssFiles = files.filter((f) => f.name.endsWith('.css') || f.name.endsWith('.scss'));
    const jsFiles = files.filter((f) => f.name.endsWith('.js') || f.name.endsWith('.jsx'));
    return {
      html: htmlFile?.content || '<p>Create an index.html file to see preview</p>',
      css: cssFiles.map((f) => f.content || '').join('\n'),
      javascript: jsFiles.map((f) => f.content || '').join('\n'),
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isResizing) setLeftWidth(Math.max(150, Math.min(400, e.clientX - 56))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  const selectedFileForTerminal = selectedFile
    ? { name: selectedFile.name, language: selectedFile.language || '', content: fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? '' }
    : null;

  const previewContent = getPreviewContent();

  // Inline panel content — NOT a nested component to avoid React hook rules issues
  const renderPanelContent = () => {
    if (activeTab === 'files') return (
      <FileExplorer files={files} selectedFileId={selectedFile?.id} onSelectFile={handleSelectFile} onCreateFile={createFile} onDeleteFile={deleteFile} onRenameFile={renameFile} />
    );
    if (activeTab === 'search') return (
      <SearchPanel files={files} currentFile={selectedFile?.id} onSelectFile={handleSelectFile} />
    );
    if (activeTab === 'git') return (
      <VersionHistory versions={versions} files={files} onRestoreVersion={restoreVersion} onCreateVersion={createVersion} onViewVersion={(v) => { if (v.file_id) { const f = files.find((fi) => fi.id === v.file_id); if (f) handleSelectFile(f); } }} />
    );
    if (activeTab === 'chat') return (
      <ChatPanel messages={messages} currentUserId={user?.id || ''} onSendMessage={handleSendMessage} />
    );
    return null;
  };

  const mobileNavItems = [
    { id: 'files' as const, icon: Files, label: 'Files' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'History' },
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <TopBar
        projectName={project.name}
        onMenuToggle={() => setMobileDrawerOpen((v) => !v)}
        onRun={() => { if (canShowPreview) setShowPreview((v) => !v); }}
        onExport={() => {
          const htmlFile = files.find((f) => f.name.endsWith('.html'));
          if (htmlFile?.content) {
            const blob = new Blob([htmlFile.content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = htmlFile.name; a.click();
            URL.revokeObjectURL(url);
          }
        }}
        onShare={() => { navigator.clipboard.writeText(window.location.href); alert('Project URL copied!'); }}
        onSaveStatus={saveStatus}
      />

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Desktop icon sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); }}
            onDashboard={onBackToDashboard}
          />
        </div>

        {/* Settings overlay — covers full content area */}
        {activeTab === 'settings' && (
          <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 bg-slate-800/80 shrink-0">
              <span className="text-sm font-semibold text-white">Settings</span>
              <button
                onClick={() => setActiveTab('files')}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <SettingsPanel />
            </div>
          </div>
        )}

        {/* Mobile drawer backdrop */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* Desktop left panel */}
        <div
          style={{ width: leftWidth }}
          className="hidden md:flex flex-col border-r border-slate-700/50 relative shrink-0"
        >
          {renderPanelContent()}
          <div
            onMouseDown={handleMouseDown}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-cyan-500/30 transition-colors z-10"
          />
        </div>

        {/* Mobile drawer */}
        <div
          className={`fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-700/50 z-30 transform transition-transform duration-200 md:hidden flex flex-col ${
            mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
            <div className="flex gap-1">
              {mobileNavItems.slice(0, 4).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`p-2 rounded-lg transition-colors ${activeTab === id ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {renderPanelContent()}
          </div>
        </div>

        {/* Main editor + preview area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Editor column */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${showPreview && canShowPreview ? 'md:max-w-[50%]' : ''}`}>
              {/* File tabs */}
              {openFiles.length > 0 && (
                <div className="h-10 flex items-center bg-slate-800/50 border-b border-slate-700/50 overflow-x-auto shrink-0">
                  {openFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm border-r border-slate-700/50 whitespace-nowrap shrink-0 cursor-pointer select-none ${
                        selectedFile?.id === file.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <span
                        onClick={(e) => closeFile(e, file.id)}
                        className="w-4 h-4 flex items-center justify-center rounded hover:text-red-400 text-slate-500 cursor-pointer"
                        role="button"
                        aria-label="Close tab"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {selectedFile && !selectedFile.is_folder ? (
                  <CodeEditor
                    language={selectedFile.language || 'plaintext'}
                    value={fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? ''}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    onCursorChange={setCursorPosition}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 px-4">
                    <div className="text-center">
                      <p className="text-lg mb-2">No file selected</p>
                      <p className="text-sm">Select a file from the explorer to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview panel — desktop only, web files only */}
            {showPreview && canShowPreview && (
              <div className="hidden md:block w-[50%] border-l border-slate-700/50 shrink-0">
                <Preview
                  html={previewContent.html}
                  css={previewContent.css}
                  javascript={previewContent.javascript}
                />
              </div>
            )}
          </div>

          <Terminal currentFile={selectedFileForTerminal} />
        </div>
      </div>

      {/* Desktop status bar */}
      <div className="hidden md:block shrink-0">
        <StatusBar
          line={cursorPosition.lineNumber}
          column={cursorPosition.column}
          language={selectedFile?.language || 'plaintext'}
          connected={true}
        />
      </div>

      {/* Mobile bottom navigation */}
      <nav className="flex md:hidden border-t border-slate-700/50 bg-slate-900 shrink-0">
        {mobileNavItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'settings') {
                setActiveTab('settings');
              } else {
                setActiveTab(id);
                setMobileDrawerOpen(true);
              }
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              activeTab === id ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function getLang(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'cpp', hpp: 'cpp',
    cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
    swift: 'swift', kt: 'kotlin', html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less', json: 'json', xml: 'xml',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', sql: 'sql',
    sh: 'shell', bash: 'shell', dockerfile: 'dockerfile',
  };
  return map[ext || ''] || 'plaintext';
}
