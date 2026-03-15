import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, FileText, LogOut,
  History, User, Building, FolderOpen, UsersRound,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','employee','superadmin'] },
    ...(user.role === 'superadmin' ? [
      { href: '/tenants', label: 'Tenant', icon: Building, roles: ['superadmin'] },
    ] : [
      { href: '/requests',  label: 'Richieste', icon: FileText,    roles: ['admin','employee'] },
      { href: '/practices', label: 'Pratiche',  icon: FolderOpen,  roles: ['admin','employee'] },
      { href: '/clients',   label: 'Clienti',   icon: Users,       roles: ['admin'] },
      { href: '/users',     label: 'Utenti',    icon: UsersRound,  roles: ['admin'] },
      { href: '/audit',     label: 'Audit Log', icon: History,     roles: ['admin'] },
    ]),
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            DocCollector+
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {user.role === 'superadmin' ? 'System Admin' : user.name || user.email}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon     = item.icon;
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-1">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-4 py-2 w-full text-sm font-medium rounded-lg transition-colors ${
              location === '/profile'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="w-5 h-5" />
            Profilo
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Esci
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10">
        <h1 className="text-lg font-bold text-indigo-600">DocCollector+</h1>
        <button onClick={onLogout} className="text-gray-500">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10">
        {navItems.slice(0, 4).map((item) => {
          const Icon     = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}