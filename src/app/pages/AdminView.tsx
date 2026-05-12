import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, History, Users, DollarSign, HeartHandshake,
  Download, Filter, Search, SearchX, Star, Banknote, ShieldAlert,
  CalendarDays, TrendingUp, TrendingDown, LayoutDashboard, Utensils, Package
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';

import { useRestaurant } from '../context/RestaurantContext';
import { DataStateWrapper, StatCard, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/admin/AdminComponents';

type DataStatus = 'loading' | 'error' | 'empty' | 'success';

// Mock Data generators
const generateHeatmapData = () => {
  const data = [];
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const hours = ['12', '13', '14', '15', '19', '20', '21', '22'];
  days.forEach(day => {
    hours.forEach(hour => {
      let val = Math.floor(Math.random() * 50);
      if (['Vie', 'Sab', 'Dom'].includes(day) && ['13', '14', '20', '21'].includes(hour)) {
        val += 50; // Picos de demanda
      }
      data.push({ day, hour: `${hour}:00`, value: val });
    });
  });
  return data;
};

const heatmapData = generateHeatmapData();
const heatmapDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const heatmapHours = ['12:00', '13:00', '14:00', '15:00', '19:00', '20:00', '21:00', '22:00'];

const menuEngineering = [
  { id: 1, name: 'Lomo Saltado', margin: 60, popularity: 95, prepTime: 12, category: 'Estrella' },
  { id: 2, name: 'Ceviche Clásico', margin: 55, popularity: 88, prepTime: 10, category: 'Caballo de Batalla' },
  { id: 3, name: 'Ají de Gallina', margin: 65, popularity: 40, prepTime: 15, category: 'Rompecabezas' },
  { id: 4, name: 'Pisco Sour', margin: 75, popularity: 90, prepTime: 5, category: 'Estrella' },
  { id: 5, name: 'Suspiro a la Limeña', margin: 20, popularity: 30, prepTime: 20, category: 'Perro' },
];

const salesTrends = [
  { name: 'Sem 1', current: 12000, lastMonth: 10500, lastYear: 9500 },
  { name: 'Sem 2', current: 15000, lastMonth: 12000, lastYear: 10000 },
  { name: 'Sem 3', current: 13500, lastMonth: 14000, lastYear: 11500 },
  { name: 'Sem 4', current: 18000, lastMonth: 15500, lastYear: 13000 },
];

const transactions = [
  { id: 'TX-101', table: 'Mesa 4', waiter: 'Carlos M.', payment: 'Tarjeta', time: '14:30', amount: 125.50, status: 'Pagado' },
  { id: 'TX-102', table: 'Mesa 2', waiter: 'Ana S.', payment: 'Efectivo', time: '14:45', amount: 85.00, status: 'Pagado' },
  { id: 'TX-103', table: 'Mesa 8', waiter: 'Carlos M.', payment: 'Tarjeta', time: '15:10', amount: 210.00, status: 'Pagado' },
  { id: 'TX-104', table: 'Llevar', waiter: 'Luis G.', payment: 'Yape', time: '15:25', amount: 45.00, status: 'Reembolso' },
  { id: 'TX-105', table: 'Mesa 5', waiter: 'Ana S.', payment: 'Tarjeta', time: '16:00', amount: 320.00, status: 'Pagado' },
];

const inventoryLogs = [
  { id: 1, item: 'Lomo Fino', user: 'Chef Mario', type: 'Salida', reason: 'Merma (Vencido)', impact: -120.00, date: '2026-04-16' },
  { id: 2, item: 'Limones', user: 'Admin', type: 'Entrada', reason: 'Compra', impact: -45.00, date: '2026-04-16' },
  { id: 3, item: 'Pisco', user: 'Bartender', type: 'Salida', reason: 'Venta', impact: 0, date: '2026-04-15' },
];

const staffPerformance = [
  { id: 1, name: 'Carlos M.', sales: 4500, foodSales: 3000, drinkSales: 1500, turnaround: 45, rating: 4.8, shifts: 20, overtime: 4 },
  { id: 2, name: 'Ana S.', sales: 5200, foodSales: 3800, drinkSales: 1400, turnaround: 40, rating: 4.9, shifts: 22, overtime: 2 },
  { id: 3, name: 'Luis G.', sales: 3800, foodSales: 2500, drinkSales: 1300, turnaround: 55, rating: 4.2, shifts: 18, overtime: 0 },
];

const costsData = { fixed: 12000, variable: 8500, foodCost: 28.5, breakeven: 25000, sales: 32000 };

const wasteAlerts = [
  { item: 'Tomates', cost: 25, reason: 'Mal estado' },
  { item: 'Lomo Fino', cost: 120, reason: 'Vencimiento' },
  { item: 'Limón', cost: 40, reason: 'Exceso de stock' },
];

const crmCustomers = [
  { id: 1, name: 'Juan Pérez', visits: 15, avgSpend: 150, favorites: 'Lomo Saltado', noShows: 1, lastVisit: '2026-04-10' },
  { id: 2, name: 'María Gómez', visits: 8, avgSpend: 85, favorites: 'Ceviche', noShows: 0, lastVisit: '2026-04-12' },
  { id: 3, name: 'Empresa XYZ', visits: 24, avgSpend: 450, favorites: 'Pisco Sour', noShows: 2, lastVisit: '2026-04-15' },
];

const rawMaterials = [
  { id: 1, name: 'Lomo Fino de Res', unit: 'kg', stock: 15, minStock: 10, category: 'Carnes', supplier: 'Carnicería Central' },
  { id: 2, name: 'Pescado Blanco (Corvina)', unit: 'kg', stock: 8, minStock: 10, category: 'Pescados', supplier: 'Terminal Pesquero' },
  { id: 3, name: 'Limones', unit: 'kg', stock: 25, minStock: 15, category: 'Vegetales', supplier: 'Mercado Sur' },
  { id: 4, name: 'Cebolla Roja', unit: 'kg', stock: 30, minStock: 20, category: 'Vegetales', supplier: 'Mercado Sur' },
  { id: 5, name: 'Ají Amarillo Fresco', unit: 'kg', stock: 5, minStock: 5, category: 'Vegetales', supplier: 'Mercado Sur' },
  { id: 6, name: 'Papas Amarillas', unit: 'kg', stock: 45, minStock: 30, category: 'Vegetales', supplier: 'Mercado Mayorista' },
  { id: 7, name: 'Pisco Acholado', unit: 'Botellas', stock: 12, minStock: 5, category: 'Bebidas', supplier: 'Licorería San Juan' },
  { id: 8, name: 'Pechuga de Pollo', unit: 'kg', stock: 18, minStock: 15, category: 'Aves', supplier: 'Avícola Santa Rosa' },
];

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'sales' | 'audit' | 'staff' | 'costs' | 'crm' | 'inventory'>('sales');
  const [dataStatus, setDataStatus] = useState<DataStatus>('success');

  const tabs = [
    { id: 'sales', label: 'Inteligencia de Ventas', icon: <BarChart3 size={20} /> },
    { id: 'inventory', label: 'Gestión de Inventario', icon: <Package size={20} /> },
    { id: 'audit', label: 'Historial y Auditoría', icon: <History size={20} /> },
    { id: 'staff', label: 'Rendimiento (KPIs)', icon: <Users size={20} /> },
    { id: 'costs', label: 'Costos y Rentabilidad', icon: <DollarSign size={20} /> },
    { id: 'crm', label: 'Reservas y CRM', icon: <HeartHandshake size={20} /> },
  ] as const;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-neutral-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutDashboard size={22} className="text-orange-500"/> BI & Analytics
          </h2>
          <p className="text-xs text-neutral-500 mt-1">Decisiones Estratégicas</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                activeTab === tab.id ? "bg-orange-600 text-white shadow-lg shadow-orange-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
           <div className="text-xs text-neutral-500 mb-2">Simulador de Estado:</div>
           <select 
             className="w-full bg-neutral-800 border-neutral-700 text-sm rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-orange-500"
             value={dataStatus}
             onChange={e => setDataStatus(e.target.value as DataStatus)}
           >
             <option value="success">Normal (Éxito)</option>
             <option value="loading">Cargando...</option>
             <option value="error">Error de Red</option>
             <option value="empty">Sin Datos</option>
           </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 h-full"
          >
            {activeTab === 'sales' && <SalesModule status={dataStatus} />}
            {activeTab === 'inventory' && <InventoryModule status={dataStatus} />}
            {activeTab === 'audit' && <AuditModule status={dataStatus} />}
            {activeTab === 'staff' && <StaffModule status={dataStatus} />}
            {activeTab === 'costs' && <CostsModule status={dataStatus} />}
            {activeTab === 'crm' && <CRMModule status={dataStatus} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- BI MODULES ---

function SalesModule({ status }: { status: DataStatus }) {
  const getCatVariant = (cat: string) => {
    if (cat === 'Estrella') return 'success';
    if (cat === 'Caballo de Batalla') return 'default';
    if (cat === 'Rompecabezas') return 'warning';
    return 'destructive';
  };

  const getHeatmapColor = (val: number) => {
    if (val === 0) return 'bg-neutral-100';
    if (val < 25) return 'bg-orange-200';
    if (val < 50) return 'bg-orange-400';
    if (val < 75) return 'bg-orange-600';
    return 'bg-orange-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Inteligencia de Ventas</h1>
          <p className="text-sm text-neutral-500">Métricas clave, comportamiento del cliente y rentabilidad de menú.</p>
        </div>
        <button className="bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-50"><Download size={16} /> Exportar CSV</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Ingresos Totales (Mes)" value="$32,450.00" trend={12.5} icon={<DollarSign className="text-orange-500"/>} subtitle="vs. mes anterior" />
        <StatCard title="Índice de Popularidad Promedio" value="84%" trend={3.2} icon={<Utensils className="text-orange-500"/>} subtitle="vs. mes anterior" />
        <StatCard title="Tiempo Prom. Preparación" value="12.5 min" trend={-1.5} icon={<TrendingDown className="text-green-500"/>} subtitle="Mejora en cocina" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Comparativa de Ventas</CardTitle>
            <CardDescription>Ventas del mes actual vs. anterior vs. año pasado.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yaxis" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip key="tooltip" contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend key="legend" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line key="line-curr" type="monotone" name="Mes Actual" dataKey="current" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line key="line-prev" type="monotone" name="Mes Anterior" dataKey="lastMonth" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" />
                    <Line key="line-year" type="monotone" name="Año Pasado" dataKey="lastYear" stroke="#D1D5DB" strokeWidth={2} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor: Afluencia</CardTitle>
            <CardDescription>Picos de demanda identificados por día y hora.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="flex flex-col h-[300px]">
                <div className="flex mb-2">
                  <div className="w-12"></div>
                  {heatmapHours.map(hour => <div key={hour} className="flex-1 text-center text-xs text-neutral-400 font-medium">{hour}</div>)}
                </div>
                {heatmapDays.map(day => (
                  <div key={day} className="flex mb-1 items-center">
                    <div className="w-12 text-xs text-neutral-500 font-medium pr-2 text-right">{day}</div>
                    {heatmapHours.map(hour => {
                      const val = heatmapData.find(d => d.day === day && d.hour === hour)?.value || 0;
                      return (
                        <div key={`${day}-${hour}`} className="flex-1 px-0.5">
                          <div className={`h-8 w-full rounded-sm ${getHeatmapColor(val)}`} title={`${day} ${hour}: ${val} clientes`} />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingeniería de Menú</CardTitle>
            <CardDescription>Clasificación de rentabilidad y popularidad de los platos.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={status}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plato</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Rentabilidad</TableHead>
                    <TableHead className="text-right">Popularidad</TableHead>
                    <TableHead className="text-right">T. Cocina</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuEngineering.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold text-neutral-900">{item.name}</TableCell>
                      <TableCell><Badge variant={getCatVariant(item.category)}>{item.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{item.margin}%</TableCell>
                      <TableCell className="text-right">{item.popularity}/100</TableCell>
                      <TableCell className="text-right text-neutral-500">{item.prepTime} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Margen vs Popularidad</CardTitle>
            <CardDescription>Distribución de platos.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" type="number" dataKey="popularity" name="Popularidad" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <YAxis key="yaxis" type="number" dataKey="margin" name="Margen" unit="%" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <ZAxis key="zaxis" type="number" dataKey="prepTime" range={[60, 200]} />
                    <Tooltip key="tooltip" cursor={{ strokeDasharray: '3 3' }} formatter={(value: number, name: string) => [name === 'Margen' ? `${value}%` : value, name]} />
                    <Scatter key="scatter" name="Platos" data={menuEngineering} fill="#ea580c" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuditModule({ status }: { status: DataStatus }) {
  const [tab, setTab] = useState<'tx'|'inv'>('tx');
  const [search, setSearch] = useState('');

  const filteredTx = transactions.filter(t => t.waiter.toLowerCase().includes(search.toLowerCase()) || t.table.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Historial y Auditoría</h1>
          <p className="text-sm text-neutral-500">Trazabilidad total de transacciones e inventario.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Filter size={16} /> Filtros Avanzados</button>
        </div>
      </div>

      <div className="flex space-x-1 rounded-xl bg-neutral-200/50 p-1 w-max">
        <button onClick={() => setTab('tx')} className={clsx("rounded-lg px-4 py-2 text-sm font-medium transition-all", tab === 'tx' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>Transacciones</button>
        <button onClick={() => setTab('inv')} className={clsx("rounded-lg px-4 py-2 text-sm font-medium transition-all", tab === 'inv' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>Log de Inventario</button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{tab === 'tx' ? 'Registro de Transacciones' : 'Historial de Movimientos'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b border-neutral-100 flex items-center gap-4 bg-neutral-50/50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
          </div>
          <DataStateWrapper status={status}>
            <Table>
              {tab === 'tx' ? (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Factura</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Mesero</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold text-neutral-900">{t.id}</TableCell>
                        <TableCell>{t.table}</TableCell>
                        <TableCell>{t.waiter}</TableCell>
                        <TableCell>{t.payment}</TableCell>
                        <TableCell className="text-neutral-500">{t.time}</TableCell>
                        <TableCell className="text-right font-medium">${t.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={t.status === 'Pagado' ? 'success' : 'destructive'}>{t.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              ) : (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Impacto Fin.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryLogs.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-neutral-500">{l.date}</TableCell>
                        <TableCell className="font-bold text-neutral-900">{l.item}</TableCell>
                        <TableCell><Badge variant={l.type === 'Entrada' ? 'success' : 'destructive'}>{l.type}</Badge></TableCell>
                        <TableCell>{l.reason}</TableCell>
                        <TableCell>{l.user}</TableCell>
                        <TableCell className={`text-right font-bold ${l.impact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {l.impact < 0 ? '-' : '+'}${Math.abs(l.impact).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
            </Table>
          </DataStateWrapper>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffModule({ status }: { status: DataStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Rendimiento del Personal</h1>
          <p className="text-sm text-neutral-500">Productividad, ventas y control de asistencia.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Empleados Activos" value="24" icon={<Users className="text-orange-500"/>} />
        <StatCard title="Calificación Promedio" value="4.6 / 5" trend={2.1} icon={<Star className="text-yellow-500 fill-yellow-500"/>} />
        <StatCard title="Rotación de Mesa (Prom)" value="45 min" trend={-5.2} icon={<CalendarDays className="text-blue-500"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Totales por Mesero</CardTitle>
            <CardDescription>Productividad generada este mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffPerformance} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <YAxis key="yaxis" type="category" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip key="tooltip" cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend key="legend" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar key="bar-food" dataKey="foodSales" name="Alimentos" stackId="a" fill="#ea580c" radius={[0, 0, 0, 0]} />
                    <Bar key="bar-drink" dataKey="drinkSales" name="Bebidas" stackId="a" fill="#fcd34d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panel de Productividad & Asistencia</CardTitle>
            <CardDescription>Detalle de KPIs por empleado.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={status}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-center">T. Rotación</TableHead>
                    <TableHead className="text-center">Turnos</TableHead>
                    <TableHead className="text-center">Hrs Extra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map(staff => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-bold text-neutral-900">
                        {staff.name}
                        <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium mt-1">
                          <Star size={10} className="fill-yellow-500"/> {staff.rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-neutral-600">{staff.turnaround}m</TableCell>
                      <TableCell className="text-center">{staff.shifts}/22</TableCell>
                      <TableCell className="text-center">
                        <span className={staff.overtime > 0 ? "text-orange-600 font-bold" : "text-neutral-400"}>
                          {staff.overtime > 0 ? `+${staff.overtime}h` : '0h'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CostsModule({ status }: { status: DataStatus }) {
  const pieData = [{ name: 'Fijos', value: costsData.fixed }, { name: 'Variables', value: costsData.variable }];
  const breakevenProgress = Math.min((costsData.sales / costsData.breakeven) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Costos y Rentabilidad</h1>
          <p className="text-sm text-neutral-500">Dashboard financiero, punto de equilibrio y control de mermas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Food Cost %" value={`${costsData.foodCost}%`} trend={-1.2} icon={<PieChart className="text-blue-500"/>} subtitle="Objetivo: < 30%" />
        <StatCard title="Punto de Equilibrio" value={`$${costsData.breakeven.toLocaleString()}`} icon={<Banknote className="text-green-500"/>} subtitle="Ventas necesarias" />
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between mb-2"><span className="text-sm font-medium text-neutral-500">Progreso a Equilibrio</span><span className="font-bold text-neutral-900">{breakevenProgress.toFixed(1)}%</span></div>
          <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
            <div className={clsx("h-full rounded-full transition-all", breakevenProgress >= 100 ? "bg-green-500" : "bg-orange-500")} style={{width: `${breakevenProgress}%`}} />
          </div>
          <p className="mt-2 text-xs text-neutral-400 text-right">Ventas: ${costsData.sales.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estructura de Costos</CardTitle>
            <CardDescription>Costos fijos vs. variables.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      <Cell key="cell-fijos" fill="#ea580c" />
                      <Cell key="cell-variables" fill="#fcd34d" />
                    </Pie>
                    <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, 'Monto']} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-red-600 flex items-center gap-2"><ShieldAlert size={20}/> Alertas de Merma</CardTitle>
             <CardDescription>Insumos con mayor desperdicio económico.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={status}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wasteAlerts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" dataKey="item" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yaxis" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip key="tooltip" cursor={{ fill: '#F3F4F6' }} formatter={(val: number, name: string, props: any) => [`$${val}`, `Merma (${props.payload.reason})`]} />
                    <Bar key="bar-cost" dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CRMModule({ status }: { status: DataStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reservas y Fidelizaci��n (CRM)</h1>
          <p className="text-sm text-neutral-500">Historial de clientes frecuentes, preferencias y control de No-shows.</p>
        </div>
      </div>

      <Card>
         <CardHeader className="pb-4">
            <CardTitle>Historial de Clientes VIP</CardTitle>
            <CardDescription>Perfiles detallados y métricas de consumo.</CardDescription>
         </CardHeader>
         <CardContent className="p-0">
           <DataStateWrapper status={status}>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Nombre del Cliente</TableHead>
                   <TableHead className="text-center">Visitas</TableHead>
                   <TableHead className="text-right">Ticket Prom.</TableHead>
                   <TableHead>Platos Favoritos</TableHead>
                   <TableHead className="text-center">No-Shows</TableHead>
                   <TableHead>Última Visita</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {crmCustomers.map(c => (
                   <TableRow key={c.id}>
                     <TableCell className="font-bold text-neutral-900">
                       {c.name}
                       {c.visits > 20 && <Badge className="ml-2 bg-purple-100 text-purple-700">Top VIP</Badge>}
                     </TableCell>
                     <TableCell className="text-center font-medium">{c.visits}</TableCell>
                     <TableCell className="text-right text-green-600 font-bold">${c.avgSpend.toFixed(2)}</TableCell>
                     <TableCell className="text-neutral-500 text-sm">{c.favorites}</TableCell>
                     <TableCell className="text-center">
                       <Badge variant={c.noShows > 0 ? 'destructive' : 'success'}>{c.noShows}</Badge>
                     </TableCell>
                     <TableCell className="text-neutral-500">{c.lastVisit}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </DataStateWrapper>
         </CardContent>
      </Card>
    </div>
  );
}

function InventoryModule({ status }: { status: DataStatus }) {
  const [search, setSearch] = useState('');
  
  const filteredMaterials = rawMaterials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Inventario</h1>
          <p className="text-sm text-neutral-500">Control de materias primas e insumos (sin agrupar por receta).</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-neutral-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-50">
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Materias Primas</CardTitle>
          <CardDescription>Listado general de insumos requeridos para las operaciones del restaurante.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b border-neutral-100 flex items-center gap-4 bg-neutral-50/50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar insumo o categoría..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <DataStateWrapper status={status}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Stock Mínimo</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map(m => {
                   const isLowStock = m.stock <= m.minStock;
                   return (
                     <TableRow key={m.id}>
                       <TableCell className="font-bold text-neutral-900">{m.name}</TableCell>
                       <TableCell><Badge variant="default">{m.category}</Badge></TableCell>
                       <TableCell className="text-neutral-500">{m.supplier}</TableCell>
                       <TableCell className="text-right text-neutral-500">{m.minStock} {m.unit}</TableCell>
                       <TableCell className={`text-right font-bold ${isLowStock ? 'text-red-600' : 'text-neutral-900'}`}>
                         {m.stock} {m.unit}
                       </TableCell>
                       <TableCell className="text-center">
                         {isLowStock ? <Badge variant="destructive">Reabastecer</Badge> : <Badge variant="success">Óptimo</Badge>}
                       </TableCell>
                     </TableRow>
                   );
                })}
              </TableBody>
            </Table>
          </DataStateWrapper>
        </CardContent>
      </Card>
    </div>
  );
}