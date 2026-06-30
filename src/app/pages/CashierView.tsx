import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Receipt, TrendingUp, Clock, CheckCircle2, X, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useRestaurant, Order } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';

type PaymentMethod = 'cash' | 'card' | 'transfer';

interface TodayStats {
  totalSales: number;
  completedOrders: number;
  totalOrders: number;
}

interface ExpandedUnit {
  unitId: string;
  dishId: string;
  notes?: string;
}

interface SplitPartResult {
  paymentMethod: PaymentMethod;
  items: Array<{ dishId: string; quantity: number; notes?: string }>;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const PART_COLORS = ['blue', 'orange', 'green', 'purple'] as const;
type PartColor = typeof PART_COLORS[number];

const PART_BADGE: Record<PartColor, string> = {
  blue:   'bg-blue-100 text-blue-800 border-blue-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  green:  'bg-green-100 text-green-800 border-green-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
};

const PART_HEADER: Record<PartColor, string> = {
  blue:   'bg-blue-600',
  orange: 'bg-orange-600',
  green:  'bg-green-600',
  purple: 'bg-purple-600',
};

const PART_BTN_ACTIVE: Record<PartColor, string> = {
  blue:   'bg-blue-600 text-white border-blue-600',
  orange: 'bg-orange-600 text-white border-orange-600',
  green:  'bg-green-600 text-white border-green-600',
  purple: 'bg-purple-600 text-white border-purple-600',
};

// ─── Payment method selector (reused in both modals) ─────────────────────────

function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const options: { method: PaymentMethod; icon: React.ReactNode }[] = [
    { method: 'cash',     icon: <DollarSign size={16} /> },
    { method: 'card',     icon: <CreditCard size={16} /> },
    { method: 'transfer', icon: <Receipt    size={16} /> },
  ];
  return (
    <div className="flex gap-1.5">
      {options.map(({ method, icon }) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className={clsx(
            'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 text-xs font-medium transition-all',
            value === method
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
          )}
        >
          {icon}
          {PAYMENT_LABELS[method]}
        </button>
      ))}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function CashierView() {
  const { orders, tables, dishes, processPayment, updateTableStatus } = useRestaurant();
  const { profile } = useAuth();

  const [todayStats, setTodayStats]         = useState<TodayStats>({ totalSales: 0, completedOrders: 0, totalOrders: 0 });
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [splitModalOrder,   setSplitModalOrder]   = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const fetchTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: pedidosHoy, count: totalOrders } = await supabase
      .from('pedido')
      .select('id', { count: 'exact' })
      .eq('fecha', today);

    const pedidoIds = (pedidosHoy || []).map((p: any) => p.id);

    if (pedidoIds.length === 0) {
      setTodayStats({ totalSales: 0, completedOrders: 0, totalOrders: 0 });
      return;
    }

    const { data: facturas, error } = await supabase
      .from('factura')
      .select('total')
      .eq('estado', 'pagada')
      .in('pedido_id', pedidoIds);

    if (error) console.error('Error fetching today stats:', error);

