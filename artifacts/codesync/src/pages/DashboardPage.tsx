import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Plus, Folder, Clock, Trash2, Copy, FileCode, Search,
  Grid, List, Star, LogOut, Zap, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import type { Project } from '../types';

interface DashboardPageProps {
  onOpenProject: (project: Project) => void;
  onNewProject: () => void;
}

const LANG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  javascript: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  typescript: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  python: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  html: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  css: { bg: 'bg-pink-500/10', text: 'text-pink-400', dot: 'bg-pink-400' },
  react: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  java: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  rust: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  go: { bg: 'bg-teal-500/10', text: 'text-teal-400', dot: 'bg-teal-400' },
};
function langStyle(lang: string) {
  return LANG_COLORS[lang] ?? { bg: 'bg-slate-700/50', text: 'text-slate-400', dot: 'bg-slate-500' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type Filter = 'all' | 'owned' | 'shared' | 'starred';
type ViewMode = 'grid' | 'list';

export function DashboardPage({ onOpenProject }: DashboardPageProps) {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLang, setNewLang] = useState('javascript');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    setLoading(true);
    try { setProjects(await api.projects.list()); }
    catch (err) { console.error(err); }
    setLoading(false);
  }

  async function createProject() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const project = await api.projects.create({ name: newName, language: newLang });
      const template = getFileTemplate(newLang);
      await api.files.bulkCreate(project.id, [
        { name: 'src', path: '/src', is_folder: true },
        { name: template.name, path: template.path, content: template.content, language: newLang, is_folder: false },
        { name: 'index.html', path: '/index.html', content: getHtmlTemplate(newName), language: 'html', is_folder: false },
      ]);
      setProjects([project, ...projects]);
      setShowNewModal(false);
      setNewName('');
      onOpenProject(project);
    } catch (err) { console.error(err); }
    setCreating(false);
  }

  async function deleteProject(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.projects.delete(project.id);
      setProjects(projects.filter((p) => p.id !== project.id));
    } catch (err) { console.error(err); }
  }

  async function toggleStar(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const updated = await api.projects.update(project.id, { starred: !project.starred });
      setProjects(projects.map((p) => (p.id === project.id ? updated : p)));
    } catch (err) { console.error(err); }
  }

  async function duplicateProject(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const newProject = await api.projects.create({ name: `${project.name} (Copy)`, language: project.language });
      const files = await api.files.list(project.id);
      if (files.length > 0) {
        await api.files.bulkCreate(newProject.id, files.map((f) => ({
          name: f.name, path: f.path, content: f.content,
          language: f.language, is_folder: f.is_folder, parent_id: f.parent_id,
        })));
      }
      setProjects([newProject, ...projects]);
    } catch (err) { console.error(err); }
  }

  const filtered = projects.filter((p) => {
    const q = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const owned = p.owner_id === user?.id;
    if (filter === 'owned') return q && owned;
    if (filter === 'shared') return q && !owned;
    if (filter === 'starred') return q && p.starred;
    return q;
  });

  const recentProjects = projects
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  const initials = (user?.display_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <FileCode className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">CodeSync</span>
          </div>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full bg-slate-800/70 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <div className="relative group">
              <button className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-3 py-2 border-b border-slate-700/60">
                  <p className="text-xs font-medium text-white truncate">{user?.display_name || 'Developer'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Hero greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Hello, {user?.display_name?.split(' ')[0] || 'Developer'} 👋
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {projects.length} project{projects.length !== 1 ? 's' : ''} · last opened{' '}
              {recentProjects[0] ? timeAgo(recentProjects[0].updated_at) : '—'}
            </p>
          </div>
          {/* Stats row */}
          <div className="flex items-center gap-3">
            <StatBadge icon={<Folder className="w-3.5 h-3.5" />} label="Projects" value={projects.length} />
            <StatBadge icon={<Star className="w-3.5 h-3.5" />} label="Starred" value={projects.filter(p => p.starred).length} color="text-yellow-400" />
            <StatBadge icon={<Zap className="w-3.5 h-3.5" />} label="Shared" value={projects.filter(p => p.owner_id !== user?.id).length} color="text-green-400" />
          </div>
        </div>

        {/* Recent projects — horizontal scroll on mobile */}
        {filter === 'all' && !searchQuery && recentProjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Recent
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentProjects.map((p) => {
                const ls = langStyle(p.language);
                return (
                  <button
                    key={p.id}
                    onClick={() => onOpenProject(p)}
                    className="group relative p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 hover:border-cyan-500/40 hover:bg-slate-800 transition-all text-left overflow-hidden"
                  >
                    <div className={clsx('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', 'bg-gradient-to-br from-cyan-500/5 to-transparent')} />
                    <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-3', ls.bg)}>
                      <FileCode className={clsx('w-4 h-4', ls.text)} />
                    </div>
                    <p className="text-white text-sm font-medium truncate mb-1">{p.name}</p>
                    <p className="text-xs text-slate-500">{timeAgo(p.updated_at)}</p>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* All Projects */}
        <section>
          {/* Filter bar + view toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {(['all', 'owned', 'shared', 'starred'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize whitespace-nowrap',
                    filter === f
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  )}
                >
                  {f === 'starred' ? '★ Starred' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-2 rounded-lg transition-colors', viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-36 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-700/30" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState searchQuery={searchQuery} onNew={() => setShowNewModal(true)} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => onOpenProject(p)}
                  onStar={(e) => toggleStar(p, e)}
                  onDuplicate={(e) => duplicateProject(p, e)}
                  onDelete={(e) => deleteProject(p, e)}
                />
              ))}
              {/* New project card */}
              <button
                onClick={() => setShowNewModal(true)}
                className="h-36 rounded-2xl border-2 border-dashed border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-cyan-500/10 border border-slate-700 group-hover:border-cyan-500/30 flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">New Project</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden divide-y divide-slate-700/30">
              {filtered.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  onOpen={() => onOpenProject(p)}
                  onStar={(e) => toggleStar(p, e)}
                  onDuplicate={(e) => duplicateProject(p, e)}
                  onDelete={(e) => deleteProject(p, e)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* New project modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}
        >
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl sm:rounded-2xl rounded-b-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">New Project</h2>
              <p className="text-sm text-slate-400 mt-0.5">Pick a name and language to get started</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Project Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                  placeholder="My Awesome Project"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'javascript', label: 'JavaScript' },
                    { id: 'typescript', label: 'TypeScript' },
                    { id: 'python', label: 'Python' },
                    { id: 'html', label: 'HTML/CSS' },
                    { id: 'react', label: 'React' },
                    { id: 'java', label: 'Java' },
                  ].map((l) => {
                    const ls = langStyle(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => setNewLang(l.id)}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                          newLang === l.id
                            ? `${ls.bg} ${ls.text} border-current/40`
                            : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:border-slate-600'
                        )}
                      >
                        <span className={clsx('w-2 h-2 rounded-full shrink-0', ls.dot)} />
                        {l.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newName.trim() || creating}
                className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatBadge({ icon, label, value, color = 'text-slate-300' }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-800/50 border border-slate-700/40 rounded-xl px-3 py-2 min-w-[56px]">
      <span className={clsx('mb-0.5', color)}>{icon}</span>
      <span className="text-white text-base font-bold leading-none">{value}</span>
      <span className="text-slate-500 text-[10px] mt-0.5">{label}</span>
    </div>
  );
}

function ProjectCard({ project: p, onOpen, onStar, onDuplicate, onDelete }: {
  project: Project; onOpen: () => void;
  onStar: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const ls = langStyle(p.language);
  return (
    <div
      onClick={onOpen}
      className="group relative p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800 transition-all cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

      {/* Star */}
      <button
        onClick={onStar}
        className={clsx(
          'absolute top-3 right-3 p-1 rounded-lg transition-all',
          p.starred
            ? 'text-yellow-400'
            : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400 hover:bg-slate-700/50'
        )}
      >
        <Star className="w-3.5 h-3.5" fill={p.starred ? 'currentColor' : 'none'} />
      </button>

      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', ls.bg)}>
        <FileCode className={clsx('w-4.5 h-4.5', ls.text)} />
      </div>

      <h3 className="text-white text-sm font-semibold truncate pr-6 mb-1">{p.name}</h3>

      <div className="flex items-center gap-1.5 mb-3">
        <span className={clsx('w-1.5 h-1.5 rounded-full', ls.dot)} />
        <span className="text-xs text-slate-500 capitalize">{p.language}</span>
        <span className="text-slate-700">·</span>
        <span className="text-xs text-slate-600">{timeAgo(p.updated_at)}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

function ProjectRow({ project: p, onOpen, onStar, onDuplicate, onDelete }: {
  project: Project; onOpen: () => void;
  onStar: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const ls = langStyle(p.language);
  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/20 transition-colors cursor-pointer"
    >
      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', ls.bg)}>
        <FileCode className={clsx('w-4 h-4', ls.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{p.name}</p>
        <p className="text-xs text-slate-500 truncate capitalize">{p.language}</p>
      </div>
      <span className="hidden sm:block text-xs text-slate-600 shrink-0">{timeAgo(p.updated_at)}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onStar} className={clsx('p-1.5 rounded-lg transition-colors', p.starred ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-700/50')}>
          <Star className="w-3.5 h-3.5" fill={p.starred ? 'currentColor' : 'none'} />
        </button>
        <button onClick={onDuplicate} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ searchQuery, onNew }: { searchQuery: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-4">
        <Folder className="w-7 h-7 text-slate-600" />
      </div>
      <h3 className="text-white font-semibold mb-1">
        {searchQuery ? 'No matching projects' : 'No projects yet'}
      </h3>
      <p className="text-slate-400 text-sm max-w-xs mb-5">
        {searchQuery ? 'Try a different search term.' : 'Create your first project to start coding.'}
      </p>
      {!searchQuery && (
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      )}
    </div>
  );
}

// ---- Templates ----
function getFileTemplate(language: string) {
  const templates: Record<string, { name: string; path: string; content: string }> = {
    javascript: { name: 'index.js', path: '/src/index.js', content: `// Welcome to CodeSync!\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('World'));\n` },
    typescript: { name: 'index.ts', path: '/src/index.ts', content: `// Welcome to CodeSync!\n\ninterface User {\n  name: string;\n  email: string;\n}\n\nfunction greet(user: User): string {\n  return \`Hello, \${user.name}!\`;\n}\n\nconst user: User = { name: 'Developer', email: 'dev@example.com' };\nconsole.log(greet(user));\n` },
    python: { name: 'main.py', path: '/src/main.py', content: `# Welcome to CodeSync!\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n` },
    html: { name: 'style.css', path: '/src/style.css', content: `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  line-height: 1.5;\n}\n` },
    react: { name: 'App.jsx', path: '/src/App.jsx', content: `import { useState } from 'react';\n\nfunction App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ padding: '2rem', textAlign: 'center' }}>\n      <h1>Hello, React!</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}\n\nexport default App;\n` },
    java: { name: 'Main.java', path: '/src/Main.java', content: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n` },
  };
  return templates[language] || templates.javascript;
}

function getHtmlTemplate(name: string) {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${name}</title>\n  <link rel="stylesheet" href="/src/style.css">\n</head>\n<body>\n  <h1>Welcome to ${name}</h1>\n  <p>Start editing to see your changes!</p>\n</body>\n</html>`;
}
