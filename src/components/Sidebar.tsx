import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Files,
  Search,
  GitBranch,
  MessageSquare,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  ChevronDown,
  MoreHorizontal,
  FolderTree,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: 'files' | 'search' | 'git' | 'chat' | 'settings';
  onTabChange: (tab: SidebarProps['activeTab']) => void;
  onDashboard: () => void;
}

export function Sidebar({ activeTab, onTabChange, onDashboard }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: 'files' as const, icon: Files, label: 'Files' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'Version History' },
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  ];

  return (
    <div className="w-14 bg-slate-900 border-r border-slate-700/50 flex flex-col items-center py-4">
      <button
        onClick={onDashboard}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all mb-4"
        title="Dashboard"
      >
        <LayoutDashboard className="w-5 h-5" />
      </button>

      <div className="w-8 h-px bg-slate-700/50 mb-4" />

      <div className="flex-1 flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      <div className="w-8 h-px bg-slate-700/50 mb-4" />

      <button
        onClick={() => onTabChange('settings')}
        className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-all mb-2',
          activeTab === 'settings'
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        )}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all overflow-hidden"
          title={user?.display_name || user?.email}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </button>

        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute bottom-0 left-full ml-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-700">
                <p className="font-medium text-white truncate">
                  {user?.display_name || 'User'}
                </p>
                <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onDashboard();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
