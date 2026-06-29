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
  const fileContentRef = useRef<Map<string, string>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive whether to show preview based on selected file language
  const isWebFile = selectedFile
    ? WEB_LANGUAGES.has(selectedFile.language || '')
    : false;

  useEffect(() => {
    loadFiles();
    loadMessages();
    loadVersions();

    const socket = io('/', { path: '/api/socket.io' });
    socketRef.current = socket;
    socket.emit('join-project', project.id);

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

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
      const mainFile = data.find((f) => f.name === 'index.html' || f.name === 'index.js' || f.name === 'main.py');
      if (mainFile && !selectedFile) {
        setSelectedFile(mainFile);
        setOpenFiles([mainFile]);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }

  async function loadMessages() {
    try {
      const data = await api.messages.list(project.id);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  async function loadVersions() {
    try {
      const data = await api.versions.list(project.id);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }

  const handleSelectFile = useCallback((file: ProjectFile) => {
    if (file.is_folder) return;
    setSelectedFile(file);
    setOpenFiles((prev) => (prev.find((f) => f.id === file.id) ? prev : [...prev, file]));
  }, []);

  const createFile = async (parentId: string | null, name: string, isFolder: boolean) => {
    const parent = parentId ? files.find((f) => f.id === parentId) : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;
    const language = isFolder ? undefined : getLanguageFromFileName(name);
    try {
      const file = await api.files.create(project.id, {
        name, path, is_folder: isFolder, language,
        parent_id: parentId || undefined,
        content: isFolder ? undefined : '',
      });
      setFiles((prev) => [...prev, file]);
      if (!isFolder) handleSelectFile(file);
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      await api.files.delete(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setOpenFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedFile?.id === file.id) {
        setSelectedFile(openFiles.find((f) => f.id !== file.id) || null);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const renameFile = async (file: ProjectFile, newName: string) => {
    const parent = file.parent_id ? files.find((f) => f.id === file.parent_id) : null;
    const path = parent ? `${parent.path}/${newName}` : `/${newName}`;
    try {
      await api.files.update(file.id, { name: newName, path, language: getLanguageFromFileName(newName) });
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, name: newName, path } : f)));
      setOpenFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, name: newName, path } : f)));
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
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
        setFiles((prev) => prev.map((f) => (f.id === selectedFile.id ? { ...f, content: value } : f)));
        setSaveStatus('saved');
        socketRef.current?.emit('file-change', {
          projectId: project.id, fileId: selectedFile.id, content: value,
        });
      } catch {
        setSaveStatus('unsaved');
      }
    }, 800);
  }, [selectedFile, project.id]);

  const handleSave = useCallback(() => {
    if (!selectedFile) return;
    const content = fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? '';
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    api.files.update(selectedFile.id, { content })
      .then(() => { setFiles((prev) => prev.map((f) => (f.id === selectedFile.id ? { ...f, content } : f))); setSaveStatus('saved'); })
      .catch(() => setSaveStatus('unsaved'));
  }, [selectedFile]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    try {
      const msg = await api.messages.create(project.id, content);
      setMessages((prev) => [...prev, msg]);
      socketRef.current?.emit('chat-message', { projectId: project.id, message: msg });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const createVersion = async (fileId: string | null, message: string) => {
    if (!user) return;
    try {
      const version = await api.versions.create(project.id, {
        file_id: fileId || undefined,
        content: selectedFile?.content || undefined,
        message,
      });
      setVersions((prev) => [version, ...prev]);
    } catch (err) {
      console.error('Failed to create version:', err);
    }
  };

  const restoreVersion = async (version: Version) => {
    if (version.file_id && version.content) {
      try {
        await api.files.update(version.file_id, { content: version.content });
        setFiles((prev) => prev.map((f) => (f.id === version.file_id ? { ...f, content: version.content } : f)));
      } catch (err) {
        console.error('Failed to restore version:', err);
      }
    }
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setLeftWidth(Math.max(150, Math.min(400, e.clientX - 56)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Get the up-to-date content for the selected file (for Terminal)
  const selectedFileForTerminal = selectedFile
    ? {
        name: selectedFile.name,
        language: selectedFile.language || '',
        content: fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? '',
      }
    : null;

  const previewContent = getPreviewContent();
  const canShowPreview = isWebFile || files.some((f) => WEB_LANGUAGES.has(f.language || ''));

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden select-none">
      <TopBar
        projectName={project.name}
        onRun={() => {
          if (canShowPreview) setShowPreview(!showPreview);
        }}
        onExport={() => {
          const htmlFile = files.find((f) => f.name.endsWith('.html'));
          if (htmlFile?.content) {
            const blob = new Blob([htmlFile.content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = htmlFile.name;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}
        onShare={() => {
          navigator.clipboard.writeText(window.location.href);
          alert('Project URL copied to clipboard!');
        }}
        onSaveStatus={saveStatus}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onDashboard={onBackToDashboard} />

        <div style={{ width: leftWidth }} className="min-w-[150px] max-w-[400px] flex flex-col border-r border-slate-700/50 relative">
          {activeTab === 'files' && (
            <FileExplorer
              files={files}
              selectedFileId={selectedFile?.id}
              onSelectFile={handleSelectFile}
              onCreateFile={createFile}
              onDeleteFile={deleteFile}
              onRenameFile={renameFile}
            />
          )}
          {activeTab === 'search' && (
            <SearchPanel files={files} currentFile={selectedFile?.id} onSelectFile={handleSelectFile} />
          )}
          {activeTab === 'git' && (
            <VersionHistory
              versions={versions}
              files={files}
              onRestoreVersion={restoreVersion}
              onCreateVersion={createVersion}
              onViewVersion={(v) => {
                if (v.file_id) {
                  const file = files.find((f) => f.id === v.file_id);
                  if (file) handleSelectFile(file);
                }
              }}
            />
          )}
          {activeTab === 'chat' && (
            <ChatPanel messages={messages} currentUserId={user?.id || ''} onSendMessage={handleSendMessage} />
          )}
          {activeTab === 'settings' && <SettingsPanel />}

          <div
            onMouseDown={handleMouseDown}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-cyan-500/30 transition-colors"
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className={`flex-1 flex flex-col min-w-0 ${showPreview && canShowPreview ? 'max-w-[50%]' : ''}`}>
              {openFiles.length > 0 && (
                <div className="h-10 flex items-center bg-slate-800/50 border-b border-slate-700/50 overflow-x-auto">
                  {openFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-slate-700/50 ${
                        selectedFile?.id === file.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      {file.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFiles((prev) => prev.filter((f) => f.id !== file.id));
                          if (selectedFile?.id === file.id) {
                            setSelectedFile(openFiles.find((f) => f.id !== file.id) || null);
                          }
                        }}
                        className="hover:text-red-400"
                      >
                        <span className="text-xs">&times;</span>
                      </button>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 min-h-0">
                {selectedFile && !selectedFile.is_folder ? (
                  <CodeEditor
                    language={selectedFile.language || 'plaintext'}
                    value={fileContentRef.current.get(selectedFile.id) ?? selectedFile.content ?? ''}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    onCursorChange={setCursorPosition}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <p className="text-lg mb-2">No file selected</p>
                      <p className="text-sm">Select a file from the explorer to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showPreview && canShowPreview && (
              <div className="w-[50%] border-l border-slate-700/50">
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

      <StatusBar
        line={cursorPosition.lineNumber}
        column={cursorPosition.column}
        language={selectedFile?.language || 'plaintext'}
        connected={true}
      />
    </div>
  );
}

function getLanguageFromFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const languages: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'cpp', hpp: 'cpp',
    cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
    swift: 'swift', kt: 'kotlin', html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less', json: 'json', xml: 'xml',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', sql: 'sql',
    sh: 'shell', bash: 'shell', dockerfile: 'dockerfile',
  };
  return languages[ext || ''] || 'plaintext';
}
