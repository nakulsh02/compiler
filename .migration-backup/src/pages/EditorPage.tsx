import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
import type { Project, ProjectFile, ChatMessage, Version, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  const [showPreview, setShowPreview] = useState(true);
  const [leftWidth, setLeftWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const fileContentRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    loadFiles();
    loadMessages();
    loadVersions();
  }, [project.id]);

  async function loadFiles() {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', project.id)
      .order('name');

    if (!error && data) {
      setFiles(data as ProjectFile[]);
      const mainFile = data.find((f: ProjectFile) => f.name === 'index.html' || f.name === 'index.js');
      if (mainFile && !selectedFile) {
        setSelectedFile(mainFile as ProjectFile);
        setOpenFiles([mainFile as ProjectFile]);
      }
    }
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, user:profiles!chat_messages_user_id_fkey(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
  }

  async function loadVersions() {
    const { data, error } = await supabase
      .from('versions')
      .select('*, user:profiles!versions_user_id_fkey(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setVersions(data as Version[]);
    }
  }

  const handleSelectFile = useCallback((file: ProjectFile) => {
    if (file.is_folder) return;
    setSelectedFile(file);
    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles([...openFiles, file]);
    }
  }, [openFiles]);

  const createFile = async (parentId: string | null, name: string, isFolder: boolean) => {
    const parent = parentId ? files.find((f) => f.id === parentId) : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;

    const language = isFolder ? undefined : getLanguageFromFileName(name);

    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id: project.id,
        name,
        path,
        is_folder: isFolder,
        language,
        parent_id: parentId,
        content: isFolder ? null : '',
      })
      .select()
      .single();

    if (!error && data) {
      setFiles([...files, data as ProjectFile]);
      if (!isFolder) {
        handleSelectFile(data as ProjectFile);
      }
    }
  };

  const deleteFile = async (file: ProjectFile) => {
    await supabase.from('project_files').delete().eq('id', file.id);
    setFiles(files.filter((f) => f.id !== file.id));
    setOpenFiles(openFiles.filter((f) => f.id !== file.id));
    if (selectedFile?.id === file.id) {
      setSelectedFile(openFiles[0] || null);
    }
  };

  const renameFile = async (file: ProjectFile, newName: string) => {
    const parent = file.parent_id ? files.find((f) => f.id === file.parent_id) : null;
    const path = parent ? `${parent.path}/${newName}` : `/${newName}`;

    const { error } = await supabase
      .from('project_files')
      .update({ name: newName, path, language: getLanguageFromFileName(newName) })
      .eq('id', file.id);

    if (!error) {
      setFiles(files.map((f) => (f.id === file.id ? { ...f, name: newName, path } : f)));
      setOpenFiles(openFiles.map((f) => (f.id === file.id ? { ...f, name: newName, path } : f)));
    }
  };

  const handleContentChange = useCallback(async (value: string) => {
    if (!selectedFile) return;

    setSaveStatus('saving');
    fileContentRef.current.set(selectedFile.id, value);

    const { error } = await supabase
      .from('project_files')
      .update({ content: value, updated_at: new Date().toISOString() })
      .eq('id', selectedFile.id);

    if (!error) {
      setFiles(files.map((f) =>
        f.id === selectedFile.id ? { ...f, content: value } : f
      ));
      setOpenFiles(openFiles.map((f) =>
        f.id === selectedFile.id ? { ...f, content: value } : f
      ));
      setSaveStatus('saved');
    } else {
      setSaveStatus('unsaved');
    }
  }, [selectedFile, files, openFiles]);

  const handleSave = useCallback(() => {
    if (selectedFile) {
      const content = fileContentRef.current.get(selectedFile.id) || selectedFile.content || '';
      handleContentChange(content);
    }
  }, [selectedFile, handleContentChange]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: project.id,
        user_id: user.id,
        content,
      })
      .select('*, user:profiles!chat_messages_user_id_fkey(*)')
      .single();

    if (!error && data) {
      setMessages([...messages, data as ChatMessage]);
    }
  };

  const createVersion = async (fileId: string | null, message: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('versions')
      .insert({
        project_id: project.id,
        file_id: fileId,
        user_id: user.id,
        content: selectedFile?.content || null,
        message,
      })
      .select('*, user:profiles!versions_user_id_fkey(*)')
      .single();

    if (!error && data) {
      setVersions([data as Version, ...versions]);
    }
  };

  const restoreVersion = async (version: Version) => {
    if (version.file_id && version.content) {
      await supabase
        .from('project_files')
        .update({ content: version.content, updated_at: new Date().toISOString() })
        .eq('id', version.file_id);

      setFiles(files.map((f) =>
        f.id === version.file_id ? { ...f, content: version.content } : f
      ));
    }
  };

  const getPreviewContent = () => {
    const htmlFile = files.find((f) => f.name.endsWith('.html'));
    const cssFiles = files.filter((f) => f.name.endsWith('.css') || f.name.endsWith('.scss'));
    const jsFiles = files.filter((f) => f.name.endsWith('.js') || f.name.endsWith('.jsx'));

    return {
      html: htmlFile?.content || '<h1>No HTML file found</h1><p>Create an index.html file to see preview</p>',
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
      const newWidth = e.clientX - 56;
      setLeftWidth(Math.max(150, Math.min(400, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const previewContent = getPreviewContent();

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden select-none">
      <TopBar
        projectName={project.name}
        onRun={() => setShowPreview(!showPreview)}
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
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDashboard={onBackToDashboard}
        />

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
            <SearchPanel
              files={files}
              currentFile={selectedFile?.id}
              onSelectFile={handleSelectFile}
            />
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
            <ChatPanel
              messages={messages}
              currentUserId={user?.id || ''}
              onSendMessage={handleSendMessage}
            />
          )}
          {activeTab === 'settings' && <SettingsPanel />}

          <div
            onMouseDown={handleMouseDown}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-cyan-500/30 transition-colors"
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className={`flex-1 flex flex-col min-w-0 ${showPreview ? 'max-w-[50%]' : ''}`}>
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
                          setOpenFiles(openFiles.filter((f) => f.id !== file.id));
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
                    value={fileContentRef.current.get(selectedFile.id) || selectedFile.content || ''}
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

            {showPreview && (
              <div className="w-[50%] border-l border-slate-700/50">
                <Preview
                  html={previewContent.html}
                  css={previewContent.css}
                  javascript={previewContent.javascript}
                />
              </div>
            )}
          </div>

          <Terminal />
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
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    dockerfile: 'dockerfile',
  };
  return languages[ext || ''] || 'plaintext';
}
