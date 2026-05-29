import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

type AuthSubscription = {
  unsubscribe: () => Promise<void> | void;
};

let authSubscription: AuthSubscription | null = null;

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

const syncUserWithBackend = async (token: string, fullName: string, role: 'citizen' | 'authority') => {
  try {
    const response = await api.post('/auth/sync', {
      full_name: fullName,
      role: role
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to sync auth state with backend:", error);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  
  guestLogin: (role: 'citizen' | 'authority') => {
    const fullName = role === 'authority' ? 'Hon\'ble Head of State' : 'Strategic Citizen Observer';
    const mockToken = role === 'authority' ? 'mock-guest-token-authority' : 'mock-guest-token-citizen';
    const guestUser = {
      id: role === 'authority' ? 'mock-guest-authority-id' : 'mock-guest-citizen-id',
      email: role === 'authority' ? 'president@roadguardian.gov.in' : 'citizen@roadguardian.gov.in',
      fullName: fullName,
      role: role,
      points: 9999,
      badges: [],
    };
    
    localStorage.setItem('guest_token', mockToken);
    localStorage.setItem('guest_user', JSON.stringify(guestUser));
    
    set({
      token: mockToken,
      isAuthenticated: true,
      user: guestUser,
      isInitialized: true
    });
    // Trigger sync for mock guest
    syncUserWithBackend(mockToken, fullName, role);
  },

  initializeAuth: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    // Check if there is a guest session stored in localStorage first
    const guestToken = localStorage.getItem('guest_token');
    const guestUserStr = localStorage.getItem('guest_user');
    
    if (guestToken && guestUserStr) {
      try {
        const guestUser = JSON.parse(guestUserStr);
        set({
          token: guestToken,
          isAuthenticated: true,
          user: guestUser,
          isInitialized: true
        });
        syncUserWithBackend(guestToken, guestUser.fullName, guestUser.role).then((dbUser) => {
          if (dbUser) {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                fullName: dbUser.full_name || state.user.fullName,
                role: dbUser.role as 'citizen' | 'authority'
              } : null
            }));
          }
        });
        return;
      } catch (e) {
        console.error("Failed to restore guest session:", e);
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const intendedRole = localStorage.getItem('intended_role') || 'citizen';
        const localProfileData = JSON.parse(localStorage.getItem(`profile_${session.user.id}`) || '{}');
        const fullName = session.user.user_metadata?.full_name || 'Citizen';
        
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName,
            role: intendedRole as 'citizen' | 'authority',
            points: 0,
            badges: [],
            ...localProfileData
          },
          isInitialized: true
        });
        
        // Sync with backend
        syncUserWithBackend(session.access_token, fullName, intendedRole as 'citizen' | 'authority').then((dbUser) => {
          if (dbUser) {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                fullName: dbUser.full_name || state.user.fullName,
                role: dbUser.role as 'citizen' | 'authority'
              } : null
            }));
            if (dbUser.role === 'citizen' && intendedRole === 'authority') {
              toast.error("Unauthorized! Your email does not have official department clearance.");
            }
          }
        });
      } else {
        set({ isInitialized: true, isAuthenticated: false, user: null, token: null });
      }
    });

    // Listen for OAuth redirects and auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const hasGuest = !!localStorage.getItem('guest_token');
        if (hasGuest) return;
      }

      if (session) {
        const intendedRole = localStorage.getItem('intended_role') || 'citizen';
        const localProfileData = JSON.parse(localStorage.getItem(`profile_${session.user.id}`) || '{}');
        const fullName = session.user.user_metadata?.full_name || 'Citizen';
        
        set({
          token: session.access_token,
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName,
            role: intendedRole as 'citizen' | 'authority',
            points: 0,
            badges: [],
            ...localProfileData
          },
          isInitialized: true
        });
        
        // Sync with backend
        syncUserWithBackend(session.access_token, fullName, intendedRole as 'citizen' | 'authority').then((dbUser) => {
          if (dbUser) {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                fullName: dbUser.full_name || state.user.fullName,
                role: dbUser.role as 'citizen' | 'authority'
              } : null
            }));
            if (dbUser.role === 'citizen' && intendedRole === 'authority') {
              toast.error("Unauthorized! Your email does not have official department clearance.");
            }
          }
        });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      }
    });
    authSubscription = subscription;
  },

  logout: async () => {
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_user');
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


