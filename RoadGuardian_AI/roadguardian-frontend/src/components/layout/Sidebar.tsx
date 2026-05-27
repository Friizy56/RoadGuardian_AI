import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Trophy, User as UserIcon, ShieldPlus, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/utils';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/report', icon: ShieldPlus, label: 'Report Hazard' },
    { to: '/heatmap', icon: Map, label: 'Heatmap' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  if (user?.role === 'authority') {
    links.push({ to: '/authority', icon: ShieldAlert, label: 'Authority Portal' });
  }

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "fixed top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border bg-background transition-transform md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col py-4">
          <nav className="grid gap-1 px-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
