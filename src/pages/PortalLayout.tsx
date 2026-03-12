import React from 'react';
import { Link, useLocation } from 'wouter';
import { FileText, Clock, CheckCircle, FolderOpen, LogOut, Download } from 'lucide-react';

interface Props { children: React.ReactNode; user: any; onLogout: () => void; }

export default function PortalLayout({ children, user, onLogout }: Props) {
  const [location] = useLocation();

  const nav = [
    { href: '/portale',           label: 'Riepilogo',           icon: FileText },
    { href: '/portale/richieste', label: 'Documenti Richiesti', icon: Clock },
    // Temporaneamente commentati fino a Sprint 2/4:
    // { href: '/portale/pratiche',  label: 'Pratiche',            icon: FolderOpen },
    // { href: '/portale/ricevuti',  label: 'Documenti Ricevuti',  icon: Download },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <FileText className="w-5 h-5" /> DocCollector+
          </div>
          <p className="text-xs text-gray-500 mt-1">Area Clienti</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location === href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-500">Accesso come</p>
            <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium
                       text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}