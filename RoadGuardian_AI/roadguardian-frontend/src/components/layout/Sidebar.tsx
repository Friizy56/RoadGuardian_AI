import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Trophy, User as UserIcon, ShieldPlus, ShieldAlert, ChevronRight, Briefcase, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/utils';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Citizen Overview' },
    { to: '/report', icon: ShieldPlus, label: 'Lodge New Report' },
    { to: '/heatmap', icon: Map, label: 'Geospatial Analytics' },
    { to: '/leaderboard', icon: Trophy, label: 'Civic Leaderboard' },
    { to: '/profile', icon: UserIcon, label: 'My Records & Badges' },
  ];

  if (user?.role === 'authority') {
    links.push({ to: '/authority', icon: ShieldAlert, label: 'Department Console' });
    links.push({ to: '/tenders', icon: Briefcase, label: 'Tenders & Bidding' });
  }

  // Always show WhatsApp Demo for all roles
  links.push({ to: '/whatsapp-demo', icon: MessageCircle, label: 'WhatsApp Simulator' });
  links.push({ to: '/whatsapp-messages', icon: MessageCircle, label: 'WhatsApp Messages' });

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "fixed md:sticky top-[104px] z-40 h-[calc(100vh-104px)] w-[260px] border-r border-border bg-card transition-transform md:translate-x-0 shadow-md shrink-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="bg-[#000080] text-white p-3 border-b-2 border-[#FF9933]">
          <h2 className="text-sm font-black uppercase tracking-wider">Quick Links</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
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
                    "flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase transition-colors border rounded-sm",
                    isActive 
                      ? "bg-primary/10 border-primary text-[#000080] dark:text-primary shadow-sm" 
                      : "border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                    {link.label}
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 bg-muted border-t border-border mt-auto">
          <div className="text-[10px] text-muted-foreground text-center font-bold uppercase">
            System V2.4 | Encrypted Node
          </div>
        </div>
      </aside>
    </>
  );
};
