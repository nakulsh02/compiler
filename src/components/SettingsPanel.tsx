import { useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Keyboard,
  Database,
  Lock,
  Monitor,
  Moon,
  Sun,
  Save,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'keyboard' | 'storage' | 'security';

export function SettingsPanel() {
  const { user, signOut, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'keyboard' as const, icon: Keyboard, label: 'Keyboard Shortcuts' },
    { id: 'storage' as const, icon: Database, label: 'Storage' },
    { id: 'security' as const, icon: Lock, label: 'Security' },
  ];

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName });
    if (!error) {
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="h-full flex bg-slate-800/50">
      <div className="w-56 border-r border-slate-700/50 flex flex-col">
        <div className="p-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Settings
          </h2>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'profile' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Profile Settings</h3>
            {message && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {message}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Theme
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                      theme === 'dark'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    )}
                  >
                    <Moon className="w-5 h-5 text-slate-300" />
                    <span className="text-sm text-slate-300">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                      theme === 'light'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    )}
                  >
                    <Sun className="w-5 h-5 text-slate-300" />
                    <span className="text-sm text-slate-300">Light</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Font Size
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  defaultValue="14"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Notifications</h3>
            <div className="space-y-4">
              {[
                { label: 'Project invitations', description: 'Get notified when someone invites you to a project' },
                { label: 'Mentions', description: 'Get notified when someone mentions you in chat' },
                { label: 'Project updates', description: 'Get notified about updates to projects you collaborate on' },
                { label: 'User joins', description: 'Get notified when someone joins a project' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <div className="text-sm text-white">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'keyboard' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">Save File</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+S</kbd>
              </div>
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">Find</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">Find and Replace</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+H</kbd>
              </div>
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">Format Document</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+Shift+F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">Toggle Terminal</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+`</kbd>
              </div>
              <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <span className="text-sm text-slate-300">New File</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ctrl+N</kbd>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Storage</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Storage Used</span>
                  <span className="text-sm text-white">125 MB / 1 GB</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-[12.5%] h-full bg-cyan-500 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'Projects', size: '50 MB' },
                  { type: 'Versions', size: '40 MB' },
                  { type: 'Assets', size: '35 MB' },
                ].map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-sm text-slate-300">{item.type}</span>
                    <span className="text-sm text-white">{item.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-medium text-white mb-4">Security</h3>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="text-left">
                  <div className="text-sm text-white">Change Password</div>
                  <div className="text-xs text-slate-400">Update your password</div>
                </div>
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="text-left">
                  <div className="text-sm text-white">Two-Factor Authentication</div>
                  <div className="text-xs text-slate-400">Add an extra layer of security</div>
                </div>
              </button>
              <div className="pt-4 border-t border-slate-700">
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
