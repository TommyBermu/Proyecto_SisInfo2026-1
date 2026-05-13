import React from 'react';
import { Navigate } from 'react-router';
import { useAuth, type UserRole } from '../context/AuthContext';

interface RoleGateProps {
  allow: UserRole[];
  children: React.ReactNode;
}

export default function RoleGate({ allow, children }: RoleGateProps) {
  const { profile, loading, localProfileActive } = useAuth();

  if (loading) return null;

  if (localProfileActive) {
    return <>{children}</>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
