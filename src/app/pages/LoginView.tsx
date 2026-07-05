import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Mail, LogIn, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, type UserRole } from '../context/AuthContext';

const ROLE_ROUTE: Record<UserRole, string> = {
  admin: '/empleado/administrador',
  waiter: '/empleado/mesero',
  kitchen: '/empleado/cocina',
  cashier: '/empleado/cajero',
};

export default function LoginView() {
  const navigate = useNavigate();
  const { profile, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Si ya hay sesión activa, entrar directo al panel del rol
  useEffect(() => {
    if (!loading && profile) {
      navigate(ROLE_ROUTE[profile.role], { replace: true });
    }
  }, [loading, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(
        signInError.toLowerCase().includes('invalid login')
          ? 'Correo o contraseña incorrectos.'
          : signInError
      );
    }
    // El useEffect redirige cuando el perfil queda disponible
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gastro</h1>
          <p className="text-neutral-400">Acceso de empleados</p>
        </div>

        <div className="bg-neutral-800/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Correo de empresa</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-xl font-bold transition-colors"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {submitting ? 'Ingresando...' : 'Iniciar sesión'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-500 mt-6">
          ¿Sin cuenta? Pídele a un administrador que te cree una y revisa tu correo personal
          para establecer tu contraseña.
        </p>
      </div>
    </div>
  );
}
