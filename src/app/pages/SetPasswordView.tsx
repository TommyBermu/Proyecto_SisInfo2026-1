import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth, type UserRole } from '../context/AuthContext';

const ROLE_ROUTE: Record<UserRole, string> = {
  admin: '/empleado/administrador',
  waiter: '/empleado/mesero',
  kitchen: '/empleado/cocina',
  cashier: '/empleado/cajero',
};

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'done';

export default function SetPasswordView() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  // El enlace de invitación trae los tokens en el hash; detectSessionInUrl
  // los procesa al cargar. Esperamos a que haya sesión establecida.
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email ?? null);
        setStatus('ready');
      } else {
        // Damos margen a que detectSessionInUrl procese el hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
          if (s?.user) {
            setEmail(s.user.email ?? null);
            setStatus('ready');
          }
        });
        setTimeout(() => {
          setStatus((prev) => (prev === 'checking' ? 'invalid' : prev));
        }, 2500);
        return () => subscription.unsubscribe();
      }
    };
    void check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setStatus('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus('ready');
      return;
    }
    setStatus('done');
  };

  const goToPanel = () => {
    if (profile) navigate(ROLE_ROUTE[profile.role], { replace: true });
    else navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gastro</h1>
          <p className="text-neutral-400">Activa tu cuenta de empleado</p>
        </div>

        <div className="bg-neutral-800/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
          {status === 'checking' && (
            <div className="py-10 flex flex-col items-center gap-3 text-neutral-300">
              <Loader2 className="animate-spin text-orange-500" size={28} />
              <p>Validando invitación...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="py-8 text-center space-y-4">
              <KeyRound className="mx-auto text-neutral-500" size={40} />
              <p className="text-neutral-300">
                El enlace de invitación no es válido o ya expiró. Pide a un administrador
                que te reenvíe la invitación.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="text-orange-400 hover:text-orange-300 font-medium text-sm"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

          {(status === 'ready' || status === 'saving') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {email && (
                <p className="text-sm text-neutral-400">
                  Cuenta: <span className="font-medium text-neutral-200">{email}</span>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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

              <button
                type="submit"
                disabled={status === 'saving'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-xl font-bold transition-colors"
              >
                {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {status === 'saving' ? 'Guardando...' : 'Establecer contraseña'}
              </button>
            </form>
          )}

          {status === 'done' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="mx-auto text-green-400" size={44} />
              <p className="text-neutral-200 font-medium">¡Contraseña establecida!</p>
              <p className="text-sm text-neutral-400">Ya puedes usar tu panel.</p>
              <button
                onClick={goToPanel}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
