// src/app/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error: string | null }>;
  savePin: (pin: string, pinType: 'pin4' | 'pin6' | 'password') => Promise<{ success: boolean; error: string | null }>;
  verifyPin: (pin: string) => Promise<{ success: boolean; error: string | null }>;
  hasPin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string, retries = 3): Promise<User | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error(`fetchUserProfile attempt ${attempt} error:`, error);
          if (attempt === retries) return null;
          await new Promise(res => setTimeout(res, 1000 * attempt));
          continue;
        }

        return data as User;
      } catch (err) {
        console.error(`fetchUserProfile attempt ${attempt} network error:`, err);
        if (attempt === retries) return null;
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // onAuthStateChange handle SEMUA event termasuk INITIAL_SESSION dan SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('onAuthStateChange event:', _event, 'session:', !!session);
        if (!isMounted) return;

        // Bersihkan storage corrupt jika tidak ada session saat init
        if (_event === 'INITIAL_SESSION' && !session) {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
          sessionStorage.removeItem('pinUnlocked');
          setUser(null);
          setSession(null);
          setLoading(false);
          setProfileLoading(false);
          return;
        }

        // Token refresh — hanya update session, tidak perlu re-fetch profile
        if (_event === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }

        // SIGNED_IN dari tab focus — skip jika user sudah sama
        if (_event === 'SIGNED_IN' && user?.id === session?.user?.id && user !== null) {
          setSession(session);
          setLoading(false);
          return;
        }

        setSession(session);
        // Set loading false SEGERA agar routing tidak stuck
        setLoading(false);

        if (session?.user) {
          // Fetch profile di background — tidak blok routing
          setProfileLoading(true);
          const profile = await fetchUserProfile(session.user.id);
          if (!isMounted) return;
          setUser(profile);
          setProfileLoading(false);
        } else {
          setUser(null);
          setProfileLoading(false);
        }
      }
    );

    // Fallback timeout — clear loading DAN profileLoading
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth timeout - forcing loading false');
        setLoading(false);
        setProfileLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Sign Up
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name,
          email,
          pin_type: 'numeric',
          pin_hash: null, // PIN belum di-setup
        });

      if (profileError) throw profileError;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Sign In
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();

      // Bersihkan semua storage
      sessionStorage.removeItem('pinUnlocked');
      sessionStorage.removeItem('pinAttempts');
      sessionStorage.removeItem('pinLockUntil');

      // Clear Supabase stale keys dari localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });

      setUser(null);
      setSession(null);
    } catch (err) {
      setError(handleSupabaseError(err));
    }
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update Profile
  const updateProfile = async (updates: Partial<User>) => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Save PIN ke Supabase
  const savePin = async (pin: string, pinType: 'pin4' | 'pin6' | 'password') => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');

      const pinHash = btoa(pin); // simple hash, bisa diganti bcrypt jika perlu
      const dbPinType = pinType === 'password' ? 'password' : 'numeric';

      const { error } = await supabase
        .from('users')
        .update({
          pin_hash: pinHash,
          pin_type: dbPinType,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      setUser(prev => prev ? { ...prev, pin_hash: pinHash, pin_type: dbPinType } : prev);

      // Set session sebagai sudah unlock
      sessionStorage.setItem('pinUnlocked', 'true');

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Verify PIN - gunakan user state jika ada, fallback ke DB
  const verifyPin = async (pin: string) => {
    try {
      setError(null);

      const pinHash = btoa(pin);

      // Gunakan user state jika pin_hash sudah ada (lebih cepat, tanpa DB call)
      if (user?.pin_hash) {
        if (pinHash !== user.pin_hash) {
          return { success: false, error: 'Wrong PIN' };
        }
        sessionStorage.setItem('pinUnlocked', 'true');
        return { success: true, error: null };
      }

      // Fallback: fetch dari DB jika user state belum ada pin_hash
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) throw new Error('No active session');

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', currentSession.user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!data?.pin_hash) return { success: false, error: 'PIN not set up yet' };

      if (btoa(pin) !== data.pin_hash) {
        return { success: false, error: 'Wrong PIN' };
      }

      sessionStorage.setItem('pinUnlocked', 'true');
      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  // Cek apakah user sudah punya PIN
  const hasPin = () => {
    return !!(user?.pin_hash);
  };

  const value = {
    user,
    session,
    loading,
    profileLoading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    savePin,
    verifyPin,
    hasPin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}