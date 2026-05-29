import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Activity, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const Login = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const guestLogin = useAuthStore(state => state.guestLogin);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') || 'citizen';


  useEffect(() => {
    // Save intended role so authStore can apply it after OAuth redirect
    localStorage.setItem('intended_role', role);
  }, [role]);

  if (isAuthenticated) {
    return <Navigate to={role === 'authority' ? "/authority" : "/dashboard"} replace />;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const clientBase = import.meta.env.VITE_CLIENT_URL || window.location.origin;
      const redirectTo = clientBase + (role === 'authority' ? '/authority' : '/dashboard');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        }
      });
      if (error) toast.error(error.message);
    } catch (err) {
      toast.error('Failed to initialize Google login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[85vh] w-full bg-slate-50 dark:bg-slate-950 relative">
      {/* Left Branding Panel (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-[#000080] text-white p-12 flex-col justify-between relative overflow-hidden border-r-4 border-[#FF9933]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#000080] via-[#000080]/90 to-slate-900 z-0"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative z-10 space-y-6 pt-10">
          <div className="bg-white p-3 rounded-sm inline-block shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" className="h-20 w-14 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">राष्ट्रीय सड़क सुरक्षा पोर्टल</h1>
            <h2 className="text-2xl text-[#FF9933] font-bold tracking-widest uppercase drop-shadow-sm">National Road Safety Portal</h2>
          </div>
          <div className="h-1 w-24 bg-[#138808] rounded-full my-4"></div>
          <p className="text-slate-300 max-w-md leading-relaxed text-lg">
            A Government of India initiative to securely monitor, report, and resolve structural hazards across the national infrastructure grid.
          </p>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-sm mt-8 max-w-sm shadow-lg">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Shri_Narendra_Modi%2C_Prime_Minister_of_India.jpg" 
              alt="Hon'ble Prime Minister" 
              className="w-16 h-16 rounded-full object-cover border-2 border-[#FF9933] shadow-md bg-white" 
            />
            <div>
              <p className="text-[10px] text-[#FF9933] font-bold uppercase tracking-widest drop-shadow-sm">Shri Narendra Modi</p>
              <p className="text-sm font-black tracking-wide">Hon'ble Prime Minister of India</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 mt-12 pb-10">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-sm backdrop-blur-sm border border-white/10">
            <ShieldCheck className="w-10 h-10 text-[#138808]" />
            <div className="flex flex-col">
              <span className="font-black text-base uppercase tracking-wider">256-Bit</span>
              <span className="text-xs text-slate-300 font-medium">Secure Encryption</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-sm backdrop-blur-sm border border-white/10">
            <Activity className="w-10 h-10 text-[#FF9933]" />
            <div className="flex flex-col">
              <span className="font-black text-base uppercase tracking-wider">24/7</span>
              <span className="text-xs text-slate-300 font-medium">Live Monitoring</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-sm backdrop-blur-sm border border-white/10">
            <Users className="w-10 h-10 text-blue-400" />
            <div className="flex flex-col">
              <span className="font-black text-base uppercase tracking-wider">1.2M+</span>
              <span className="text-xs text-slate-300 font-medium">Active Citizens</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-sm backdrop-blur-sm border border-white/10">
            <Lock className="w-10 h-10 text-teal-400" />
            <div className="flex flex-col">
              <span className="font-black text-base uppercase tracking-wider">Govt Auth</span>
              <span className="text-xs text-slate-300 font-medium">Strictly Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full md:w-1/2 flex items-start pt-16 md:pt-0 md:items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md md:-mt-24">
          
          {/* Mobile Only Header */}
          <div className="mb-8 md:hidden text-center">
            <div className="bg-white p-2 rounded-sm inline-block shadow-md mb-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" className="h-12 w-10 object-contain" />
            </div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b-2 border-[#FF9933] pb-1 inline-block mb-2">Government of India</h2>
            <h1 className="text-2xl font-extrabold text-[#000080] dark:text-primary">Secure Portal Login</h1>
          </div>
          
          <div className="flex w-full mb-8 bg-slate-200 dark:bg-slate-800 p-1 shadow-inner rounded-sm border border-border">
            <button 
              onClick={() => setSearchParams({ role: 'citizen' })}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${role === 'citizen' ? 'bg-white dark:bg-slate-950 text-[#000080] dark:text-primary shadow-sm border border-border/50' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Citizen Access
            </button>
            <button 
              onClick={() => setSearchParams({ role: 'authority' })}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${role === 'authority' ? 'bg-white dark:bg-slate-950 text-[#000080] dark:text-primary shadow-sm border border-border/50' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Official Access
            </button>
          </div>
          
          <Card className="w-full bg-card border-t-4 border-t-[#000080] dark:border-t-primary border-x-border border-b-border shadow-xl rounded-sm relative overflow-hidden">
            
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center"
                >
                  <div className="relative flex items-center justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" className="h-12 w-10 object-contain animate-pulse relative z-10" />
                    <Loader2 className="absolute w-24 h-24 text-[#000080] dark:text-primary animate-spin opacity-30" />
                  </div>
                  <h3 className="mt-8 text-lg font-black text-[#000080] dark:text-primary tracking-widest uppercase animate-pulse">Authenticating</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 uppercase tracking-widest">Establishing Secure Connection...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <CardHeader className="text-center pb-4 pt-8">
              <CardTitle className="text-2xl font-black tracking-tight text-[#000080] dark:text-foreground">
                {role === 'authority' ? 'Department Official' : 'Citizen Access'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2 px-4 font-medium">
                {role === 'authority' 
                  ? 'Sign in with your authorized government credentials to access the departmental dashboard.'
                  : 'Sign in securely to report infrastructure hazards and track your community impact.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 pb-8 px-8">
              <Button 
                onClick={handleGoogleLogin} 
                disabled={loading}
                className="w-full h-14 text-base font-bold bg-white text-slate-800 hover:bg-slate-50 shadow-md border border-slate-300 hover:border-[#000080]/30 transition-all rounded-sm uppercase tracking-wider relative overflow-hidden group"
              >
                <span className="absolute inset-0 w-full h-full bg-slate-100 opacity-0 group-active:opacity-100 transition-opacity"></span>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3 relative z-10" />
                <span className="relative z-10">Sign In via Google</span>
              </Button>

              <Button 
                onClick={() => guestLogin(role as 'citizen' | 'authority')} 
                disabled={loading}
                className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg border border-amber-400 hover:border-yellow-300 transition-all rounded-sm uppercase tracking-wider relative overflow-hidden animate-pulse flex items-center justify-center gap-2"
              >
                👑 Presidential Guest Bypass
              </Button>

              
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm">
                <p className="text-[10px] sm:text-xs text-center text-slate-500 dark:text-slate-400 font-mono leading-relaxed uppercase tracking-wider">
                  Authentication secured via <strong className="text-[#138808]">256-bit encryption</strong>.<br/>
                  Unauthorized access to this node is strictly prohibited.
                </p>
              </div>
              
              <div className="text-center text-sm pt-4 border-t border-border mt-6">
                <span className="text-muted-foreground">Don't have an account?</span>{' '}
                <Link to={`/register?role=${role}`} className="text-[#000080] dark:text-primary hover:text-[#FF9933] font-black uppercase tracking-wider hover:underline transition-colors">
                  Register Now
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
