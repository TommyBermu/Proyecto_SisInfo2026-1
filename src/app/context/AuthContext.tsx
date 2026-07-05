import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type UserRole = 'admin' | 'waiter' | 'kitchen' | 'cashier';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
}

interface AuthContextValue {
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error loading profile:', error);
    return null;
  }
  return data as Profile;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(current);
      if (current?.user) {
        setProfile(await fetchProfile(current.user.id));
      }
      setLoading(false);
    };

    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        setProfile(await fetchProfile(nextSession.user.id));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    session,
    loading,
    signIn: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { error: error.message };
      if (data.user) setProfile(await fetchProfile(data.user.id));
      return { error: null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
    },
    refreshProfile: async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (current?.user) setProfile(await fetchProfile(current.user.id));
      else setProfile(null);
    },
  }), [profile, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
