'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShieldAlert,
  Settings2,
  ShieldCheck,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  GitPullRequest,
  BarChart2,
  Key,
  Rocket,
  Activity,
  Settings,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  repoId?: string;
  repoName?: string;
}

export default function DashboardLayout({ children, repoId, repoName }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const repoQuery = repoId && repoName
    ? `?repoId=${repoId}&repoName=${encodeURIComponent(repoName)}`
    : '';

  const navItems: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    active: boolean;
    disabled: boolean;
    badge?: string;
  }> = [
    { label: 'Getting Started', icon: Rocket,       href: '/getting-started', active: pathname === '/getting-started',           disabled: false },
    { label: 'Repositories',    icon: Home,          href: '/repos',           active: pathname === '/repos',                      disabled: false },
    { label: 'Findings',        icon: ShieldAlert,   href: repoId ? `/dashboard${repoQuery}` : '/dashboard', active: pathname === '/dashboard', disabled: !repoId },
    { label: 'Policies',        icon: Settings2,     href: repoId ? `/dashboard/policies${repoQuery}` : '/dashboard/policies', active: pathname === '/dashboard/policies', disabled: !repoId },
    { label: 'Pull Requests',   icon: GitPullRequest, href: '/prs',            active: pathname === '/prs' || pathname.startsWith('/prs/'), disabled: false },
    { label: 'Analytics',       icon: BarChart2,     href: '/analytics',       active: pathname === '/analytics',                  disabled: false },
    { label: 'Repo Health',     icon: Activity,      href: '/repo-health',     active: pathname.startsWith('/repo-health'),         disabled: false, badge: 'BETA' },
    { label: 'API Tokens',      icon: Key,           href: '/tokens',          active: pathname === '/tokens',                     disabled: false },
    { label: 'Settings',        icon: Settings,      href: '/settings',        active: pathname === '/settings',                   disabled: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto flex flex-col transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div
          className="flex-1 clay-lg m-2 p-3 flex flex-col overflow-hidden"
          style={{ borderRadius: '20px' }}
        >
          {/* Brand */}
          <div className={`flex items-center mb-6 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {collapsed ? (
              <Link href="/">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </Link>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-2.5">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <div>
                    <span className="text-base font-bold tracking-tight">Gatecheck</span>
                    <p className="text-[9px] text-muted-foreground leading-none">CI Security Scanner</p>
                  </div>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const content = (
                <>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${item.active ? 'text-primary' : ''}`} />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="clay-pill text-[8px] px-1.5 py-0 text-primary font-bold">{item.badge}</span>
                  )}
                </>
              );

              const baseClass = `w-full flex items-center gap-3 rounded-xl text-sm transition-all ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${
                item.active
                  ? 'clay-pressed text-foreground font-semibold'
                  : item.disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
              }`;

              if (item.disabled) {
                return (
                  <div key={item.label} className={baseClass} title={collapsed ? item.label : undefined}>
                    {content}
                  </div>
                );
              }

              return (
                <Link key={item.label} href={item.href} className={baseClass} title={collapsed ? item.label : undefined}>
                  {content}
                </Link>
              );
            })}
          </nav>

          {/* Bottom: repo context + collapse */}
          <div className="flex-shrink-0 pt-2 border-t border-white/[0.04] space-y-1">
            {/* Selected repo indicator */}
            {repoName && !collapsed && (
              <div className="px-3 py-2 rounded-xl">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Active repo</p>
                <p className="text-xs text-muted-foreground truncate">{repoName}</p>
              </div>
            )}

            {/* Collapse toggle (desktop only) */}
            <div className="hidden lg:block">
              <button
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={`w-full flex items-center gap-2.5 rounded-xl text-xs py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-all ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                }`}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 flex-shrink-0" />
                    Collapse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div
          className="lg:hidden sticky top-0 z-30 clay-sm mx-2 mt-2 px-3 py-2.5 flex items-center justify-between"
          style={{ borderRadius: '16px' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold">Gatecheck</span>
          </div>
          <div className="w-7" />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
