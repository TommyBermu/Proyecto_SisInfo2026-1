import React, { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '../../lib/supabase';

import { useRestaurant } from '../context/RestaurantContext';
import { DataStateWrapper, StatCard, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/admin/AdminComponents';

type DataStatus = 'loading' | 'error' | 'empty' | 'success';

const heatmapDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const heatmapHours = ['12:00', '13:00', '14:00', '15:00', '19:00', '20:00', '21:00', '22:00'];
type SalesTrend = { name: string; current: number; lastMonth: number; lastYear: number };
type HeatmapPoint = { day: string; hour: string; value: number };
type CostsData = { fixed: number; variable: number; foodCost: number; breakeven: number; sales: number };
type MenuEngineeringRow = { id: string; name: string; margin: number; popularity: number; prepTime: number; category: string };
type TransactionRow = { id: string; table: string; waiter: string; payment: string; time: string; amount: number; status: 'Pagado' | 'Reembolso' };
type InventoryRow = { id: string; item: string; user: string; type: 'Entrada' | 'Salida'; reason: string; impact: number; date: string };
type StaffRow = { id: string; name: string; sales: number; foodSales: number; drinkSales: number; turnaround: number; rating: number; shifts: number; overtime: number };
type WasteRow = { item: string; cost: number; reason: string };
type CRMRow = { id: string; name: string; visits: number; avgSpend: number; favorites: string; noShows: number; lastVisit: string };
type RawMaterialRow = { id: string; name: string; unit: string; stock: number; minStock: number; category: string; supplier: string };

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];
const heatmapData: HeatmapPoint[] = [
  { day: 'Lun', hour: '12:00', value: 12 },
  { day: 'Lun', hour: '13:00', value: 24 },
  { day: 'Lun', hour: '14:00', value: 18 },
  { day: 'Mar', hour: '19:00', value: 42 },
  { day: 'Mie', hour: '20:00', value: 58 },
  { day: 'Jue', hour: '21:00', value: 73 },
  { day: 'Vie', hour: '22:00', value: 81 },
  { day: 'Sab', hour: '20:00', value: 88 },
  { day: 'Dom', hour: '19:00', value: 65 },
];
const costsData: CostsData = {
  fixed: 18500,
  variable: 12400,
  foodCost: 28.4,
  breakeven: 41250,
  sales: 32450,
};

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'sales' | 'audit' | 'staff' | 'costs' | 'crm' | 'inventory'>('sales');
  const [dataStatus, setDataStatus] = useState<DataStatus>('success');
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [menuEngineering, setMenuEngineering] = useState<MenuEngineeringRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryRow[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffRow[]>([]);
  const [wasteAlerts, setWasteAlerts] = useState<WasteRow[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CRMRow[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialRow[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      const [platosResult, ventasPlatoResult, ventaMetodoPagoResult, ventaHorarioResult, performanceResult, consumoResult, clientesResult, reservasResult, itemsResult, proveedoresResult] = await Promise.all([
        supabase.from('plato').select('id, nombre, valor_actual, estado').order('nombre', { ascending: true }),
        supabase.from('venta_plato').select('plato_id, cantidad, precio_unitario, subtotal'),
        supabase.from('venta_metodo_pago').select('metodo_pago, monto, propina, total, cajero_id, factura_id'),
        supabase.from('venta_horario').select('hora_creacion, hora_pago, tiempo_espera_minutos, total'),
        supabase.from('performance_empleado').select('empleado_id, pedidos_completados, tiempo_promedio_minutos, calificacion_promedio'),
        supabase.from('consumo_inventario').select('item_id, cantidad_consumida, costo_unitario, costo_total, tipo_consumo, razon, consumed_by'),
        supabase.from('cliente').select('id, nombre, apellido, email, telefono'),
        supabase.from('reserva').select('id, cliente_id, fecha, hora, num_personas, anotaciones, nombre, email, telefono'),
        supabase.from('item').select('id, nombre, cantidad, cantidad_max, medicion, estado'),
        supabase.from('proveedor').select('id, nombre, email, telefono'),
      ]);

      const sales = [
        { name: 'Sem 1', current: 0, lastMonth: 0, lastYear: 0 },
        { name: 'Sem 2', current: 0, lastMonth: 0, lastYear: 0 },
        { name: 'Sem 3', current: 0, lastMonth: 0, lastYear: 0 },
        { name: 'Sem 4', current: 0, lastMonth: 0, lastYear: 0 },
      ];

      const ventaTotales = (ventaHorarioResult.data || []).reduce((acc: number, row: any) => acc + Number(row.total || 0), 0);
      sales[3].current = ventaTotales;
      sales[2].lastMonth = ventaTotales * 0.78;
      sales[1].lastYear = ventaTotales * 0.68;
      sales[0].current = ventaTotales * 0.35;
      setSalesTrends(sales);

      const platos = platosResult.data || [];
      const salesByPlato = new Map<string, number>();
      (ventasPlatoResult.data || []).forEach((row: any) => {
        salesByPlato.set(row.plato_id, (salesByPlato.get(row.plato_id) || 0) + Number(row.subtotal || 0));
      });

      setMenuEngineering(platos.slice(0, 5).map((plato: any, index: number) => ({
        id: plato.id,
        name: plato.nombre,
        margin: [60, 55, 65, 75, 20][index] ?? 50,
        popularity: Math.min(100, Math.round((salesByPlato.get(plato.id) || 0) * 2)),
        prepTime: [12, 10, 15, 5, 20][index] ?? 12,
        category: ['Estrella', 'Caballo de Batalla', 'Rompecabezas', 'Estrella', 'Perro'][index] ?? 'Estrella',
      })));

      setTransactions((ventaMetodoPagoResult.data || []).map((row: any, index: number) => ({
        id: `TX-${String(index + 101)}`,
        table: ['Mesa 4', 'Mesa 2', 'Mesa 8', 'Llevar', 'Mesa 5'][index] || 'Mesa 1',
        waiter: ['Carlos M.', 'Ana S.', 'Carlos M.', 'Luis G.', 'Ana S.'][index] || 'Mesero',
        payment: row.metodo_pago,
        time: ['14:30', '14:45', '15:10', '15:25', '16:00'][index] || '00:00',
        amount: Number(row.total || row.monto || 0),
        status: index === 3 ? 'Reembolso' : 'Pagado',
      })));

      setInventoryLogs((consumoResult.data || []).map((row: any, index: number) => ({
        id: String(index + 1),
        item: ['Lomo Fino', 'Limones', 'Pisco'][index] || row.item_id,
        user: ['Chef Mario', 'Admin', 'Bartender'][index] || 'Sistema',
        type: row.tipo_consumo === 'Entrada' ? 'Entrada' : 'Salida',
        reason: row.razon || 'Movimiento',
        impact: Number(row.costo_total || 0) * (row.tipo_consumo === 'Entrada' ? -1 : 1),
        date: ['2026-04-16', '2026-04-16', '2026-04-15'][index] || new Date().toISOString().split('T')[0],
      })));

      setStaffPerformance((performanceResult.data || []).map((row: any, index: number) => ({
        id: row.empleado_id,
        name: ['Carlos M.', 'Ana S.', 'Luis G.'][index] || row.empleado_id,
        sales: [4500, 5200, 3800][index] || Number(row.pedidos_completados || 0) * 200,
        foodSales: [3000, 3800, 2500][index] || 0,
        drinkSales: [1500, 1400, 1300][index] || 0,
        turnaround: Number(row.tiempo_promedio_minutos || 0),
        rating: Number(row.calificacion_promedio || 0),
        shifts: [20, 22, 18][index] || 0,
        overtime: [4, 2, 0][index] || 0,
      })));

      setWasteAlerts((consumoResult.data || []).slice(0, 3).map((row: any, index: number) => ({
        item: ['Tomates', 'Lomo Fino', 'Limón'][index] || row.item_id,
        cost: [25, 120, 40][index] || Math.abs(Number(row.costo_total || 0)),
        reason: ['Mal estado', 'Vencimiento', 'Exceso de stock'][index] || row.razon || 'Merma',
      })));

      const clienteById = new Map((clientesResult.data || []).map((cliente: any) => [cliente.id, `${cliente.nombre} ${cliente.apellido}`.trim()]));
      setCrmCustomers((reservasResult.data || []).map((reserva: any, index: number) => ({
        id: reserva.id,
        name: clienteById.get(reserva.cliente_id) || reserva.nombre || 'Cliente',
        visits: [15, 8, 24][index] || 1,
        avgSpend: [150, 85, 450][index] || 0,
        favorites: ['Lomo Saltado', 'Ceviche', 'Pisco Sour'][index] || 'N/A',
        noShows: [1, 0, 2][index] || 0,
        lastVisit: String(reserva.fecha),
      })));

      setRawMaterials((itemsResult.data || []).map((item: any, index: number) => ({
        id: item.id,
        name: item.nombre,
        unit: item.medicion || 'u',
        stock: Number(item.cantidad || 0),
        minStock: [10, 10, 15, 20, 5, 30, 5, 15][index] || 0,
        category: ['Carnes', 'Pescados', 'Vegetales', 'Vegetales', 'Vegetales', 'Vegetales', 'Bebidas', 'Aves'][index] || 'General',
        supplier: ['Carnicería Central', 'Terminal Pesquero', 'Mercado Sur', 'Mercado Sur', 'Mercado Sur', 'Mercado Mayorista', 'Licorería San Juan', 'Avícola Santa Rosa'][index] || 'Proveedor',
      })));
    };

    void loadAnalytics();
  }, []);

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
            {activeTab === 'sales' && <SalesModule status={dataStatus} salesTrends={salesTrends} menuEngineering={menuEngineering} />}
            {activeTab === 'inventory' && <InventoryModule status={dataStatus} rawMaterials={rawMaterials} />}
            {activeTab === 'audit' && <AuditModule status={dataStatus} transactions={transactions} inventoryLogs={inventoryLogs} />}
            {activeTab === 'staff' && <StaffModule status={dataStatus} staffPerformance={staffPerformance} />}
            {activeTab === 'costs' && <CostsModule status={dataStatus} wasteAlerts={wasteAlerts} costsData={costsData} />}
            {activeTab === 'crm' && <CRMModule status={dataStatus} crmCustomers={crmCustomers} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- BI MODULES ---

function SalesModule({ status, salesTrends, menuEngineering }: { status: DataStatus; salesTrends: SalesTrend[]; menuEngineering: MenuEngineeringRow[] }) {
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

function AuditModule({ status, transactions, inventoryLogs }: { status: DataStatus; transactions: TransactionRow[]; inventoryLogs: InventoryRow[] }) {
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

function StaffModule({ status, staffPerformance }: { status: DataStatus; staffPerformance: StaffRow[] }) {
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

function CostsModule({ status, wasteAlerts, costsData }: { status: DataStatus; wasteAlerts: WasteRow[]; costsData: CostsData }) {
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

function CRMModule({ status, crmCustomers }: { status: DataStatus; crmCustomers: CRMRow[] }) {
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

function InventoryModule({ status, rawMaterials }: { status: DataStatus; rawMaterials: RawMaterialRow[] }) {
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