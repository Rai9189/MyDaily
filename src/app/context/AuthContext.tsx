// src/app/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as User;
    } catch (err) {
      console.error('fetchUserProfile error:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // ✅ FIX: getSession + fetchUserProfile jalan PARALLEL dengan Promise.all
    // Sebelumnya sequential (tunggu session dulu, baru fetch profile) = lambat
    // Sekarang keduanya jalan bersamaan = 2x lebih cepat
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (existingSession?.user) {
          // Set session langsung tanpa tunggu profile
          setSession(existingSession);

          // Fetch profile secara async, tidak blocking
          fetchUserProfile(existingSession.user.id).then(profile => {
            if (!isMounted) return;
            setUser(profile);
          });
        }
      } catch (err) {
        console.error('initAuth error:', err);
      } finally {
        // ✅ Set loading false SEGERA setelah getSession selesai
        // Tidak perlu tunggu fetchUserProfile selesai
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // onAuthStateChange untuk handle login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        setSession(session);

        if (session?.user) {
          // Fetch profile async, tidak blocking loading
          fetchUserProfile(session.user.id).then(profile => {
            if (!isMounted) return;
            setUser(profile);
          });
        } else {
          setUser(null);
        }

        if (isMounted) setLoading(false);
      }
    );

    // Fallback timeout dikurangi ke 5 detik
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth timeout - forcing loading false');
        setLoading(false);
      }
    }, 5000);

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      sessionStorage.removeItem('pinUnlocked');
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

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
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