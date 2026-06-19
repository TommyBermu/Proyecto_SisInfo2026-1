import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChefHat, CreditCard, Shield, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth, type Profile, type UserRole } from '../context/AuthContext';

const ROLE_ROUTE: Record<UserRole, string> = {
  admin: '/empleado/administrador',
  waiter: '/empleado/mesero',
  kitchen: '/empleado/cocina',
  cashier: '/empleado/cajero',
};

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode }> = {
  admin: { label: 'Administrador', icon: <Shield size={28} /> },
  waiter: { label: 'Mesero', icon: <Users size={28} /> },
  kitchen: { label: 'Cocinero', icon: <ChefHat size={28} /> },
  cashier: { label: 'Cajero', icon: <CreditCard size={28} /> },
};

export default function LoginView() {
  const navigate = useNavigate();
  const { setLocalProfile, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name', { ascending: true });

      if (fetchError) {
        console.error('Error loading profiles:', fetchError);
        setError('No se pudieron cargar los perfiles.');
        setProfiles([]);
        setLoading(false);
        return;
      }

      const allowedRoles: UserRole[] = ['admin', 'waiter', 'kitchen', 'cashier'];
      const filteredProfiles = (data ?? [])
        .filter((item): item is Profile => allowedRoles.includes(item.role as UserRole))
        .map((item) => ({
          ...item,
          role: item.role as UserRole,
          full_name: item.full_name ?? item.email ?? 'Empleado',
        }));

      setProfiles(filteredProfiles);
      setLoading(false);
    };

    void loadProfiles();
  }, []);

  const groupedProfiles = useMemo(() => profiles, [profiles]);

  const handleSelectProfile = (selectedProfile: Profile) => {
    setLocalProfile(selectedProfile);
    navigate(ROLE_ROUTE[selectedProfile.role], { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gastro</h1>
          <p className="text-neutral-400">Selecciona tu perfil para entrar</p>
        </div>

        <div className="bg-neutral-800/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 text-white">
            <Users className="text-neutral-300" size={24} />
            <h2 className="text-2xl font-bold">Acceso de empleados</h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-neutral-300">
              Cargando perfiles...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-300">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupedProfiles.map((employeeProfile) => {
                const meta = ROLE_META[employeeProfile.role];
                const isCurrent = profile?.id === employeeProfile.id;

                return (
                  <motion.button
                    key={employeeProfile.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectProfile(employeeProfile)}
                    className={`min-h-[120px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 text-white ${
                      isCurrent
                        ? 'bg-white/20 border-white/40 shadow-lg'
                        : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/25'
                    }`}
                  >
                    <div className="text-white/90">{meta.icon}</div>
                    <div className="text-center">
                      <div className="text-lg font-semibold leading-tight">{employeeProfile.full_name}</div>
                      <div className="text-sm text-neutral-300">{meta.label}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
