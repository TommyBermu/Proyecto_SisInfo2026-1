import { useRestaurant } from "../context/RestaurantContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react";
import clsx from "clsx";

const MOCK_SALES_DATA = [
  { name: 'Lun', ventas: 4000 },
  { name: 'Mar', ventas: 3000 },
  { name: 'Mie', ventas: 2000 },
  { name: 'Jue', ventas: 2780 },
  { name: 'Vie', ventas: 1890 },
  { name: 'Sab', ventas: 2390 },
  { name: 'Dom', ventas: 3490 },
];

const MOCK_HOURLY_DATA = [
  { hour: '12:00', orders: 12 },
  { hour: '13:00', orders: 25 },
  { hour: '14:00', orders: 45 },
  { hour: '15:00', orders: 30 },
  { hour: '19:00', orders: 15 },
  { hour: '20:00', orders: 35 },
  { hour: '21:00', orders: 50 },
  { hour: '22:00', orders: 40 },
];

export default function AdminView() {
  const { orders, menuItems } = useRestaurant();
  
  // Calculate some real-ish stats from the context
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const lowStockItems = menuItems.filter(i => !i.inStock).length;

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Dashboard Administrativo</h1>
        <p className="text-neutral-500">Resumen general del restaurante</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Ventas Totales (Día)" 
          value={`$${totalRevenue.toFixed(2)}`} 
          icon={<DollarSign className="text-emerald-600" />}
          trend="+12%"
          color="emerald"
        />
        <StatCard 
          title="Ticket Promedio" 
          value={`$${avgTicket.toFixed(2)}`} 
          icon={<TrendingUp className="text-blue-600" />}
          trend="+5%"
          color="blue"
        />
        <StatCard 
          title="Comensales Hoy" 
          value="142" 
          icon={<Users className="text-purple-600" />}
          trend="-2%"
          color="purple"
        />
        <StatCard 
          title="Alertas de Stock" 
          value={lowStockItems.toString()} 
          icon={<AlertCircle className="text-orange-600" />}
          trend="Acción requerida"
          color="orange"
          alert={lowStockItems > 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
          <h3 className="font-bold text-lg mb-6">Ventas Semanales</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_SALES_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
          <h3 className="font-bold text-lg mb-6">Rendimiento por Hora (Pedidos)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_HOURLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Inventario Reciente</h3>
          <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700">Ver todo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">Stock Actual</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Última Actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{item.name}</td>
                  <td className="px-6 py-4 text-neutral-500">{item.category}</td>
                  <td className="px-6 py-4 text-center text-neutral-900 font-mono">
                    {item.inStock ? Math.floor(Math.random() * 50) + 10 : 0} u
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", 
                      item.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {item.inStock ? 'Disponible' : 'Agotado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-400">Hace 2 horas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, alert }: any) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className={clsx("bg-white p-6 rounded-xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow", alert && "border-red-500 ring-1 ring-red-500")}>
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-3 rounded-lg", colors[color as keyof typeof colors])}>
          {icon}
        </div>
        <span className={clsx("text-xs font-bold px-2 py-1 rounded", 
          trend.includes('+') ? 'bg-emerald-100 text-emerald-700' : 
          trend.includes('-') ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600'
        )}>
          {trend}
        </span>
      </div>
      <div className="space-y-1">
        <h4 className="text-neutral-500 text-sm font-medium">{title}</h4>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
      </div>
    </div>
  );
}
