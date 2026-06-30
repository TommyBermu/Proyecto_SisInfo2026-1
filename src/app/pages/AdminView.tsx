import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, History, Users, DollarSign, CalendarDays,
  Search, Star, Banknote, LayoutDashboard, Utensils,
  Clock, TrendingDown, CheckCircle2, UserCheck, CalendarClock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { supabase } from '../../lib/supabase';

import { DataStateWrapper, StatCard, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/admin/AdminComponents';

type DataStatus = 'loading' | 'error' | 'empty' | 'success';

type HourlyRevenue = { hour: string; ingreso: number };
type PaymentSlice = { name: string; value: number };
type MenuEngineeringRow = { id: string; name: string; margin: number | null; popularity: number; units: number; revenue: number; prepTime: number | null };
type TransactionRow = { id: string; table: string; waiter: string; cashier: string; payment: string; time: string; amount: number; status: string };
type StaffRow = { id: string; name: string; role: string; metricLabel: string; metricValue: number; metricIsMoney: boolean; rating: number | null; shifts: number; overtime: number };
type CostsData = { foodCostPct: number | null; fixed: number; variable: number; cogs: number; sales: number; breakeven: number | null };
type ReservationRow = { id: string; name: string; date: string; time: string; people: number; status: string; contact: string; notes: string };

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];
const PAYMENT_LABELS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
const paymentLabel = (m: string) => PAYMENT_LABELS[m] || m || 'Otro';
const money = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'sales' | 'audit' | 'staff' | 'costs' | 'reservas'>('sales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [hourlyRevenue, setHourlyRevenue] = useState<HourlyRevenue[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentSlice[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [menuEngineering, setMenuEngineering] = useState<MenuEngineeringRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffRow[]>([]);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [avgTurnaround, setAvgTurnaround] = useState<number | null>(null);
  const [costsData, setCostsData] = useState<CostsData>({ foodCostPct: null, fixed: 0, variable: 0, cogs: 0, sales: 0, breakeven: null });
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(false);
      try {
        const [
          facturasRes, pedidosRes, mesasRes, empleadosRes, platosRes,
          ventaPlatoRes, detalleRes, reservasRes, gastosRes, turnosRes, calificacionesRes,
        ] = await Promise.all([
          supabase.from('factura').select('id, total, propina, metodo_pago, estado, created_at, cajero_id, pedido_id'),
          supabase.from('pedido').select('id, mesa_id, mesero_id, created_at'),
          supabase.from('mesa').select('id, numero'),
          supabase.from('empleado').select('id, nombre, apellido, rol, estado'),
          supabase.from('plato').select('id, nombre, valor_actual, costo, tiempo_preparacion_min, estado'),
          supabase.from('venta_plato').select('plato_id, cantidad, subtotal'),
          supabase.from('detalle_pedido').select('chef_id, cantidad'),
          supabase.from('reserva').select('id, fecha, hora, num_personas, estado, nombre, email, telefono, anotaciones'),
          supabase.from('gasto_operativo').select('tipo, monto, concepto, fecha'),
          supabase.from('empleado_turno').select('empleado_id, horas_extra'),
          supabase.from('empleado_calificacion').select('empleado_id, calificacion'),
        ]);

        const firstError = [facturasRes, pedidosRes, mesasRes, empleadosRes, platosRes, ventaPlatoRes, detalleRes, reservasRes, gastosRes, turnosRes, calificacionesRes].find(r => r.error);
        if (firstError?.error) throw firstError.error;

        const facturas = facturasRes.data || [];
        const pedidos = pedidosRes.data || [];
        const mesas = mesasRes.data || [];
        const empleados = empleadosRes.data || [];
        const platos = platosRes.data || [];
        const ventaPlato = ventaPlatoRes.data || [];
        const detalles = detalleRes.data || [];
        const reservas = reservasRes.data || [];
        const gastos = gastosRes.data || [];
        const turnos = turnosRes.data || [];
        const calificaciones = calificacionesRes.data || [];

        const pedidoById = new Map(pedidos.map((p: any) => [p.id, p]));
        const mesaById = new Map(mesas.map((m: any) => [m.id, m]));
        const empleadoById = new Map(empleados.map((e: any) => [e.id, e]));
        const fullName = (e: any) => e ? `${e.nombre || ''} ${e.apellido || ''}`.trim() || 'Empleado' : '—';

        // --- VENTAS ---
        const totalRev = facturas.reduce((acc: number, f: any) => acc + Number(f.total || 0), 0);
        const totalTip = facturas.reduce((acc: number, f: any) => acc + Number(f.propina || 0), 0);
        setTotalRevenue(totalRev);
        setTotalTips(totalTip);
        setAvgTicket(facturas.length ? totalRev / facturas.length : 0);

        const byHour = new Map<number, number>();
        facturas.forEach((f: any) => {
          if (!f.created_at) return;
          const h = new Date(f.created_at).getHours();
          byHour.set(h, (byHour.get(h) || 0) + Number(f.total || 0));
        });
        setHourlyRevenue(
          Array.from(byHour.keys()).sort((a, b) => a - b).map(h => ({
            hour: `${String(h).padStart(2, '0')}:00`,
            ingreso: Math.round(byHour.get(h) || 0),
          }))
        );

        const byPayment = new Map<string, number>();
        facturas.forEach((f: any) => {
          byPayment.set(f.metodo_pago, (byPayment.get(f.metodo_pago) || 0) + Number(f.total || 0));
        });
        setPaymentBreakdown(Array.from(byPayment.entries()).map(([k, v]) => ({ name: paymentLabel(k), value: Math.round(v) })));

        // --- INGENIERÍA DE MENÚ ---
        const unitsByPlato = new Map<string, number>();
        const revenueByPlato = new Map<string, number>();
        ventaPlato.forEach((vp: any) => {
          unitsByPlato.set(vp.plato_id, (unitsByPlato.get(vp.plato_id) || 0) + Number(vp.cantidad || 0));
          revenueByPlato.set(vp.plato_id, (revenueByPlato.get(vp.plato_id) || 0) + Number(vp.subtotal || 0));
        });
        const maxUnits = Math.max(1, ...Array.from(unitsByPlato.values()));
        setMenuEngineering(
          platos
            .map((p: any) => {
              const precio = Number(p.valor_actual || 0);
              const costo = p.costo === null || p.costo === undefined ? null : Number(p.costo);
              const units = unitsByPlato.get(p.id) || 0;
              return {
                id: p.id,
                name: p.nombre,
                margin: costo !== null && precio > 0 ? Math.round(((precio - costo) / precio) * 100) : null,
                popularity: Math.round((units / maxUnits) * 100),
                units,
                revenue: Math.round(revenueByPlato.get(p.id) || 0),
                prepTime: p.tiempo_preparacion_min ?? null,
              };
            })
            .sort((a, b) => b.revenue - a.revenue)
        );

        // --- AUDITORÍA (transacciones) ---
        setTransactions(
          facturas
            .slice()
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((f: any) => {
              const pedido = pedidoById.get(f.pedido_id);
              const mesa = pedido ? mesaById.get(pedido.mesa_id) : null;
              const mesero = pedido ? empleadoById.get(pedido.mesero_id) : null;
              return {
                id: f.id.slice(0, 8).toUpperCase(),
                table: mesa ? `Mesa ${mesa.numero}` : 'Llevar',
                waiter: fullName(mesero),
                cashier: fullName(empleadoById.get(f.cajero_id)),
                payment: paymentLabel(f.metodo_pago),
                time: f.created_at ? new Date(f.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—',
                amount: Number(f.total || 0),
                status: f.estado || 'pendiente',
              };
            })
        );

        // --- STAFF ---
        setActiveEmployees(empleados.filter((e: any) => e.estado !== false).length);

        const salesByMesero = new Map<string, number>();
        const collectedByCajero = new Map<string, number>();
        facturas.forEach((f: any) => {
          const pedido = pedidoById.get(f.pedido_id);
          if (pedido?.mesero_id) salesByMesero.set(pedido.mesero_id, (salesByMesero.get(pedido.mesero_id) || 0) + Number(f.total || 0));
          if (f.cajero_id) collectedByCajero.set(f.cajero_id, (collectedByCajero.get(f.cajero_id) || 0) + Number(f.total || 0));
        });
        const dishesByChef = new Map<string, number>();
        detalles.forEach((d: any) => {
          if (d.chef_id) dishesByChef.set(d.chef_id, (dishesByChef.get(d.chef_id) || 0) + Number(d.cantidad || 0));
        });

        const ratingAgg = new Map<string, { sum: number; n: number }>();
        calificaciones.forEach((c: any) => {
          const cur = ratingAgg.get(c.empleado_id) || { sum: 0, n: 0 };
          cur.sum += Number(c.calificacion || 0); cur.n += 1;
          ratingAgg.set(c.empleado_id, cur);
        });
        const shiftsByEmp = new Map<string, number>();
        const overtimeByEmp = new Map<string, number>();
        turnos.forEach((t: any) => {
          shiftsByEmp.set(t.empleado_id, (shiftsByEmp.get(t.empleado_id) || 0) + 1);
          overtimeByEmp.set(t.empleado_id, (overtimeByEmp.get(t.empleado_id) || 0) + Number(t.horas_extra || 0));
        });

        setStaffPerformance(
          empleados.map((e: any) => {
            const rating = ratingAgg.get(e.id);
            let metricLabel = 'Pedidos', metricValue = 0, metricIsMoney = false;
            if (e.rol === 'mesero') { metricLabel = 'Ventas'; metricValue = salesByMesero.get(e.id) || 0; metricIsMoney = true; }
            else if (e.rol === 'cajero') { metricLabel = 'Cobrado'; metricValue = collectedByCajero.get(e.id) || 0; metricIsMoney = true; }
            else if (e.rol === 'chef') { metricLabel = 'Platos preparados'; metricValue = dishesByChef.get(e.id) || 0; }
            return {
              id: e.id,
              name: fullName(e),
              role: e.rol,
              metricLabel, metricValue, metricIsMoney,
              rating: rating ? rating.sum / rating.n : null,
              shifts: shiftsByEmp.get(e.id) || 0,
              overtime: overtimeByEmp.get(e.id) || 0,
            };
          })
        );

        const allRatings = calificaciones.map((c: any) => Number(c.calificacion || 0));
        setAvgRating(allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null);

        // rotación de mesa: tiempo entre creación del pedido y pago de la factura
        const turnarounds: number[] = [];
        facturas.forEach((f: any) => {
          const pedido = pedidoById.get(f.pedido_id);
          if (pedido?.created_at && f.created_at) {
            const mins = (new Date(f.created_at).getTime() - new Date(pedido.created_at).getTime()) / 60000;
            if (mins >= 0 && mins < 600) turnarounds.push(mins);
          }
        });
        setAvgTurnaround(turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null);

        // --- COSTOS ---
        const costoById = new Map(platos.map((p: any) => [p.id, p.costo === null || p.costo === undefined ? null : Number(p.costo)]));
        let cogs = 0; let haveCost = false;
        ventaPlato.forEach((vp: any) => {
          const costo = costoById.get(vp.plato_id);
          if (costo !== null && costo !== undefined) { cogs += costo * Number(vp.cantidad || 0); haveCost = true; }
        });
        const fixed = gastos.filter((g: any) => g.tipo === 'fijo').reduce((a: number, g: any) => a + Number(g.monto || 0), 0);
        const variable = gastos.filter((g: any) => g.tipo === 'variable').reduce((a: number, g: any) => a + Number(g.monto || 0), 0);
        const foodCostPct = haveCost && totalRev > 0 ? (cogs / totalRev) * 100 : null;
        let breakeven: number | null = null;
        if (fixed > 0 && totalRev > 0) {
          const contributionRatio = 1 - (variable + cogs) / totalRev;
          breakeven = contributionRatio > 0 ? fixed / contributionRatio : null;
        }
        setCostsData({ foodCostPct, fixed, variable, cogs, sales: totalRev, breakeven });

        // --- RESERVAS ---
        setReservations(
          reservas
            .slice()
            .sort((a: any, b: any) => new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime() - new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime())
            .map((r: any) => ({
              id: r.id,
              name: r.nombre || 'Sin nombre',
              date: r.fecha,
              time: r.hora ? String(r.hora).slice(0, 5) : '—',
              people: Number(r.num_personas || 0),
              status: r.estado || 'confirmada',
              contact: r.telefono || r.email || '—',
              notes: r.anotaciones || '',
            }))
        );
      } catch (err) {
        console.error('Error loading admin analytics:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  const statusFor = (hasData: boolean): DataStatus => (loading ? 'loading' : error ? 'error' : hasData ? 'success' : 'empty');

  const tabs = [
    { id: 'sales', label: 'Inteligencia de Ventas', icon: <BarChart3 size={20} /> },
    { id: 'audit', label: 'Historial y Auditoría', icon: <History size={20} /> },
    { id: 'staff', label: 'Rendimiento (KPIs)', icon: <Users size={20} /> },
    { id: 'costs', label: 'Costos y Rentabilidad', icon: <DollarSign size={20} /> },
    { id: 'reservas', label: 'Reservas', icon: <CalendarDays size={20} /> },
  ] as const;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-neutral-100 overflow-hidden">
      <aside className="w-64 bg-neutral-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LayoutDashboard size={22} className="text-orange-500" /> BI & Analytics
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
      </aside>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 h-full"
          >
            {activeTab === 'sales' && <SalesModule statusFor={statusFor} totalRevenue={totalRevenue} totalTips={totalTips} avgTicket={avgTicket} hourlyRevenue={hourlyRevenue} paymentBreakdown={paymentBreakdown} menuEngineering={menuEngineering} />}
            {activeTab === 'audit' && <AuditModule statusFor={statusFor} transactions={transactions} />}
            {activeTab === 'staff' && <StaffModule statusFor={statusFor} staffPerformance={staffPerformance} activeEmployees={activeEmployees} avgRating={avgRating} avgTurnaround={avgTurnaround} />}
            {activeTab === 'costs' && <CostsModule statusFor={statusFor} costsData={costsData} />}
            {activeTab === 'reservas' && <ReservasModule statusFor={statusFor} reservations={reservations} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- VENTAS ---
function SalesModule({ statusFor, totalRevenue, totalTips, avgTicket, hourlyRevenue, paymentBreakdown, menuEngineering }: {
  statusFor: (b: boolean) => DataStatus;
  totalRevenue: number; totalTips: number; avgTicket: number;
  hourlyRevenue: HourlyRevenue[]; paymentBreakdown: PaymentSlice[]; menuEngineering: MenuEngineeringRow[];
}) {
  const scatterData = menuEngineering.filter(m => m.margin !== null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Inteligencia de Ventas</h1>
          <p className="text-sm text-neutral-500">Métricas reales de facturación, métodos de pago y rendimiento de menú.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Ingresos Totales" value={money(totalRevenue)} icon={<DollarSign className="text-orange-500" />} subtitle="Suma de facturas registradas" />
        <StatCard title="Ticket Promedio" value={money(avgTicket)} icon={<Utensils className="text-orange-500" />} subtitle="Por factura" />
        <StatCard title="Propinas Totales" value={money(totalTips)} icon={<Banknote className="text-green-500" />} subtitle="Acumulado" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Hora</CardTitle>
            <CardDescription>Distribución de la facturación a lo largo del día.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(hourlyRevenue.length > 0)}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" dataKey="hour" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yaxis" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip key="tooltip" formatter={(val: number) => [money(val), 'Ingresos']} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Bar key="bar" dataKey="ingreso" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>Ingresos según forma de pago.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(paymentBreakdown.length > 0)}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name">
                      {paymentBreakdown.map((entry, i) => <Cell key={`cell-${entry.name}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => [money(val), 'Ingresos']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingeniería de Menú</CardTitle>
            <CardDescription>Unidades vendidas, ingresos y popularidad reales. Margen y tiempo se calculan al cargar costo / tiempo en cada plato.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={statusFor(menuEngineering.length > 0)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plato</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Popularidad</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">T. Cocina</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuEngineering.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold text-neutral-900">{item.name}</TableCell>
                      <TableCell className="text-right">{item.units}</TableCell>
                      <TableCell className="text-right font-medium">{money(item.revenue)}</TableCell>
                      <TableCell className="text-right">{item.popularity}/100</TableCell>
                      <TableCell className="text-right">{item.margin !== null ? `${item.margin}%` : <span className="text-neutral-400">—</span>}</TableCell>
                      <TableCell className="text-right text-neutral-500">{item.prepTime !== null ? `${item.prepTime} min` : <span className="text-neutral-400">—</span>}</TableCell>
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
            <CardDescription>Solo platos con costo cargado.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(scatterData.length > 0)} emptyMessage="Carga el costo de los platos para ver esta gráfica.">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" type="number" dataKey="popularity" name="Popularidad" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <YAxis key="yaxis" type="number" dataKey="margin" name="Margen" unit="%" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <ZAxis key="zaxis" type="number" dataKey="units" range={[60, 200]} />
                    <Tooltip key="tooltip" cursor={{ strokeDasharray: '3 3' }} formatter={(value: number, name: string) => [name === 'Margen' ? `${value}%` : value, name]} />
                    <Scatter key="scatter" name="Platos" data={scatterData} fill="#ea580c" />
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

// --- AUDITORÍA ---
function AuditModule({ statusFor, transactions }: { statusFor: (b: boolean) => DataStatus; transactions: TransactionRow[] }) {
  const [search, setSearch] = useState('');
  const filtered = transactions.filter(t =>
    t.waiter.toLowerCase().includes(search.toLowerCase()) ||
    t.cashier.toLowerCase().includes(search.toLowerCase()) ||
    t.table.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Historial y Auditoría</h1>
          <p className="text-sm text-neutral-500">Trazabilidad de todas las transacciones facturadas.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Registro de Transacciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b border-neutral-100 flex items-center gap-4 bg-neutral-50/50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input type="text" placeholder="Buscar por mesa, mesero, cajero o factura..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <DataStateWrapper status={statusFor(transactions.length > 0)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Factura</TableHead>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Mesero</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-bold text-neutral-900">{t.id}</TableCell>
                    <TableCell>{t.table}</TableCell>
                    <TableCell>{t.waiter}</TableCell>
                    <TableCell>{t.cashier}</TableCell>
                    <TableCell>{t.payment}</TableCell>
                    <TableCell className="text-neutral-500">{t.time}</TableCell>
                    <TableCell className="text-right font-medium">{money(t.amount)}</TableCell>
                    <TableCell><Badge variant={t.status === 'pagada' ? 'success' : t.status === 'cancelada' ? 'destructive' : 'warning'}>{t.status}</Badge></TableCell>
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

// --- STAFF ---
function StaffModule({ statusFor, staffPerformance, activeEmployees, avgRating, avgTurnaround }: {
  statusFor: (b: boolean) => DataStatus;
  staffPerformance: StaffRow[]; activeEmployees: number; avgRating: number | null; avgTurnaround: number | null;
}) {
  const salesChart = staffPerformance.filter(s => s.metricIsMoney && s.metricValue > 0).map(s => ({ name: s.name, ventas: Math.round(s.metricValue) }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Rendimiento del Personal</h1>
          <p className="text-sm text-neutral-500">Productividad real por rol. Calificaciones y turnos se calculan al cargar esos datos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Empleados Activos" value={activeEmployees} icon={<Users className="text-orange-500" />} />
        <StatCard title="Calificación Promedio" value={avgRating !== null ? `${avgRating.toFixed(1)} / 5` : '—'} icon={<Star className="text-yellow-500 fill-yellow-500" />} subtitle={avgRating === null ? 'Sin calificaciones aún' : undefined} />
        <StatCard title="Rotación de Mesa (Prom)" value={avgTurnaround !== null ? `${Math.round(avgTurnaround)} min` : '—'} icon={<Clock className="text-blue-500" />} subtitle="Del pedido al pago" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Empleado</CardTitle>
            <CardDescription>Facturación generada (meseros y cajeros).</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(salesChart.length > 0)}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChart} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" horizontal vertical={false} stroke="#E5E7EB" />
                    <XAxis key="xaxis" type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <YAxis key="yaxis" type="category" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip key="tooltip" cursor={{ fill: '#F3F4F6' }} formatter={(val: number) => [money(val), 'Ventas']} />
                    <Bar key="bar" dataKey="ventas" name="Ventas" fill="#ea580c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panel de Productividad</CardTitle>
            <CardDescription>Detalle por empleado y rol.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={statusFor(staffPerformance.length > 0)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Métrica</TableHead>
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
                          <Star size={10} className="fill-yellow-500" /> {staff.rating !== null ? staff.rating.toFixed(1) : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-neutral-600">{staff.role}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className="text-neutral-500 text-xs block">{staff.metricLabel}</span>
                        {staff.metricIsMoney ? money(staff.metricValue) : staff.metricValue}
                      </TableCell>
                      <TableCell className="text-center">{staff.shifts}</TableCell>
                      <TableCell className="text-center">
                        <span className={staff.overtime > 0 ? 'text-orange-600 font-bold' : 'text-neutral-400'}>
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

// --- COSTOS ---
function CostsModule({ statusFor, costsData }: { statusFor: (b: boolean) => DataStatus; costsData: CostsData }) {
  const pieData = [{ name: 'Fijos', value: costsData.fixed }, { name: 'Variables', value: costsData.variable }];
  const hasCostStructure = costsData.fixed > 0 || costsData.variable > 0;
  const breakevenProgress = costsData.breakeven ? Math.min((costsData.sales / costsData.breakeven) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Costos y Rentabilidad</h1>
          <p className="text-sm text-neutral-500">Food cost, estructura de costos y punto de equilibrio. Carga costos de platos y gastos operativos para alimentar este panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Food Cost %" value={costsData.foodCostPct !== null ? `${costsData.foodCostPct.toFixed(1)}%` : '—'} icon={<TrendingDown className="text-blue-500" />} subtitle={costsData.foodCostPct === null ? 'Carga el costo de los platos' : 'Objetivo: < 30%'} />
        <StatCard title="Punto de Equilibrio" value={costsData.breakeven !== null ? money(costsData.breakeven) : '—'} icon={<Banknote className="text-green-500" />} subtitle={costsData.breakeven === null ? 'Carga gastos operativos' : 'Ventas necesarias'} />
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between mb-2"><span className="text-sm font-medium text-neutral-500">Progreso a Equilibrio</span><span className="font-bold text-neutral-900">{breakevenProgress.toFixed(1)}%</span></div>
          <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
            <div className={clsx("h-full rounded-full transition-all", breakevenProgress >= 100 ? "bg-green-500" : "bg-orange-500")} style={{ width: `${breakevenProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-400 text-right">Ventas: {money(costsData.sales)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estructura de Costos</CardTitle>
            <CardDescription>Costos fijos vs. variables (gastos operativos).</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(hasCostStructure)} emptyMessage="Carga gastos operativos para ver la estructura de costos.">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      <Cell key="cell-fijos" fill="#ea580c" />
                      <Cell key="cell-variables" fill="#fcd34d" />
                    </Pie>
                    <Tooltip formatter={(val: number) => [money(val), 'Monto']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
            <CardDescription>Cifras reales acumuladas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FinancialRow label="Ventas totales" value={money(costsData.sales)} />
              <FinancialRow label="Costo de mercancía vendida (CMV)" value={costsData.cogs > 0 ? money(costsData.cogs) : '—'} />
              <FinancialRow label="Costos fijos" value={money(costsData.fixed)} />
              <FinancialRow label="Costos variables" value={money(costsData.variable)} />
              <div className="border-t border-neutral-200 pt-4">
                <FinancialRow label="Utilidad estimada" value={money(costsData.sales - costsData.cogs - costsData.fixed - costsData.variable)} bold />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinancialRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx("text-sm", bold ? "font-bold text-neutral-900" : "text-neutral-500")}>{label}</span>
      <span className={clsx(bold ? "font-bold text-neutral-900 text-lg" : "font-medium text-neutral-700")}>{value}</span>
    </div>
  );
}

// --- RESERVAS ---
function ReservasModule({ statusFor, reservations }: { statusFor: (b: boolean) => DataStatus; reservations: ReservationRow[] }) {
  const today = new Date().toISOString().split('T')[0];
  const total = reservations.length;
  const confirmadas = reservations.filter(r => r.status === 'confirmada').length;
  const upcoming = reservations.filter(r => r.date >= today && r.status === 'confirmada').length;
  const totalPeople = reservations.reduce((a, r) => a + r.people, 0);
  const avgPeople = total ? totalPeople / total : 0;

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    reservations.forEach(r => m.set(r.status, (m.get(r.status) || 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [reservations]);

  const statusVariant = (s: string) => s === 'confirmada' ? 'success' : s === 'cancelada' ? 'destructive' : 'default';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reservas</h1>
          <p className="text-sm text-neutral-500">Listado de reservas y estadísticas relacionadas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Reservas" value={total} icon={<CalendarDays className="text-orange-500" />} />
        <StatCard title="Confirmadas" value={confirmadas} icon={<CheckCircle2 className="text-green-500" />} />
        <StatCard title="Próximas" value={upcoming} icon={<CalendarClock className="text-blue-500" />} subtitle="Confirmadas desde hoy" />
        <StatCard title="Personas por Reserva" value={avgPeople ? avgPeople.toFixed(1) : '0'} icon={<UserCheck className="text-orange-500" />} subtitle={`${totalPeople} personas en total`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reservas por Estado</CardTitle>
            <CardDescription>Distribución actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(byStatus.length > 0)}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value" nameKey="name">
                      {byStatus.map((entry, i) => <Cell key={`cell-${entry.name}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number, name: string) => [val, name]} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataStateWrapper>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Listado de Reservas</CardTitle>
            <CardDescription>Detalle de cada reserva registrada.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={statusFor(reservations.length > 0)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-center">Personas</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold text-neutral-900">
                        {r.name}
                        {r.notes && <div className="text-xs text-neutral-400 font-normal mt-0.5">{r.notes}</div>}
                      </TableCell>
                      <TableCell className="text-neutral-600">{r.date}</TableCell>
                      <TableCell className="text-neutral-600">{r.time}</TableCell>
                      <TableCell className="text-center font-medium">{r.people}</TableCell>
                      <TableCell className="text-neutral-500 text-sm">{r.contact}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
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