    const list = facturas || [];
    setTodayStats({
      totalSales:       list.reduce((acc, f) => acc + Number(f.total), 0),
      completedOrders:  list.length,
      totalOrders:      totalOrders ?? 0,
    });
  };

  useEffect(() => { void fetchTodayStats(); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pendingPaymentOrders = orders.filter(o => o.status === 'ready');

  const getTableNumber = (tableId: string) =>
    tables.find(t => t.id === tableId)?.number ?? 'N/A';

  const getDishName = (dishId: string) =>
    dishes.find(d => d.id === dishId)?.name ?? 'Desconocido';

  // ── Single payment ─────────────────────────────────────────────────────────

  const handleProcessPayment = async (orderId: string, method: PaymentMethod) => {
    if (!profile) { alert('No se encontró el perfil del cajero'); return; }
    try {
      setProcessingOrderId(orderId);
      await processPayment(orderId, profile.id, method, 0);
      await fetchTodayStats();
      setPaymentModalOrder(null);
    } catch (error) {
      alert('No se pudo procesar el pago: ' + ((error as any)?.message ?? String(error)));
    } finally {
      setProcessingOrderId(null);
    }
  };

  // ── Split payment ──────────────────────────────────────────────────────────

  const handleSplitPayment = async (orderId: string, parts: SplitPartResult[]) => {
    if (!profile) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const now       = new Date();
    const orderTime = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    const horaCreacion        = orderTime.toTimeString().slice(0, 8);
    const horaPago            = now.toTimeString().slice(0, 8);
    const tiempoEsperaMinutos = Math.max(0, Math.round((now.getTime() - orderTime.getTime()) / 60000));

    const rollback = {
      facturaIds:    [] as string[],
      ventaPlatoIds: [] as string[],
      vmpIds:        [] as string[],
      vhIds:         [] as string[],
    };

    try {
      for (const part of parts.filter(p => p.items.length > 0)) {
        const partTotal = part.items.reduce((acc, item) => {
          const price = Number(dishes.find(d => d.id === item.dishId)?.price ?? 0);
          return acc + price * item.quantity;
        }, 0);

        const facturaId = crypto.randomUUID();
        const { error: fErr } = await supabase.from('factura').insert([{
          id: facturaId, pedido_id: orderId, cajero_id: profile.id,
          metodo_pago: part.paymentMethod, estado: 'pagada',
          total: Number(partTotal.toFixed(2)), propina: 0,
        }]);
        if (fErr) throw fErr;
        rollback.facturaIds.push(facturaId);

        const vpRows = part.items.map(item => {
          const price = Number(dishes.find(d => d.id === item.dishId)?.price ?? 0);
          const id = crypto.randomUUID();
          return { id, factura_id: facturaId, plato_id: item.dishId,
            cantidad: item.quantity, precio_unitario: price,
            subtotal: Number((price * item.quantity).toFixed(2)) };
        });
        if (vpRows.length > 0) {
          const { error: vpErr } = await supabase.from('venta_plato').insert(vpRows);
          if (vpErr) throw vpErr;
          rollback.ventaPlatoIds.push(...vpRows.map(r => r.id));
        }

        const vmpId = crypto.randomUUID();
        const { error: vmpErr } = await supabase.from('venta_metodo_pago').insert([{
          id: vmpId, factura_id: facturaId, metodo_pago: part.paymentMethod,
          monto: Number(partTotal.toFixed(2)), propina: 0,
          total: Number(partTotal.toFixed(2)), cajero_id: profile.id,
        }]);
        if (vmpErr) throw vmpErr;
        rollback.vmpIds.push(vmpId);

        const vhId = crypto.randomUUID();
        const { error: vhErr } = await supabase.from('venta_horario').insert([{
          id: vhId, factura_id: facturaId, hora_creacion: horaCreacion,
          hora_pago: horaPago, tiempo_espera_minutos: tiempoEsperaMinutos,
          total: Number(partTotal.toFixed(2)),
        }]);
        if (vhErr) throw vhErr;
        rollback.vhIds.push(vhId);
      }

      await supabase.from('pedido').update({ estado_preparacion: 'entregado' }).eq('id', orderId);
      if (order.mesaId && order.mesaId !== 'takeaway') {
        updateTableStatus(order.mesaId, 'limpiando');
      }

      await fetchTodayStats();
      setSplitModalOrder(null);
    } catch (error) {
      for (const id of rollback.vhIds)         await supabase.from('venta_horario').delete().eq('id', id);
      for (const id of rollback.vmpIds)         await supabase.from('venta_metodo_pago').delete().eq('id', id);
      for (const id of rollback.ventaPlatoIds)  await supabase.from('venta_plato').delete().eq('id', id);
      for (const id of rollback.facturaIds)     await supabase.from('factura').delete().eq('id', id);
      alert('Error al separar la cuenta: ' + ((error as any)?.message ?? String(error)));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Caja</h1>
          <p className="text-neutral-600">Gestión de pagos y cierre de cuentas</p>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* ── Left: stats ── */}
          <div className="col-span-1 space-y-6 overflow-y-auto">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={24} />
                <span className="text-sm font-medium opacity-90">Total Ventas Hoy</span>
              </div>
              <p className="text-4xl font-bold">S/ {todayStats.totalSales.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-blue-600" size={24} />
                <span className="font-semibold text-neutral-900">Estadísticas del Día</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Completadas</span>
                  <span className="font-bold text-neutral-900">{todayStats.completedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Totales</span>
                  <span className="font-bold text-neutral-900">{todayStats.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Ticket Promedio</span>
                  <span className="font-bold text-neutral-900">
                    S/ {todayStats.completedOrders > 0
                      ? (todayStats.totalSales / todayStats.completedOrders).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: orders ── */}
          <div className="col-span-2 bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Cuentas por Cobrar</h2>
              <p className="text-sm text-neutral-600 mt-1">{pendingPaymentOrders.length} órdenes pendientes</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pendingPaymentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <CheckCircle2 className="text-green-500 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No hay cuentas pendientes</h3>
                  <p className="text-neutral-600">Todas las órdenes han sido pagadas</p>
                </div>
              ) : (
                pendingPaymentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-neutral-50 rounded-lg p-5 border-2 border-neutral-200 hover:border-neutral-300 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-neutral-900">
                            Mesa {getTableNumber(order.tableId)}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            Lista
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Clock size={14} />
                          <span>
                            {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-neutral-900">S/ {order.total.toFixed(2)}</p>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-neutral-700">
                            {item.quantity}x {getDishName(item.dishId)}
                          </span>
                          <span className="font-medium text-neutral-900">
                            S/ {((dishes.find(d => d.id === item.dishId)?.price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setSplitModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-neutral-300 text-neutral-700 rounded-lg font-medium hover:border-neutral-800 hover:text-neutral-900 transition-colors"
                      >
                        <Scissors size={16} />
                        Separar Cuenta
                      </button>
                      <button
                        onClick={() => setPaymentModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-700 transition-colors"
                      >
                        <CreditCard size={16} />
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment modal ── */}
      <AnimatePresence>
        {paymentModalOrder && (
          <PaymentModal
            order={paymentModalOrder}
            dishes={dishes}
            tables={tables}
            processing={processingOrderId === paymentModalOrder.id}
            onClose={() => setPaymentModalOrder(null)}
            onConfirm={(method) => void handleProcessPayment(paymentModalOrder.id, method)}
          />
        )}
      </AnimatePresence>

      {/* ── Split bill modal ── */}
      <AnimatePresence>
        {splitModalOrder && (
          <SplitBillModal
            order={splitModalOrder}
            dishes={dishes}
            tables={tables}
            onClose={() => setSplitModalOrder(null)}
            onConfirm={(parts) => void handleSplitPayment(splitModalOrder.id, parts)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

function PaymentModal({
  order, dishes, tables, processing, onClose, onConfirm,
}: {
  order: Order;
  dishes: any[];
  tables: any[];
  processing: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const tableNum = tables.find(t => t.id === order.tableId)?.number ?? 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10"
      >
        <div className="p-6 border-b border-neutral-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Cobrar Mesa {tableNum}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">Pedido #{order.id.substring(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Items summary */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            {order.items.map((item, idx) => {
              const dish = dishes.find(d => d.id === item.dishId);
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{item.quantity}x {dish?.name ?? 'Desconocido'}</span>
                  <span className="font-medium text-neutral-900">
                    S/ {((dish?.price ?? 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-neutral-200 pt-2 mt-2 flex justify-between font-bold text-base text-neutral-900">
              <span>Total</span>
              <span>S/ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
              Método de Pago
            </p>
            <PaymentMethodSelector value={method} onChange={setMethod} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(method)}
              disabled={processing}
              className="flex-1 py-3 bg-neutral-900 text-white rounded-lg font-bold hover:bg-neutral-700 disabled:bg-neutral-400 transition-colors"
            >
              {processing ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SplitBillModal ───────────────────────────────────────────────────────────

function SplitBillModal({
  order, dishes, tables, onClose, onConfirm,
}: {
  order: Order;
  dishes: any[];
  tables: any[];
  onClose: () => void;
  onConfirm: (parts: SplitPartResult[]) => void;
}) {
  const [numParts,    setNumParts]    = useState(2);
  const [partMethods, setPartMethods] = useState<PaymentMethod[]>(['cash', 'cash', 'cash', 'cash']);

  const tableNum = tables.find(t => t.id === order.tableId)?.number ?? 'N/A';

  // Expand items into individual units (qty 3 → 3 separate units)
  const expandedUnits: ExpandedUnit[] = order.items.flatMap(item =>
    Array.from({ length: item.quantity }, (_, i) => ({
      unitId: `${item.dishId}::${i}`,
      dishId: item.dishId,
      notes:  item.notes,
    }))
  );

  // unitId → part index (0-based) | null = unassigned
  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    Object.fromEntries(expandedUnits.map(u => [u.unitId, null]))
  );

  // When numParts shrinks, unassign items that were in removed parts
  useEffect(() => {
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(uid => {
        if (next[uid] !== null && (next[uid] as number) >= numParts) next[uid] = null;
      });
      return next;
    });
  }, [numParts]);

  const assign = (unitId: string, partIdx: number) => {
    setAssignments(prev => ({
      ...prev,
      [unitId]: prev[unitId] === partIdx ? null : partIdx,
    }));
  };

  const getPartUnits  = (i: number) => expandedUnits.filter(u => assignments[u.unitId] === i);
  const getPartTotal  = (i: number) =>
    getPartUnits(i).reduce((acc, u) => acc + Number(dishes.find(d => d.id === u.dishId)?.price ?? 0), 0);

  const allAssigned = expandedUnits.every(u => assignments[u.unitId] !== null);

  const handleConfirm = () => {
    const parts: SplitPartResult[] = Array.from({ length: numParts }, (_, i) => {
      const units = getPartUnits(i);
      const grouped = new Map<string, { dishId: string; quantity: number; notes?: string }>();
      units.forEach(u => {
        const key = `${u.dishId}|${u.notes ?? ''}`;
        const ex  = grouped.get(key);
        if (ex) ex.quantity++;
        else grouped.set(key, { dishId: u.dishId, quantity: 1, notes: u.notes });
      });
      return { paymentMethod: partMethods[i], items: Array.from(grouped.values()) };
    });
    onConfirm(parts);
  };

  const setPartMethod = (i: number, m: PaymentMethod) =>
    setPartMethods(prev => { const next = [...prev]; next[i] = m; return next; });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col z-10"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Scissors size={20} /> Separar Cuenta — Mesa {tableNum}
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Total: S/ {order.total.toFixed(2)} · {expandedUnits.length} item(s)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Num-parts selector */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-4 flex-shrink-0 bg-neutral-50">
          <span className="text-sm font-semibold text-neutral-700">¿En cuántas partes?</span>
          <div className="flex gap-2">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setNumParts(n)}
                className={clsx(
                  'w-9 h-9 rounded-lg font-bold text-sm transition-all',
                  numParts === n
                    ? 'bg-neutral-900 text-white shadow'
                    : 'bg-white border border-neutral-300 text-neutral-600 hover:border-neutral-700'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-neutral-400 ml-2">
            Haz clic en los botones de parte para asignar cada item
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Items list */}
          <div className="w-60 border-r border-neutral-200 flex flex-col flex-shrink-0">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Items del pedido</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {expandedUnits.map(unit => {
                const dish    = dishes.find(d => d.id === unit.dishId);
                const assigned = assignments[unit.unitId];
                const color   = assigned !== null ? PART_COLORS[assigned] : null;
                return (
                  <div
                    key={unit.unitId}
                    className={clsx(
                      'rounded-xl border p-3 transition-all',
                      color ? PART_BADGE[color] : 'bg-white border-neutral-200'
                    )}
                  >
                    <p className="text-sm font-semibold text-neutral-900 truncate mb-1">{dish?.name}</p>
                    <p className="text-xs text-neutral-500 mb-2">S/ {Number(dish?.price ?? 0).toFixed(2)}</p>
                    {unit.notes && (
                      <p className="text-xs italic text-amber-700 mb-2 truncate">"{unit.notes}"</p>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: numParts }, (_, i) => {
                        const c = PART_COLORS[i];
                        const isActive = assigned === i;
                        return (
                          <button
                            key={i}
                            onClick={() => assign(unit.unitId, i)}
                            className={clsx(
                              'px-2 py-0.5 rounded text-xs font-bold border transition-all',
                              isActive ? PART_BTN_ACTIVE[c] : 'bg-white text-neutral-500 border-neutral-300 hover:border-neutral-600'
                            )}
                          >
                            P{i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Part columns */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex h-full" style={{ minWidth: `${numParts * 220}px` }}>
              {Array.from({ length: numParts }, (_, i) => {
                const color     = PART_COLORS[i];
                const partUnits = getPartUnits(i);
                const partTotal = getPartTotal(i);
                return (
                  <div key={i} className="flex-1 border-r border-neutral-200 last:border-r-0 flex flex-col">
                    {/* Part header */}
                    <div className={clsx('p-4 text-white flex-shrink-0', PART_HEADER[color])}>
                      <h3 className="font-bold text-base">Parte {i + 1}</h3>
                      <p className="text-sm opacity-80">{partUnits.length} item(s)</p>
                    </div>

                    {/* Part items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-neutral-50">
                      {partUnits.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic text-center py-6">Sin items asignados</p>
                      ) : (
                        partUnits.map(unit => {
                          const dish = dishes.find(d => d.id === unit.dishId);
                          return (
                            <div key={unit.unitId} className="bg-white rounded-lg p-2.5 border border-neutral-200 flex justify-between items-center text-sm">
                              <span className="font-medium text-neutral-900 truncate">{dish?.name}</span>
                              <span className="text-neutral-500 ml-2 flex-shrink-0">
                                S/ {Number(dish?.price ?? 0).toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Part footer: subtotal + method */}
                    <div className="p-3 border-t border-neutral-200 bg-white flex-shrink-0 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-500">Subtotal</span>
                        <span className="font-bold text-neutral-900">S/ {partTotal.toFixed(2)}</span>
                      </div>
                      <PaymentMethodSelector
                        value={partMethods[i]}
                        onChange={(m) => setPartMethod(i, m)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 flex items-center justify-between flex-shrink-0">
          <span className={clsx('text-sm font-medium', allAssigned ? 'text-green-600' : 'text-amber-600')}>
            {allAssigned ? '✓ Todos los items asignados' : 'Faltan items por asignar'}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allAssigned}
              className="px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-bold hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <CreditCard size={18} />
              Confirmar y Cobrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
