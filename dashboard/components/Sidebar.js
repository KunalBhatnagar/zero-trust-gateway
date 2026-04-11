'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/',         label: 'Dashboard',  icon: '📊' },
  { href: '/clients',  label: 'API Clients', icon: '🔑' },
  { href: '/threats',  label: 'Threats',    icon: '🚨' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">🔐</span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Zero-Trust</p>
          <p className="text-gray-500 text-xs">API Gateway</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-1 flex-1">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              path === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="bg-green-900/30 border border-green-700/40 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-medium">Gateway Online</span>
        </div>
      </div>
    </aside>
  );
}