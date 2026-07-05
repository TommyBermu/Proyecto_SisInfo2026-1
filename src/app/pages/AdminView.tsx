import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, History, Users, DollarSign, CalendarDays,
  Search, Star, Banknote, LayoutDashboard, Utensils,
  Clock, TrendingDown, CheckCircle2, UserCheck, CalendarClock,
  UserPlus, Copy, Mail, ShieldCheck, Loader2, Link2, Trash2, Pencil, Plus, X, Image as ImageIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

import { DataStateWrapper, StatCard, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/admin/AdminComponents';

type DataStatus = 'loading' | 'error' | 'empty' | 'success';

type HourlyRevenue = { hour: string; ingreso: number };
type PaymentSlice = { name: string; value: number };
type MenuEngineeringRow = { id: string; name: string; margin: number | null; timesOrdered: number; revenue: number };
type TransactionRow = { id: string; table: string; waiter: string; cashier: string; payment: string; time: string; amount: number; status: string };
type StaffRow = { id: string; name: string; role: string; metricLabel: string; metricValue: number; metricIsMoney: boolean; rating: number | null };
type MesaRotationRow = { mesa: string; tickets: number; avgMin: number };
type KitchenTimeRow = { platos: number; avgMin: number; muestras: number };
type CostsData = { foodCostPct: number | null; fixed: number; variable: number; cogs: number; sales: number; breakeven: number | null };
type ReservationRow = { id: string; name: string; date: string; time: string; people: number; status: string; contact: string; notes: string };

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];
const PAYMENT_LABELS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
const paymentLabel = (m: string) => PAYMENT_LABELS[m] || m || 'Otro';
const money = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'sales' | 'audit' | 'staff' | 'costs' | 'reservas' | 'platos' | 'usuarios'>('sales');
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
  const [mesaRotation, setMesaRotation] = useState<MesaRotationRow[]>([]);
  const [kitchenTimeByDishes, setKitchenTimeByDishes] = useState<KitchenTimeRow[]>([]);
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
        // Popularidad = cuántas veces se ha pedido el plato (nº de líneas de venta).
        // Ingresos = suma de subtotales reales (unidades × precio de venta).
        const timesOrderedByPlato = new Map<string, number>();
        const revenueByPlato = new Map<string, number>();
        ventaPlato.forEach((vp: any) => {
          timesOrderedByPlato.set(vp.plato_id, (timesOrderedByPlato.get(vp.plato_id) || 0) + 1);
          revenueByPlato.set(vp.plato_id, (revenueByPlato.get(vp.plato_id) || 0) + Number(vp.subtotal || 0));
        });
        setMenuEngineering(
          platos
            .map((p: any) => {
              const precio = Number(p.valor_actual || 0);
              const costo = p.costo === null || p.costo === undefined ? null : Number(p.costo);
              return {
                id: p.id,
                name: p.nombre,
                margin: costo !== null && precio > 0 ? Math.round(((precio - costo) / precio) * 100) : null,
                timesOrdered: timesOrderedByPlato.get(p.id) || 0,
                revenue: Math.round(revenueByPlato.get(p.id) || 0),
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
            };
          })
        );

        const allRatings = calificaciones.map((c: any) => Number(c.calificacion || 0));
        setAvgRating(allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null);

        // nº de platos por factura (para relacionar tiempo del ticket con la cantidad de platos)
        const dishesByFactura = new Map<string, number>();
        ventaPlato.forEach((vp: any) => {
          dishesByFactura.set(vp.factura_id, (dishesByFactura.get(vp.factura_id) || 0) + Number(vp.cantidad || 0));
        });

        // Rotación por mesa + tiempo del ticket (creación del pedido -> pago) según nº de platos
        const turnarounds: number[] = [];
        const mesaAgg = new Map<string, { tickets: number; sumMin: number }>();
        const timeByDishCount = new Map<number, { sum: number; n: number }>();
        facturas.forEach((f: any) => {
          const pedido = pedidoById.get(f.pedido_id);
          if (!pedido?.created_at || !f.created_at) return;
          const mins = (new Date(f.created_at).getTime() - new Date(pedido.created_at).getTime()) / 60000;
          if (mins < 0 || mins >= 600) return;
          turnarounds.push(mins);

          const mesa = mesaById.get(pedido.mesa_id);
          const mesaKey = mesa ? `Mesa ${mesa.numero}` : 'Para llevar';
          const cur = mesaAgg.get(mesaKey) || { tickets: 0, sumMin: 0 };
          cur.tickets += 1; cur.sumMin += mins;
          mesaAgg.set(mesaKey, cur);

          const nPlatos = dishesByFactura.get(f.id) || 0;
          if (nPlatos > 0) {
            const t = timeByDishCount.get(nPlatos) || { sum: 0, n: 0 };
            t.sum += mins; t.n += 1;
            timeByDishCount.set(nPlatos, t);
          }
        });
        setAvgTurnaround(turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null);
        setMesaRotation(
          Array.from(mesaAgg.entries())
            .map(([mesa, v]) => ({ mesa, tickets: v.tickets, avgMin: v.sumMin / v.tickets }))
            .sort((a, b) => b.tickets - a.tickets)
        );
        setKitchenTimeByDishes(
          Array.from(timeByDishCount.entries())
            .map(([platos, v]) => ({ platos, avgMin: v.sum / v.n, muestras: v.n }))
            .sort((a, b) => a.platos - b.platos)
        );

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
    { id: 'platos', label: 'Platos', icon: <Utensils size={20} /> },
    { id: 'usuarios', label: 'Usuarios', icon: <UserPlus size={20} /> },
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
            {activeTab === 'staff' && <StaffModule statusFor={statusFor} activeEmployees={activeEmployees} avgRating={avgRating} avgTurnaround={avgTurnaround} salesByMesero={staffPerformance.filter(s => s.role === 'mesero' && s.metricValue > 0).map(s => ({ name: s.name, ventas: Math.round(s.metricValue) })).sort((a, b) => b.ventas - a.ventas)} mesaRotation={mesaRotation} kitchenTimeByDishes={kitchenTimeByDishes} />}
            {activeTab === 'costs' && <CostsModule statusFor={statusFor} costsData={costsData} />}
            {activeTab === 'reservas' && <ReservasModule statusFor={statusFor} reservations={reservations} />}
            {activeTab === 'platos' && <PlatosModule />}
            {activeTab === 'usuarios' && <UsuariosModule />}
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
            <CardDescription>Popularidad (veces pedido) e ingresos reales por plato. El margen se calcula al cargar el costo de cada plato.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={statusFor(menuEngineering.length > 0)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plato</TableHead>
                    <TableHead className="text-right">Popularidad</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuEngineering.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold text-neutral-900">{item.name}</TableCell>
                      <TableCell className="text-right">{item.timesOrdered} {item.timesOrdered === 1 ? 'vez' : 'veces'}</TableCell>
                      <TableCell className="text-right font-medium">{money(item.revenue)}</TableCell>
                      <TableCell className="text-right">{item.margin !== null ? `${item.margin}%` : <span className="text-neutral-400">—</span>}</TableCell>
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
                    <XAxis key="xaxis" type="number" dataKey="timesOrdered" name="Popularidad" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis key="yaxis" type="number" dataKey="margin" name="Margen" unit="%" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <ZAxis key="zaxis" type="number" dataKey="revenue" range={[60, 240]} />
                    <Tooltip key="tooltip" cursor={{ strokeDasharray: '3 3' }} formatter={(value: number, name: string) => [name === 'Margen' ? `${value}%` : name === 'Popularidad' ? `${value} veces` : money(Number(value)), name]} />
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
function StaffModule({ statusFor, activeEmployees, avgRating, avgTurnaround, salesByMesero, mesaRotation, kitchenTimeByDishes }: {
  statusFor: (b: boolean) => DataStatus;
  activeEmployees: number; avgRating: number | null; avgTurnaround: number | null;
  salesByMesero: { name: string; ventas: number }[];
  mesaRotation: MesaRotationRow[]; kitchenTimeByDishes: KitchenTimeRow[];
}) {
  const kitchenChart = kitchenTimeByDishes.map(k => ({
    platos: `${k.platos} ${k.platos === 1 ? 'plato' : 'platos'}`,
    minutos: Math.round(k.avgMin),
    muestras: k.muestras,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Rendimiento del Personal</h1>
          <p className="text-sm text-neutral-500">Ventas por mesero, rotación de mesas y tiempo de servicio según el tamaño del ticket.</p>
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
            <CardTitle>Ventas por Mesero</CardTitle>
            <CardDescription>Facturación generada por cada mesero.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataStateWrapper status={statusFor(salesByMesero.length > 0)}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByMesero} layout="vertical" margin={{ left: 20 }}>
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
            <CardTitle>Rotación por Mesa</CardTitle>
            <CardDescription>Tickets atendidos y tiempo promedio del pedido al pago por mesa.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={statusFor(mesaRotation.length > 0)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesa</TableHead>
                    <TableHead className="text-center">Tickets</TableHead>
                    <TableHead className="text-right">Tiempo prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mesaRotation.map(m => (
                    <TableRow key={m.mesa}>
                      <TableCell className="font-bold text-neutral-900">{m.mesa}</TableCell>
                      <TableCell className="text-center">{m.tickets}</TableCell>
                      <TableCell className="text-right text-neutral-600">{Math.round(m.avgMin)} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataStateWrapper>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tiempo en Cocina por Cantidad de Platos</CardTitle>
          <CardDescription>Minutos promedio del pedido al pago de un ticket según cuántos platos incluye.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataStateWrapper status={statusFor(kitchenChart.length > 0)}>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kitchenChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis key="xaxis" dataKey="platos" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis key="yaxis" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                  <Tooltip key="tooltip" cursor={{ fill: '#F3F4F6' }} formatter={(val: number, _n, item: any) => [`${val} min (${item?.payload?.muestras ?? 0} tickets)`, 'Tiempo promedio']} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                  <Bar key="bar" dataKey="minutos" name="Tiempo promedio" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataStateWrapper>
        </CardContent>
      </Card>
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

// --- USUARIOS ---
const ROLE_OPTIONS = [
  { value: 'waiter', label: 'Mesero' },
  { value: 'kitchen', label: 'Cocinero' },
  { value: 'cashier', label: 'Cajero' },
  { value: 'admin', label: 'Administrador' },
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', waiter: 'Mesero', kitchen: 'Cocinero', cashier: 'Cajero',
};

type UsuarioRow = { id: string; full_name: string | null; email: string | null; role: string; personal_email: string | null };

function UsuariosModule() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', companyEmail: '', personalEmail: '', role: 'waiter' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ inviteLink: string | null; companyEmail: string; personalEmail: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, personal_email')
      .order('full_name', { ascending: true });
    if (err) console.error('Error cargando usuarios:', err);
    setUsers((data as UsuarioRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);
    setSubmitting(true);

    const { data, error: fnError } = await supabase.functions.invoke('admin-create-employee', {
      body: { ...form, redirectTo: `${window.location.origin}/set-password` },
    });

    setSubmitting(false);

    if (fnError) {
      let msg = fnError.message;
      try {
        const ctx = await (fnError as any).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* ignore */ }
      setError(msg || 'No se pudo crear el usuario');
      return;
    }
    if (data?.error) { setError(data.error); return; }

    setResult({ inviteLink: data.inviteLink ?? null, companyEmail: data.companyEmail, personalEmail: data.personalEmail });
    setForm({ fullName: '', companyEmail: '', personalEmail: '', role: 'waiter' });
    void loadUsers();
  };

  const copyLink = async () => {
    if (!result?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(result.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDelete = async (u: UsuarioRow) => {
    if (!window.confirm(`¿Eliminar a ${u.full_name || u.email}? Perderá el acceso a la plataforma.`)) return;
    setDeletingId(u.id);
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke('admin-delete-employee', {
      body: { userId: u.id },
    });
    setDeletingId(null);
    if (fnError) {
      let msg = fnError.message;
      try {
        const ctx = await (fnError as any).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* ignore */ }
      setError(msg || 'No se pudo eliminar el usuario');
      return;
    }
    if (data?.error) { setError(data.error); return; }
    void loadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Usuarios</h1>
          <p className="text-sm text-neutral-500">
            Crea cuentas de empleado con su correo de empresa. Se genera una invitación para que
            el empleado establezca su contraseña; envíasela a su correo personal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de creación */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus size={18} /> Nuevo empleado</CardTitle>
            <CardDescription>El empleado iniciará sesión con el correo de empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Nombre completo</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ej. Ana Ramírez"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Correo de empresa (login)</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                  <input
                    required
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                    placeholder="ana@empresa.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Correo personal (recibe la invitación)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                  <input
                    type="email"
                    value={form.personalEmail}
                    onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
                    placeholder="ana.personal@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-lg font-bold text-sm transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {submitting ? 'Creando...' : 'Crear e invitar'}
              </button>
            </form>

            {result && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                  <CheckCircle2 size={16} /> Usuario creado
                </div>
                <p className="text-xs text-neutral-600">
                  Login: <span className="font-medium">{result.companyEmail}</span>
                  {result.personalEmail && <> · Invitación para: <span className="font-medium">{result.personalEmail}</span></>}
                </p>
                {result.inviteLink && (
                  <div>
                    <p className="text-xs text-neutral-600 mb-1 flex items-center gap-1"><Link2 size={12} /> Enlace de invitación (envíaselo al correo personal):</p>
                    <div className="flex gap-2">
                      <input readOnly value={result.inviteLink} className="flex-1 px-2 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-500 truncate" />
                      <button onClick={copyLink} type="button" className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium flex items-center gap-1 hover:bg-neutral-700">
                        <Copy size={13} /> {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de usuarios */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Empleados con cuenta</CardTitle>
            <CardDescription>Usuarios que pueden iniciar sesión en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataStateWrapper status={loading ? 'loading' : users.length > 0 ? 'success' : 'empty'} emptyMessage="Aún no hay usuarios con cuenta.">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo de empresa</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Correo personal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-bold text-neutral-900">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-neutral-600">{u.email || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{ROLE_LABEL[u.role] || u.role}</Badge></TableCell>
                      <TableCell className="text-neutral-500 text-sm">{u.personal_email || '—'}</TableCell>
                      <TableCell className="text-right">
                        {me?.id === u.id ? (
                          <span className="text-xs text-neutral-400">Tú</span>
                        ) : (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            title="Eliminar empleado"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-colors"
                          >
                            {deletingId === u.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        )}
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

function FinancialRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx("text-sm", bold ? "font-bold text-neutral-900" : "text-neutral-500")}>{label}</span>
      <span className={clsx(bold ? "font-bold text-neutral-900 text-lg" : "font-medium text-neutral-700")}>{value}</span>
    </div>
  );
}

// --- PLATOS (gestión del menú) ---
type PlatoRow = { id: string; nombre: string; descripcion: string | null; valor_actual: number; costo: number | null; categoria_id: string | null; foto_url: string | null; estado: string | null };
type CategoriaRow = { id: string; nombre: string };

const emptyPlatoForm = { nombre: '', descripcion: '', valor_actual: '', costo: '', categoria: '', foto_url: '', estado: 'active' };
const isAgotado = (estado: string | null) => estado === 'inactive';

function PlatosModule() {
  const [platos, setPlatos] = useState<PlatoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyPlatoForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const catById = useMemo(() => new Map(categorias.map(c => [c.id, c.nombre])), [categorias]);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('plato').select('id, nombre, descripcion, valor_actual, costo, categoria_id, foto_url, estado').order('nombre', { ascending: true }),
      supabase.from('categoria').select('id, nombre').order('nombre', { ascending: true }),
    ]);
    setPlatos((p as PlatoRow[]) ?? []);
    setCategorias((c as CategoriaRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditingId(null); setForm({ ...emptyPlatoForm }); setError(''); setModalOpen(true); };
  const openEdit = (p: PlatoRow) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre ?? '',
      descripcion: p.descripcion ?? '',
      valor_actual: p.valor_actual != null ? String(p.valor_actual) : '',
      costo: p.costo != null ? String(p.costo) : '',
      categoria: p.categoria_id ? (catById.get(p.categoria_id) ?? '') : '',
      foto_url: p.foto_url ?? '',
      estado: isAgotado(p.estado) ? 'inactive' : 'active',
    });
    setError('');
    setModalOpen(true);
  };

  const resolveCategoriaId = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = categorias.find(c => c.nombre.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data, error: err } = await supabase.from('categoria').insert({ nombre: trimmed }).select('id, nombre').single();
    if (err) throw err;
    setCategorias(prev => [...prev, data as CategoriaRow]);
    return (data as CategoriaRow).id;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const precio = parseFloat(form.valor_actual);
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!Number.isFinite(precio) || precio <= 0) { setError('El precio debe ser mayor a 0.'); return; }
    const costo = form.costo.trim() === '' ? null : parseFloat(form.costo);
    if (costo !== null && (!Number.isFinite(costo) || costo < 0)) { setError('El costo no es válido.'); return; }

    setSaving(true);
    try {
      const categoria_id = await resolveCategoriaId(form.categoria);
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        valor_actual: precio,
        costo,
        categoria_id,
        foto_url: form.foto_url.trim() || null,
        estado: form.estado,
      };
      const { error: err } = editingId
        ? await supabase.from('plato').update(payload).eq('id', editingId)
        : await supabase.from('plato').insert(payload);
      if (err) throw err;
      setModalOpen(false);
      void load();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el plato.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PlatoRow) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    setDeletingId(p.id);
    const { error: err } = await supabase.from('plato').delete().eq('id', p.id);
    if (err) {
      if (err.code === '23503') {
        await supabase.from('plato').update({ estado: 'inactive' }).eq('id', p.id);
        window.alert(`"${p.nombre}" tiene ventas registradas, no se puede borrar del historial. Se marcó como "Agotado".`);
      } else {
        window.alert('No se pudo eliminar: ' + err.message);
      }
    }
    setDeletingId(null);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Platos</h1>
          <p className="text-sm text-neutral-500">Agrega, edita o elimina platos del menú (nombre, imagen, precio, categoría y costo).</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm transition-colors"
        >
          <Plus size={18} /> Nuevo plato
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataStateWrapper status={loading ? 'loading' : platos.length > 0 ? 'success' : 'empty'} emptyMessage="Aún no hay platos. Crea el primero.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plato</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nombre} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-400"><ImageIcon size={18} /></div>
                        )}
                        <span className="font-bold text-neutral-900">{p.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600">{p.categoria_id ? (catById.get(p.categoria_id) ?? '—') : <span className="text-neutral-400">Sin categoría</span>}</TableCell>
                    <TableCell className="text-right font-medium">{money(Number(p.valor_actual || 0))}</TableCell>
                    <TableCell className="text-right text-neutral-500">{p.costo != null ? money(Number(p.costo)) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={isAgotado(p.estado) ? 'destructive' : 'success'}>{isAgotado(p.estado) ? 'Agotado' : 'Disponible'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} title="Editar" className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} title="Eliminar" className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                          {deletingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataStateWrapper>
        </CardContent>
      </Card>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
                <h2 className="text-lg font-bold text-neutral-900">{editingId ? 'Editar plato' : 'Nuevo plato'}</h2>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="flex gap-4">
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-neutral-200 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 flex-shrink-0"><ImageIcon size={22} /></div>
                  )}
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">URL de la imagen</label>
                    <input value={form.foto_url} onChange={e => setForm({ ...form, foto_url: e.target.value })} placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Nombre</label>
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Lomo saltado"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} placeholder="Breve descripción..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Precio</label>
                    <input required type="number" min="0" step="0.01" value={form.valor_actual} onChange={e => setForm({ ...form, valor_actual: e.target.value })} placeholder="0.00"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Costo <span className="text-neutral-400 normal-case">(opcional, para margen)</span></label>
                    <input type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} placeholder="0.00"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Categoría</label>
                    <input list="cat-datalist" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Escribe o elige..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    <datalist id="cat-datalist">
                      {categorias.map(c => <option key={c.id} value={c.nombre} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Disponibilidad</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                      <option value="active">Disponible</option>
                      <option value="inactive">Agotado</option>
                    </select>
                  </div>
                </div>

                {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-neutral-300 rounded-lg font-medium text-sm hover:bg-neutral-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white rounded-lg font-bold text-sm transition-colors">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear plato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
