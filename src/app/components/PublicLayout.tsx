import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { UserCircle } from 'lucide-react';

export default function PublicLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header con botón de acceso */}
      <header className="fixed top-0 right-0 p-4 z-50">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors shadow-lg"
        >
          <UserCircle size={20} />
          <span className="font-medium">Acceso Empleados</span>
        </button>
      </header>

      {/* Contenido principal */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
