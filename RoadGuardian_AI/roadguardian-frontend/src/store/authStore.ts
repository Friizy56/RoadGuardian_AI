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
  updateUser: (data: Partial<User>) => void;
  guestLogin: (role: 'citizen' | 'authority') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  
  guestLogin: (role: 'citizen' | 'authority') => {
    set({
      token: "mock-guest-token",
      isAuthenticated: true,
      user: {
        id: "mock-guest-id",
        email: role === 'authority' ? 'president@roadguardian.gov.in' : 'citizen@roadguardian.gov.in',
        fullName: role === 'authority' ? 'Hon\'ble Head of State' : 'Strategic Citizen Observer',
        role: role,
        points: 9999,
        badges: [],
      },
      isInitialized: true
    });
  },

  initializeAuth: () => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const intendedRole = localStorage.getItem('intended_role') || 'citizen';
        const localProfileData = JSON.parse(localStorage.getItem(`profile_${session.user.id}`) || '{}');
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'Citizen',
            role: intendedRole as 'citizen' | 'authority',
            points: 0,
            badges: [],
            ...localProfileData
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
        const intendedRole = localStorage.getItem('intended_role') || 'citizen';
        const localProfileData = JSON.parse(localStorage.getItem(`profile_${session.user.id}`) || '{}');
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'Citizen',
            role: intendedRole as 'citizen' | 'authority',
            points: 0,
            badges: [],
            ...localProfileData
          },
          isInitialized: true
        });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      }
    });
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout failed, clearing store state directly", e);
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (data: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...data };
      // Persist the extra details locally
      localStorage.setItem(`profile_${state.user.id}`, JSON.stringify({
        phone: updatedUser.phone,
        aadhaar: updatedUser.aadhaar,
        state: updatedUser.state,
        address: updatedUser.address,
        avatar: updatedUser.avatar
      }));
      return { user: updatedUser };
    });
  }
}));

