import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  profiles: {
    Row: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id: string;
      display_name?: string | null;
      avatar_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      display_name?: string | null;
      avatar_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  projects: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      owner_id: string;
      is_template: boolean;
      is_public: boolean;
      starred: boolean;
      language: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      description?: string | null;
      owner_id?: string;
      is_template?: boolean;
      is_public?: boolean;
      starred?: boolean;
      language?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      description?: string | null;
      owner_id?: string;
      is_template?: boolean;
      is_public?: boolean;
      starred?: boolean;
      language?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  project_files: {
    Row: {
      id: string;
      project_id: string;
      name: string;
      path: string;
      content: string | null;
      language: string | null;
      is_folder: boolean;
      parent_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      name: string;
      path: string;
      content?: string | null;
      language?: string | null;
      is_folder?: boolean;
      parent_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      name?: string;
      path?: string;
      content?: string | null;
      language?: string | null;
      is_folder?: boolean;
      parent_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  project_collaborators: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      role: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      user_id: string;
      role?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      user_id?: string;
      role?: string;
      created_at?: string;
    };
  };
  chat_messages: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      content: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      user_id: string;
      content: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      user_id?: string;
      content?: string;
      created_at?: string;
    };
  };
  versions: {
    Row: {
      id: string;
      project_id: string;
      file_id: string | null;
      user_id: string;
      content: string | null;
      message: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      file_id?: string | null;
      user_id: string;
      content?: string | null;
      message?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      file_id?: string | null;
      user_id?: string;
      content?: string | null;
      message?: string | null;
      created_at?: string;
    };
  };
};
