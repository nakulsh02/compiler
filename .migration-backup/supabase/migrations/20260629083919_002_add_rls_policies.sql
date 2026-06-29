/*
# Add RLS Policies for All Tables

1. Security Policies
- profiles: Users can only access their own profile
- projects: Owner and collaborators can access
- project_files: Access through project membership
- project_collaborators: Owner manages collaborators
- chat_messages: Project members can read/write
- versions: Project members can read, editors can create
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects policies
DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id 
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM project_collaborators 
      WHERE project_collaborators.project_id = projects.id 
      AND project_collaborators.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated USING (
    auth.uid() = owner_id 
    OR EXISTS (
      SELECT 1 FROM project_collaborators 
      WHERE project_collaborators.project_id = projects.id 
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role IN ('owner', 'editor')
    )
  ) WITH CHECK (
    auth.uid() = owner_id 
    OR EXISTS (
      SELECT 1 FROM project_collaborators 
      WHERE project_collaborators.project_id = projects.id 
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Project files policies
DROP POLICY IF EXISTS "select_project_files" ON project_files;
CREATE POLICY "select_project_files" ON project_files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.owner_id = auth.uid() OR projects.is_public = true
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "insert_project_files" ON project_files;
CREATE POLICY "insert_project_files" ON project_files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
          AND project_collaborators.role IN ('owner', 'editor')
        ))
    )
  );

DROP POLICY IF EXISTS "update_project_files" ON project_files;
CREATE POLICY "update_project_files" ON project_files FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
          AND project_collaborators.role IN ('owner', 'editor')
        ))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
          AND project_collaborators.role IN ('owner', 'editor')
        ))
    )
  );

DROP POLICY IF EXISTS "delete_project_files" ON project_files;
CREATE POLICY "delete_project_files" ON project_files FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
          AND project_collaborators.role IN ('owner', 'editor')
        ))
    )
  );

-- Project collaborators policies
DROP POLICY IF EXISTS "select_project_collaborators" ON project_collaborators;
CREATE POLICY "select_project_collaborators" ON project_collaborators FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators pc 
          WHERE pc.project_id = projects.id 
          AND pc.user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "insert_project_collaborators" ON project_collaborators;
CREATE POLICY "insert_project_collaborators" ON project_collaborators FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_project_collaborators" ON project_collaborators;
CREATE POLICY "update_project_collaborators" ON project_collaborators FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_project_collaborators" ON project_collaborators;
CREATE POLICY "delete_project_collaborators" ON project_collaborators FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Chat messages policies
DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chat_messages.project_id 
      AND (projects.owner_id = auth.uid()
        OR projects.is_public = true
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chat_messages.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
        ))
    )
  );

-- Versions policies
DROP POLICY IF EXISTS "select_versions" ON versions;
CREATE POLICY "select_versions" ON versions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = versions.project_id 
      AND (projects.owner_id = auth.uid()
        OR projects.is_public = true
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "insert_versions" ON versions;
CREATE POLICY "insert_versions" ON versions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = versions.project_id 
      AND (projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_collaborators 
          WHERE project_collaborators.project_id = projects.id 
          AND project_collaborators.user_id = auth.uid()
          AND project_collaborators.role IN ('owner', 'editor')
        ))
    )
  );