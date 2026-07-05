import React from 'react';
import { Navigate } from 'react-router';
import { useAuth, type UserRole } from '../context/AuthContext';

interface RoleGateProps {
  allow: UserRole[];
  children: React.ReactNode;
}

const ROLE_ROUTE: Record<UserRole, string> = {
  admin: '/empleado/administrador',
  waiter: '/empleado/mesero',
  kitchen: '/empleado/cocina',
  cashier: '/empleado/cajero',
};

export default function RoleGate({ allow, children }: RoleGateProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  // Sin sesión → al login
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Con sesión pero sin permiso para esta vista → a su propio panel
  if (!allow.includes(profile.role)) {
    return <Navigate to={ROLE_ROUTE[profile.role]} replace />;
  }

  return <>{children}</>;
}
