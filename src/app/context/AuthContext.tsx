// src/app/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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

  const initialized = useRef(false);
  const isSigningUp = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

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

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!initialSession) {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
          sessionStorage.removeItem('pinUnlocked');
          setUser(null);
          setSession(null);
        } else {
          setSession(initialSession);
          setProfileLoading(true);

          const profile = await fetchUserProfile(initialSession.user.id);
          if (!isMounted) return;

          lastFetchedUserId.current = initialSession.user.id;
          setUser(profile);
          setProfileLoading(false);
        }
      } catch (err) {
        console.error('initAuth error:', err);
        if (isMounted) setProfileLoading(false);
      } finally {
        if (isMounted) {
          initialized.current = true;
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('onAuthStateChange event:', _event, 'session:', !!session);
        if (!isMounted) return;
        if (!initialized.current) return;

        if (_event === 'TOKEN_REFRESHED') {
          setSession(prev =>
            prev?.access_token === session?.access_token ? prev : session
          );
          return;
        }

        if (_event === 'SIGNED_OUT' || !session) {
          lastFetchedUserId.current = null;
          setUser(null);
          setSession(null);
          return;
        }

        if (_event === 'SIGNED_IN') {
          if (isSigningUp.current) {
            console.log('onAuthStateChange: skipping, signUp in progress');
            return;
          }

          if (lastFetchedUserId.current === session.user.id) {
            setSession(prev =>
              prev?.access_token === session?.access_token ? prev : session
            );
            return;
          }

          setSession(session);
          setProfileLoading(true);
          const profile = await fetchUserProfile(session.user.id);
          if (!isMounted) return;

          lastFetchedUserId.current = session.user.id;
          setUser(profile);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      isSigningUp.current = true;

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
          pin_hash: null,
        });

      if (profileError) throw profileError;

      const profile = await fetchUserProfile(authData.user.id);
      lastFetchedUserId.current = authData.user.id;
      setUser(profile);
      setSession(authData.session);

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      isSigningUp.current = false;
    }
  };

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

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();

      sessionStorage.removeItem('pinUnlocked');
      sessionStorage.removeItem('pinAttempts');
      sessionStorage.removeItem('pinLockUntil');

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });

      lastFetchedUserId.current = null;
      setUser(null);
      setSession(null);
    } catch (err) {
      setError(handleSupabaseError(err));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);

      // FIX: Gunakan VITE_APP_URL agar link email selalu mengarah ke URL yang benar
      // Di localhost: VITE_APP_URL=http://localhost:5173
      // Di Vercel:    VITE_APP_URL=https://my-daily-five.vercel.app
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

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

  const savePin = async (pin: string, pinType: 'pin4' | 'pin6' | 'password') => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');

      const pinHash = btoa(pin);
      const dbPinType = pinType === 'password' ? 'password' : 'numeric';

      const { error } = await supabase
        .from('users')
        .update({
          pin_hash: pinHash,
          pin_type: dbPinType,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, pin_hash: pinHash, pin_type: dbPinType } : prev);
      sessionStorage.setItem('pinUnlocked', 'true');

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      setError(null);

      const pinHash = btoa(pin);

      if (user?.pin_hash) {
        if (pinHash !== user.pin_hash) {
          return { success: false, error: 'Wrong PIN' };
        }
        sessionStorage.setItem('pinUnlocked', 'true');
        return { success: true, error: null };
      }

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