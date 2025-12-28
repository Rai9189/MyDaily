import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { SupabaseProfile } from '../app/types';
import * as authService from '../services/authService';

/**
 * Auth Context
 * Global state management untuk authentication
 */

interface AuthContextType {
  // State
  user: SupabaseUser | null;
  profile: SupabaseProfile | null;
  session: Session | null;
  loading: boolean;
  pinUnlocked: boolean;

  // Auth methods
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Profile methods
  updateProfile: (updates: Partial<SupabaseProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // PIN methods
  checkPinSetup: () => Promise<boolean>;
  setupPin: (pin: string, pinType: 'pin4' | 'pin6' | 'password') => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  updatePin: (oldPin: string, newPin: string, newPinType: 'pin4' | 'pin6' | 'password') => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  lockApp: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  // ============================================
  // INITIALIZE AUTH STATE
  // ============================================

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch profile
          const userProfile = await authService.getUserProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Fetch profile when user logs in
          const userProfile = await authService.getUserProfile(currentSession.user.id);
          setProfile(userProfile);
        } else {
          // Clear profile when user logs out
          setProfile(null);
          setPinUnlocked(false);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================
  // AUTH METHODS
  // ============================================

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user: newUser, session: newSession } = await authService.registerUser({
        email,
        password,
        name,
      });

      setUser(newUser);
      setSession(newSession);

      // Fetch profile
      if (newUser) {
        const userProfile = await authService.getUserProfile(newUser.id);
        setProfile(userProfile);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: loggedInUser, session: newSession } = await authService.loginUser({
        email,
        password,
      });

      setUser(loggedInUser);
      setSession(newSession);

      // Fetch profile
      if (loggedInUser) {
        const userProfile = await authService.getUserProfile(loggedInUser.id);
        setProfile(userProfile);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.logoutUser();
      setUser(null);
      setSession(null);
      setProfile(null);
      setPinUnlocked(false);
    } catch (error: any) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authService.sendPasswordResetEmail(email);
    } catch (error: any) {
      throw error;
    }
  };

  // ============================================
  // PROFILE METHODS
  // ============================================

  const updateProfile = async (updates: Partial<SupabaseProfile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updatedProfile = await authService.updateUserProfile(user.id, updates);
      setProfile(updatedProfile);
    } catch (error: any) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await authService.getUserProfile(user.id);
      setProfile(userProfile);
    } catch (error: any) {
      console.error('Error refreshing profile:', error);
    }
  };

  // ============================================
  // PIN METHODS
  // ============================================

  const checkPinSetup = async (): Promise<boolean> => {
    if (!user) return false;
    return await authService.checkPinExists(user.id);
  };

  const setupPin = async (pin: string, pinType: 'pin4' | 'pin6' | 'password') => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updatedProfile = await authService.setupPin(user.id, pin, pinType);
      setProfile(updatedProfile);
    } catch (error: any) {
      throw error;
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    return await authService.verifyUserPin(user.id, pin);
  };

  const updatePin = async (
    oldPin: string,
    newPin: string,
    newPinType: 'pin4' | 'pin6' | 'password'
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updatedProfile = await authService.updatePin(user.id, oldPin, newPin, newPinType);
      setProfile(updatedProfile);
    } catch (error: any) {
      throw error;
    }
  };

  const unlockWithPin = async (pin: string) => {
    const isValid = await verifyPin(pin);
    if (!isValid) {
      throw new Error('PIN salah');
    }
    setPinUnlocked(true);
  };

  const lockApp = () => {
    setPinUnlocked(false);
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    pinUnlocked,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
    checkPinSetup,
    setupPin,
    verifyPin,
    updatePin,
    unlockWithPin,
    lockApp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// CUSTOM HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}