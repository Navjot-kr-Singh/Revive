import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: '/dashboard', label: 'Control Room', icon: '◉' },
    { href: '/dashboard/cases', label: 'Cases', icon: '◆' },
    { href: '/dashboard/incidents', label: 'Incidents', icon: '▲' },
    { href: '/dashboard/simulator', label: 'Simulator', icon: '◈' },
    { href: '/dashboard/experiments', label: 'Experiments', icon: '◇' },
    { href: '/dashboard/audit', label: 'Audit', icon: '◻' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Link href="/dashboard" className="block">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>REVIVE</h1>
            <p className="text-xs" style={{ color: 'var(--accent-green)' }}>Revenue Control</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
