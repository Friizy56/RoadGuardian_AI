import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';

export const AppLayout = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex">
        {isAuthenticated && <Sidebar />}
        <main className={`flex-1 overflow-y-auto ${isAuthenticated ? 'md:ml-64' : ''}`}>
          <div className="container mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
