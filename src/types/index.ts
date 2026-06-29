export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_template: boolean;
  is_public: boolean;
  starred: boolean;
  language: string;
  created_at: string;
  updated_at: string;
  owner?: User;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  path: string;
  content?: string;
  language?: string;
  is_folder: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  children?: ProjectFile[];
}

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  user?: User;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface Version {
  id: string;
  project_id: string;
  file_id?: string;
  user_id: string;
  content?: string;
  message?: string;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: string;
  type: 'user_joined' | 'user_left' | 'project_update' | 'mention' | 'invite';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  lineNumber: number;
  column: number;
}

export interface EditorTheme {
  name: string;
  type: 'light' | 'dark';
  colors?: Record<string, string>;
}

export type Role = 'owner' | 'editor' | 'viewer';

export type Language =
  | 'javascript' | 'typescript' | 'python' | 'java' | 'c' | 'cpp'
  | 'csharp' | 'go' | 'rust' | 'ruby' | 'php' | 'swift' | 'kotlin'
  | 'html' | 'css' | 'scss' | 'less' | 'json' | 'xml' | 'yaml'
  | 'markdown' | 'sql' | 'shell' | 'dockerfile';

export interface Template {
  id: string;
  name: string;
  description: string;
  language: Language;
  files: Omit<ProjectFile, 'id' | 'project_id' | 'created_at' | 'updated_at'>[];
}
