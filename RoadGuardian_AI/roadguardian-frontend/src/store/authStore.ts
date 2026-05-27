import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  initializeAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  
  initializeAuth: () => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'Citizen',
            role: 'citizen',
            points: 0,
            badges: []
          },
          isInitialized: true
        });
      } else {
        set({ isInitialized: true, isAuthenticated: false, user: null, token: null });
      }
    });

    // Listen for OAuth redirects and auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'Citizen',
            role: 'citizen',
            points: 0,
            badges: []
          },
          isInitialized: true
        });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
