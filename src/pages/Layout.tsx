import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, FileText, LogOut,
  History, User, Building, FolderOpen, ShieldCheck,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
  roles?: string[];   // se omesso, visibile a tutti i ruoli staff
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [location] = useLocation();

  const allNavItems: NavItem[] = [
    // Superadmin
    { href: '/tenants',   label: 'Tenant',    icon: Building,       roles: ['superadmin'] },

    // Staff comune
    { href: '/',          label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','employee'] },
    { href: '/requests',  label: 'Richieste', icon: FileText,        roles: ['admin','employee'] },
    { href: '/practices', label: 'Pratiche',  icon: FolderOpen,      roles: ['admin','employee'] },
    { href: '/clients',   label: 'Clienti',   icon: Users,           roles: ['admin'] },
    { href: '/audit',     label: 'Audit Log', icon: History,         roles: ['admin'] },

    // Superadmin dashboard
    { href: '/',          label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin'] },
  ];

  // Filtra per ruolo corrente e deduplicata per href
  const seen    = new Set<string>();
  const navItems = allNavItems.filter(item => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });

  const isActive = (href: string) =>
    href === '/' ? location === '/' : location.startsWith(href);

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ── Sidebar desktop ── */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">DocCollector+</h1>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {user.role === 'superadmin' && (
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <p className="text-xs text-gray-500 truncate">
              {user.role === 'superadmin'
                ? 'System Admin'
                : user.name || user.email}
            </p>
          </div>
        </div>

        {/* Nav principale */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon   = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                            font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-gray-200 space-y-0.5">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium
                        rounded-lg transition-colors ${
              isActive('/profile')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <User className={`w-4 h-4 flex-shrink-0 ${
              isActive('/profile') ? 'text-indigo-600' : 'text-gray-400'
            }`} />
            Il mio profilo
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium
                       text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Esci
          </button>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b
                      border-gray-200 flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">DocCollector+</span>
        </div>
        <button onClick={onLogout} className="text-gray-500 hover:text-red-600 p-1">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* ── Contenuto principale ── */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t
                      border-gray-200 flex justify-around items-center
                      px-2 py-1 z-20 shadow-lg">
        {navItems.slice(0, 5).map(item => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg min-w-0 flex-1 ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}