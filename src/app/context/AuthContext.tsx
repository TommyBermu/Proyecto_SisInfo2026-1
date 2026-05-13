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
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setLocalProfile: (role: UserRole, fullName?: string | null) => void;
  clearLocalProfile: () => void;
  localProfileActive: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localProfileActive, setLocalProfileActive] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return;
    }

    setProfile(data as Profile);
  };

  useEffect(() => {
    let isMounted = true;
    const localRole = window.localStorage.getItem('local_role');
    const localName = window.localStorage.getItem('local_name');

    const init = async () => {
      if (localRole) {
        setLocalProfileActive(true);
        setProfile({
          id: 'local',
          email: userEmailFromLocal(localRole),
          full_name: localName ?? null,
          role: localRole as UserRole,
        });
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await fetchProfile(data.session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (localProfileActive || window.localStorage.getItem('local_role')) return;
      setSession(newSession ?? null);
      if (newSession?.user?.id) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    loading,
    refreshProfile: async () => {
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      }
    },
    setLocalProfile: (role: UserRole, fullName?: string | null) => {
      setLocalProfileActive(true);
      window.localStorage.setItem('local_role', role);
      if (fullName) {
        window.localStorage.setItem('local_name', fullName);
      } else {
        window.localStorage.removeItem('local_name');
      }
      setSession(null);
      setProfile({
        id: 'local',
        email: userEmailFromLocal(role),
        full_name: fullName ?? null,
        role,
      });
      setLoading(false);
    },
    clearLocalProfile: () => {
      setLocalProfileActive(false);
      window.localStorage.removeItem('local_role');
      window.localStorage.removeItem('local_name');
      setSession(null);
      setProfile(null);
      setLoading(false);
    },
    localProfileActive,
  }), [session, profile, loading, localProfileActive]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const userEmailFromLocal = (role: string) => {
  switch (role) {
    case 'admin':
      return 'admin@trilogia.com';
    case 'waiter':
      return 'mesero@trilogia.com';
    case 'kitchen':
      return 'cocina@trilogia.com';
    case 'cashier':
      return 'cajero@trilogia.com';
    default:
      return '';
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
