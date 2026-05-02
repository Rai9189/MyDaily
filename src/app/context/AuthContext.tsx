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
  verifyPin: (pin: string) => Promise<{ success: boolean; locked?: boolean; lockedUntil?: string; error: string | null }>;
  hasPin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ SHA-256 hash — one-way, tidak bisa di-reverse
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ✅ Catat activity log ke database
async function logActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      metadata: metadata ?? null,
    });
  } catch {
    // Log gagal tidak boleh break flow utama
  }
}

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
          if (isSigningUp.current) return;

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

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: profileError } = await supabase
        .rpc('create_user_profile', {
          user_id: authData.user.id,
          user_name: name,
          user_email: email,
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // ✅ Log activity login berhasil
      if (data.user) {
        await logActivity(data.user.id, 'login', {
          email: data.user.email,
          timestamp: new Date().toISOString(),
        });
      }

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

      // ✅ Log activity logout sebelum session dihapus
      if (user) {
        await logActivity(user.id, 'logout', {
          timestamp: new Date().toISOString(),
        });
      }

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

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
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

      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
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

      const pinHash = await hashPin(pin);
      const dbPinType = pinType === 'password' ? 'password' : 'numeric';

      const { error } = await supabase
        .from('users')
        .update({
          pin_hash: pinHash,
          pin_type: dbPinType,
          // ✅ Reset lockout saat PIN baru disimpan
          pin_attempts: 0,
          pin_locked_until: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => prev ? {
        ...prev,
        pin_hash: pinHash,
        pin_type: dbPinType,
        pin_attempts: 0,
        pin_locked_until: null,
      } : prev);

      sessionStorage.setItem('pinUnlocked', 'true');

      await logActivity(user.id, 'pin_updated', {
        pin_type: pinType,
        timestamp: new Date().toISOString(),
      });

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

      const MAX_ATTEMPTS  = 5;
      const LOCK_DURATION = 30; // detik

      // Ambil data user terbaru dari DB (bukan dari state)
      // agar pin_attempts & pin_locked_until selalu akurat
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) throw new Error('No active session');

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('pin_hash, pin_attempts, pin_locked_until')
        .eq('id', currentSession.user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!userData?.pin_hash) return { success: false, error: 'PIN not set up yet' };

      // ✅ Cek apakah masih dalam masa lockout
      if (userData.pin_locked_until) {
        const lockedUntil = new Date(userData.pin_locked_until);
        if (lockedUntil > new Date()) {
          return {
            success: false,
            locked: true,
            lockedUntil: userData.pin_locked_until,
            error: 'Too many failed attempts.',
          };
        } else {
          // Lockout sudah habis, reset
          await supabase
            .from('users')
            .update({ pin_attempts: 0, pin_locked_until: null })
            .eq('id', currentSession.user.id);
        }
      }

      const pinHash = await hashPin(pin);
      const isCorrect = pinHash === userData.pin_hash;

      if (isCorrect) {
        // ✅ PIN benar — reset attempts di DB
        await supabase
          .from('users')
          .update({ pin_attempts: 0, pin_locked_until: null })
          .eq('id', currentSession.user.id);

        // Update user state
        setUser(prev => prev ? { ...prev, pin_attempts: 0, pin_locked_until: null } : prev);

        sessionStorage.setItem('pinUnlocked', 'true');

        await logActivity(currentSession.user.id, 'pin_unlocked', {
          timestamp: new Date().toISOString(),
        });

        return { success: true, error: null };
      } else {
        // ✅ PIN salah — increment attempts di DB
        const newAttempts = (userData.pin_attempts ?? 0) + 1;
        const shouldLock  = newAttempts >= MAX_ATTEMPTS;
        const lockedUntil = shouldLock
          ? new Date(Date.now() + LOCK_DURATION * 1000).toISOString()
          : null;

        await supabase
          .from('users')
          .update({
            pin_attempts: newAttempts,
            pin_locked_until: lockedUntil,
          })
          .eq('id', currentSession.user.id);

        // Update user state
        setUser(prev => prev ? {
          ...prev,
          pin_attempts: newAttempts,
          pin_locked_until: lockedUntil,
        } : prev);

        await logActivity(currentSession.user.id, shouldLock ? 'pin_locked' : 'pin_failed', {
          attempts: newAttempts,
          locked_until: lockedUntil,
          timestamp: new Date().toISOString(),
        });

        if (shouldLock) {
          return {
            success: false,
            locked: true,
            lockedUntil: lockedUntil!,
            error: 'Too many failed attempts.',
          };
        }

        return {
          success: false,
          error: `Wrong PIN! ${MAX_ATTEMPTS - newAttempts} attempts remaining before lockout.`,
        };
      }
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      return { success: false, error: errorMessage };
    }
  };

  const hasPin = () => !!(user?.pin_hash);

  const value = {
    user, session, loading, profileLoading, error,
    signUp, signIn, signOut, resetPassword,
    updateProfile, savePin, verifyPin, hasPin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}