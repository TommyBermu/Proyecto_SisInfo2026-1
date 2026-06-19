import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type UserRole = 'admin' | 'waiter' | 'kitchen' | 'cashier';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
}

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setLocalProfile: (profile: Profile) => void;
  clearLocalProfile: () => void;
  localProfileActive: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_PROFILE_STORAGE_KEY = 'employee_profile';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localProfileActive, setLocalProfileActive] = useState(false);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);

    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile) as Profile;
        setProfile(parsedProfile);
        setLocalProfileActive(true);
      } catch (error) {
        console.error('Error parsing saved employee profile:', error);
        window.localStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
      }
    }

    setLoading(false);

    return () => {
      // no-op
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    loading,
    refreshProfile: async () => {
      const savedProfile = window.localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
      if (!savedProfile) {
        setProfile(null);
        setLocalProfileActive(false);
        return;
      }

      try {
        const parsedProfile = JSON.parse(savedProfile) as Profile;
        setProfile(parsedProfile);
        setLocalProfileActive(true);
      } catch (error) {
        console.error('Error refreshing employee profile:', error);
        setProfile(null);
        setLocalProfileActive(false);
      }
    },
    setLocalProfile: (nextProfile: Profile) => {
      setLocalProfileActive(true);
      window.localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      setProfile(nextProfile);
      setLoading(false);
    },
    clearLocalProfile: () => {
      setLocalProfileActive(false);
      window.localStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
      setProfile(null);
      setLoading(false);
    },
    localProfileActive,
  }), [profile, loading, localProfileActive]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
