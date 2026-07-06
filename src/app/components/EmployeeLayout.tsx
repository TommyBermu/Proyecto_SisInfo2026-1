import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EmployeeLayout() {
  const navigate = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const employeeType = profile?.role ?? null;
  const employeeName = profile?.full_name ?? 'Empleado';

  useEffect(() => {
    // Si no hay sesión, redirigir al login
    if (!loading && !employeeType) {
      navigate('/login', { replace: true });
    }
  }, [employeeType, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (loading || !employeeType) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header con info del empleado */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 z-50 flex justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-lg font-bold text-neutral-900">Gastro</div>
          <div className="h-6 w-px bg-neutral-300 flex-shrink-0" />
          <div className="text-sm text-neutral-600 truncate">
            <span className="font-medium text-neutral-900 truncate">{employeeName}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </header>

      {/* Contenido con padding para el header fijo */}
      <div className="pt-16">
        <Outlet />
      </div>
    </div>
  );
}
