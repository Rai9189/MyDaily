import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { SupabaseProfile } from '../app/types';
import * as authService from '../services/authService';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: SupabaseProfile | null;
  session: Session | null;
  loading: boolean;
  pinUnlocked: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<SupabaseProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  useEffect(() => {
    console.log('🚀 [AuthProvider] Initializing...');

    const initializeAuth = async () => {
      try {
        console.log('📡 [AuthProvider] Fetching session...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [AuthProvider] Session error:', sessionError);
          throw sessionError;
        }
        
        console.log('✅ [AuthProvider] Session fetched:', currentSession?.user?.email || 'No session');
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          console.log('👤 [AuthProvider] User found, fetching profile...');
          console.log('👤 [AuthProvider] User ID:', currentSession.user.id);
          
          try {
            const userProfile = await authService.getUserProfile(currentSession.user.id);
            console.log('✅ [AuthProvider] Profile loaded:', userProfile?.name || 'No profile');
            setProfile(userProfile);
          } catch (profileError) {
            console.error('❌ [AuthProvider] Profile fetch failed:', profileError);
            // Set profile to null but don't throw - let user continue to PIN setup
            setProfile(null);
          }
        } else {
          console.log('🔴 [AuthProvider] No session found');
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Init error:', error);
      } finally {
        setLoading(false);
        console.log('✅ [AuthProvider] Auth initialized');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔐 [onAuthStateChange] Event:', event);
        console.log('👤 [onAuthStateChange] User:', currentSession?.user?.email || 'No user');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('📝 [onAuthStateChange] Fetching profile...');
          try {
            const userProfile = await authService.getUserProfile(currentSession.user.id);
            console.log('✅ [onAuthStateChange] Profile loaded:', userProfile?.name);
            setProfile(userProfile);
          } catch (error) {
            console.error('❌ [onAuthStateChange] Profile error:', error);
            setProfile(null);
          }
        } else {
          console.log('🔴 [onAuthStateChange] No user - clearing profile');
          setProfile(null);
          setPinUnlocked(false);
        }

        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 [AuthProvider] Cleaning up');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('📝 [signUp] Starting sign up...');
      const { user: newUser, session: newSession } = await authService.registerUser({
        email,
        password,
        name,
      });

      setUser(newUser);
      setSession(newSession);

      if (newUser) {
        const userProfile = await authService.getUserProfile(newUser.id);
        setProfile(userProfile);
      }
      console.log('✅ [signUp] Sign up successful');
    } catch (error: any) {
      console.error('❌ [signUp] Error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 [signIn] Starting sign in...');
      const { user: loggedInUser, session: newSession } = await authService.loginUser({
        email,
        password,
      });

      setUser(loggedInUser);
      setSession(newSession);

      if (loggedInUser) {
        const userProfile = await authService.getUserProfile(loggedInUser.id);
        setProfile(userProfile);
      }
      console.log('✅ [signIn] Sign in successful');
    } catch (error: any) {
      console.error('❌ [signIn] Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 [signOut] Signing out...');
      await authService.logoutUser();
      setUser(null);
      setSession(null);
      setProfile(null);
      setPinUnlocked(false);
      console.log('✅ [signOut] Sign out successful');
    } catch (error: any) {
      console.error('❌ [signOut] Error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 [resetPassword] Resetting password...');
      await authService.sendPasswordResetEmail(email);
      console.log('✅ [resetPassword] Reset email sent');
    } catch (error: any) {
      console.error('❌ [resetPassword] Error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<SupabaseProfile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('📝 [updateProfile] Updating profile...');
      const updatedProfile = await authService.updateUserProfile(user.id, updates);
      setProfile(updatedProfile);
      console.log('✅ [updateProfile] Profile updated');
    } catch (error: any) {
      console.error('❌ [updateProfile] Error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      console.log('🔄 [refreshProfile] Refreshing profile...');
      const userProfile = await authService.getUserProfile(user.id);
      setProfile(userProfile);
      console.log('✅ [refreshProfile] Profile refreshed');
    } catch (error: any) {
      console.error('❌ [refreshProfile] Error:', error);
    }
  };

  const checkPinSetup = async (): Promise<boolean> => {
    if (!user) return false;
    console.log('🔍 [checkPinSetup] Checking PIN setup...');
    const exists = await authService.checkPinExists(user.id);
    console.log('✅ [checkPinSetup] PIN exists:', exists);
    return exists;
  };

  const setupPin = async (pin: string, pinType: 'pin4' | 'pin6' | 'password') => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🔐 [setupPin] Setting up PIN...');
      const updatedProfile = await authService.setupPin(user.id, pin, pinType);
      setProfile(updatedProfile);
      console.log('✅ [setupPin] PIN setup complete');
    } catch (error: any) {
      console.error('❌ [setupPin] Error:', error);
      throw error;
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    console.log('🔍 [verifyPin] Verifying PIN...');
    const isValid = await authService.verifyUserPin(user.id, pin);
    console.log('✅ [verifyPin] PIN valid:', isValid);
    return isValid;
  };

  const updatePin = async (
    oldPin: string,
    newPin: string,
    newPinType: 'pin4' | 'pin6' | 'password'
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🔄 [updatePin] Updating PIN...');
      const updatedProfile = await authService.updatePin(user.id, oldPin, newPin, newPinType);
      setProfile(updatedProfile);
      console.log('✅ [updatePin] PIN updated');
    } catch (error: any) {
      console.error('❌ [updatePin] Error:', error);
      throw error;
    }
  };

  const unlockWithPin = async (pin: string) => {
    const isValid = await verifyPin(pin);
    if (!isValid) {
      throw new Error('PIN salah');
    }
    console.log('🔓 [unlockWithPin] PIN unlocked');
    setPinUnlocked(true);
  };

  const lockApp = () => {
    console.log('🔒 [lockApp] App locked');
    setPinUnlocked(false);
  };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}