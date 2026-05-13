import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const navigate = useNavigate();
  const { setLocalProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleToRoute = (role: string) => {
    switch (role) {
      case 'admin':
        return '/empleado/administrador';
      case 'kitchen':
        return '/empleado/cocina';
      case 'cashier':
        return '/empleado/cajero';
      case 'waiter':
      default:
        return '/empleado/mesero';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const emailToRole: Record<string, string> = {
        'admin@trilogia.com': 'admin',
        'mesero@trilogia.com': 'waiter',
        'cocina@trilogia.com': 'kitchen',
        'cajero@trilogia.com': 'cashier',
      };

      const aliasToRole: Record<string, string> = {
        admin: 'admin',
        administrador: 'admin',
        mesero: 'waiter',
        cocina: 'kitchen',
        cocinero: 'kitchen',
        cajero: 'cashier',
      };

      const role = normalizedEmail.includes('@')
        ? emailToRole[normalizedEmail]
        : aliasToRole[normalizedEmail];
      if (!role) {
        setError('Email no reconocido.');
        return;
      }

      const localNameMap: Record<string, string> = {
        admin: 'Toñito',
        waiter: 'Daniel',
        kitchen: 'Julian',
        cashier: 'María',
      };

      setLocalProfile(role as 'admin' | 'waiter' | 'kitchen' | 'cashier', localNameMap[role] ?? role);
      navigate(roleToRoute(role), { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('No se pudo iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gastro</h1>
          <p className="text-neutral-400">Sistema de Gestión de Restaurante</p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <LogIn className="text-neutral-900" size={24} />
            <h2 className="text-2xl font-bold text-neutral-900">Acceso Empleados</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  placeholder="correo@trilogia.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 text-center mb-2">
              Ingresa con tu email institucional.
            </p>
          </div>
        </div>

        {/* Botón volver */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 text-neutral-400 hover:text-white transition-colors text-sm"
        >
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
