import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  brandLabel: string;
  role: string;
}

function IconCar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

export function Sidebar({ items, brandLabel, role }: SidebarProps) {
  const { user, logout } = useAuth();
  const { totalUnread } = useChat();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function badgeFor(path: string): number {
    if (totalUnread <= 0) return 0;
    if (path.endsWith('/messages') || path.endsWith('/inbox')) {
      return totalUnread;
    }
    return 0;
  }

  const roleColor = role === 'ADMIN' ? 'text-red-400' : role === 'DEALER' ? 'text-amber-400' : 'text-blue-400';

  return (
    <aside className={[
      'h-screen flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-200 shrink-0',
      collapsed ? 'w-14' : 'w-56',
    ].join(' ')}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-center shrink-0">
          <IconCar />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-white tracking-wide uppercase truncate">AutoPrime</p>
            <p className={`text-xs font-mono uppercase tracking-widest ${roleColor}`}>{brandLabel}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 2}
            className={({ isActive }) => [
              'sidebar-item relative flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors duration-150',
              isActive
                ? 'active bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900',
            ].join(' ')}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {badgeFor(item.path) > 0 && (
              <span className={[
                'ml-auto shrink-0 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center',
                collapsed ? 'absolute right-1.5 top-1.5' : '',
              ].join(' ')}>
                {badgeFor(item.path) > 99 ? '99+' : badgeFor(item.path)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-zinc-600 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
          title="Logout"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-center h-7 rounded text-zinc-700 hover:text-zinc-400 hover:bg-zinc-900 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
