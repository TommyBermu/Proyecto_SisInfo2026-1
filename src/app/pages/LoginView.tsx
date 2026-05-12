import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, User, Lock, AlertCircle, ChefHat, Users, LayoutDashboard, CreditCard } from 'lucide-react';

// Credenciales de empleados (simuladas en localStorage)
const EMPLOYEES = {
  mesero: { password: '12345', route: '/empleado/mesero', icon: Users, name: 'Mesero', needsFullName: true },
  cocinero: { password: '12345', route: '/empleado/cocina', icon: ChefHat, name: 'Cocinero', needsFullName: false },
  administrador: { password: '12345', route: '/empleado/administrador', icon: LayoutDashboard, name: 'Administrador', needsFullName: false },
  cajero: { password: '12345', route: '/empleado/cajero', icon: CreditCard, name: 'Cajero', needsFullName: false }
};

export default function LoginView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<keyof typeof EMPLOYEES | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simular delay de autenticación
    setTimeout(() => {
      const emailLower = email.toLowerCase().trim();

      // Verificar si el email coincide con algún tipo de empleado
      const employeeType = Object.keys(EMPLOYEES).find(type => emailLower === type);

      if (employeeType && EMPLOYEES[employeeType as keyof typeof EMPLOYEES].password === password) {
        const employee = EMPLOYEES[employeeType as keyof typeof EMPLOYEES];

        // Si es mesero, pedir nombre completo
        if (employee.needsFullName) {
          setSelectedEmployee(employeeType as keyof typeof EMPLOYEES);
          setShowNameInput(true);
          setLoading(false);
        } else {
          // Guardar sesión en localStorage
          localStorage.setItem('employeeType', employeeType);
          localStorage.setItem('employeeName', employee.name);

          // Redirigir a la ruta correspondiente
          navigate(employee.route, { replace: true });
        }
      } else {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        setLoading(false);
      }
    }, 500);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo');
      return;
    }

    if (selectedEmployee) {
      const employee = EMPLOYEES[selectedEmployee];
      localStorage.setItem('employeeType', selectedEmployee);
      localStorage.setItem('employeeName', fullName.trim());
      navigate(employee.route, { replace: true });
    }
  };

  const handleQuickAccess = (type: keyof typeof EMPLOYEES) => {
    const employee = EMPLOYEES[type];
    
    // Si es mesero, pedir nombre completo
    if (employee.needsFullName) {
      setSelectedEmployee(type);
      setShowNameInput(true);
    } else {
      localStorage.setItem('employeeType', type);
      localStorage.setItem('employeeName', employee.name);
      navigate(employee.route, { replace: true });
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
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  placeholder="mesero, cocinero, administrador, cajero"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  placeholder="••••••"
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
              Usuarios de prueba: mesero, cocinero, administrador, cajero (contraseña: 12345)
            </p>
          </div>
        </div>

        {/* Acceso rápido (desarrollo) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <p className="text-sm text-neutral-300 mb-4 text-center">Acceso rápido (desarrollo)</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(EMPLOYEES).map(([type, { icon: Icon, name }]) => (
              <button
                key={type}
                onClick={() => handleQuickAccess(type as keyof typeof EMPLOYEES)}
                className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm border border-white/20 text-white"
              >
                <Icon size={24} />
                <span className="text-sm font-medium">{name}</span>
              </button>
            ))}
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

      {/* Formulario para nombre completo */}
      {showNameInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Ingresa tu nombre completo</h2>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-2">
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  placeholder="Nombre completo"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition-colors"
              >
                Continuar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}