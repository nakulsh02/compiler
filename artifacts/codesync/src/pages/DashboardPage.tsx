import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Plus,
  Folder,
  Star,
  Clock,
  Trash2,
  Copy,
  FileCode,
  Search,
  Grid,
  List,
  Star as StarIcon,
} from 'lucide-react';
import clsx from 'clsx';
import type { Project } from '../types';

interface DashboardPageProps {
  onOpenProject: (project: Project) => void;
  onNewProject: () => void;
}

export function DashboardPage({ onOpenProject }: DashboardPageProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('javascript');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
    setLoading(false);
  }

  async function createProject() {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);

    try {
      const project = await api.projects.create({
        name: newProjectName,
        language: newProjectLanguage,
      });

      const template = getFileTemplate(newProjectLanguage);
      await api.files.bulkCreate(project.id, [
        { name: 'src', path: '/src', is_folder: true },
        {
          name: template.name,
          path: template.path,
          content: template.content,
          language: newProjectLanguage,
          is_folder: false,
        },
        {
          name: 'index.html',
          path: '/index.html',
          content: getHtmlTemplate(newProjectName),
          language: 'html',
          is_folder: false,
        },
      ]);

      setProjects([project, ...projects]);
      setShowNewProjectModal(false);
      setNewProjectName('');
      onOpenProject(project);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
    setCreating(false);
  }

  async function deleteProject(project: Project) {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.projects.delete(project.id);
      setProjects(projects.filter((p) => p.id !== project.id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  async function toggleStar(project: Project) {
    try {
      const updated = await api.projects.update(project.id, { starred: !project.starred });
      setProjects(projects.map((p) => (p.id === project.id ? updated : p)));
    } catch (err) {
      console.error('Failed to star project:', err);
    }
  }

  async function duplicateProject(project: Project) {
    try {
      const newProject = await api.projects.create({
        name: `${project.name} (Copy)`,
        language: project.language,
      });

      const files = await api.files.list(project.id);
      if (files.length > 0) {
        await api.files.bulkCreate(
          newProject.id,
          files.map((f) => ({
            name: f.name,
            path: f.path,
            content: f.content,
            language: f.language,
            is_folder: f.is_folder,
            parent_id: f.parent_id,
          }))
        );
      }

      setProjects([newProject, ...projects]);
    } catch (err) {
      console.error('Failed to duplicate project:', err);
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const owned = project.owner_id === user?.id;
    const shared = project.owner_id !== user?.id;

    switch (filter) {
      case 'owned':
        return matchesSearch && owned;
      case 'shared':
        return matchesSearch && shared;
      case 'starred':
        return matchesSearch && project.starred;
      default:
        return matchesSearch;
    }
  });

  const recentProjects = filteredProjects.slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user?.display_name || 'Developer'}
              </h1>
              <p className="text-slate-400 mt-1">
                {projects.length} project{projects.length !== 1 && 's'} total
              </p>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'owned', 'shared', 'starred'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm transition-colors capitalize',
                    filter === f
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </header>

        {recentProjects.length > 0 && filter === 'all' && (
          <section className="mb-8">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Recent Projects
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-colors text-left group"
                >
                  <FileCode className="w-8 h-8 mb-3 text-cyan-400" />
                  <h3 className="text-white font-medium truncate">{project.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{project.language}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-slate-400" />
              All Projects
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-1.5 rounded', viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-1.5 rounded', viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-800 border border-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
              <p className="text-slate-400 mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first project to get started'}
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-colors group"
                >
                  <button onClick={() => onOpenProject(project)} className="w-full text-left">
                    <div className="flex items-start justify-between mb-3">
                      <FileCode className="w-8 h-8 text-cyan-400" />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(project); }}
                        className={clsx(
                          'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                          project.starred ? 'text-yellow-400 opacity-100' : 'text-slate-400 hover:text-yellow-400'
                        )}
                      >
                        <StarIcon className="w-4 h-4" fill={project.starred ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <h3 className="text-white font-medium truncate mb-1">{project.name}</h3>
                    <p className="text-xs text-slate-500">
                      {project.language} - {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => duplicateProject(project)}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProject(project)}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 px-4 py-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/30 transition-colors group"
                >
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  <button onClick={() => onOpenProject(project)} className="flex-1 text-left">
                    <h3 className="text-white font-medium">{project.name}</h3>
                  </button>
                  <span className="text-sm text-slate-400">{project.language}</span>
                  <span className="text-sm text-slate-500">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => toggleStar(project)}
                    className={clsx(
                      'p-1 rounded opacity-0 group-hover:opacity-100',
                      project.starred ? 'text-yellow-400 opacity-100' : 'text-slate-400 hover:text-yellow-400'
                    )}
                  >
                    <StarIcon className="w-4 h-4" fill={project.starred ? 'currentColor' : 'none'} />
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => duplicateProject(project)} className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteProject(project)} className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                  placeholder="My Awesome Project"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                <select
                  value={newProjectLanguage}
                  onChange={(e) => setNewProjectLanguage(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML/CSS</option>
                  <option value="react">React</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectName.trim() || creating}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getFileTemplate(language: string) {
  const templates: Record<string, { name: string; path: string; content: string }> = {
    javascript: {
      name: 'index.js',
      path: '/src/index.js',
      content: `// Welcome to CodeSync!\n// Start coding here...\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('World'));\n`,
    },
    typescript: {
      name: 'index.ts',
      path: '/src/index.ts',
      content: `// Welcome to CodeSync!\n// TypeScript template\n\ninterface User {\n  name: string;\n  email: string;\n}\n\nfunction greet(user: User): string {\n  return \`Hello, \${user.name}!\`;\n}\n\nconst user: User = { name: 'Developer', email: 'dev@example.com' };\n\nconsole.log(greet(user));\n`,
    },
    python: {
      name: 'main.py',
      path: '/src/main.py',
      content: `# Welcome to CodeSync!\n# Start coding here...\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n`,
    },
    html: {
      name: 'style.css',
      path: '/src/style.css',
      content: `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  line-height: 1.5;\n}\n`,
    },
    react: {
      name: 'App.jsx',
      path: '/src/App.jsx',
      content: `import { useState } from 'react';\n\nfunction App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div style={{ padding: '2rem', textAlign: 'center' }}>\n      <h1>Hello, React!</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Increment\n      </button>\n    </div>\n  );\n}\n\nexport default App;\n`,
    },
  };
  return templates[language] || templates.javascript;
}

function getHtmlTemplate(name: string) {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${name}</title>\n  <link rel="stylesheet" href="/src/style.css">\n</head>\n<body>\n  <h1>Welcome to ${name}</h1>\n  <p>Start editing to see your changes!</p>\n</body>\n</html>`;
}
