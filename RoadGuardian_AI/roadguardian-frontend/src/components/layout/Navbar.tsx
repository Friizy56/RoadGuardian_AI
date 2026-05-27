import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme, setSidebarOpen, sidebarOpen } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {isAuthenticated && (
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">RoadGuardian AI</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user?.points || 0} pts
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Login</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Register</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
